#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

function loadDotEnvLocal() {
  const p = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(p)) return {};
  const out = {};
  for (const raw of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i <= 0) continue;
    out[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return out;
}

function env(name, fallback) {
  const v = process.env[name] ?? fallback[name];
  return typeof v === "string" ? v.trim() : "";
}

async function stripeGet(secret, route) {
  const res = await fetch(`https://api.stripe.com/v1/${route}`, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(`Stripe ${route} failed: ${res.status} ${JSON.stringify(body)}`);
  }
  return body;
}

async function supaGet(url, serviceRole, table, query) {
  const res = await fetch(`${url}/rest/v1/${table}?${query}`, {
    headers: {
      apikey: serviceRole,
      Authorization: `Bearer ${serviceRole}`,
    },
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(`Supabase ${table} failed: ${res.status} ${JSON.stringify(body)}`);
  }
  return body;
}

async function main() {
  const fileEnv = loadDotEnvLocal();
  const STRIPE_SECRET_KEY = env("STRIPE_SECRET_KEY", fileEnv);
  const SUPABASE_SERVICE_ROLE_KEY = env("SUPABASE_SERVICE_ROLE_KEY", fileEnv);
  const NEXT_PUBLIC_SUPABASE_URL = env("NEXT_PUBLIC_SUPABASE_URL", fileEnv).replace(/\/$/, "");
  const NEXT_PUBLIC_APP_URL = env("NEXT_PUBLIC_APP_URL", fileEnv).replace(/\/$/, "");
  const BOOKING_VERIFY_WEBHOOK_URL = env("BOOKING_VERIFY_WEBHOOK_URL", fileEnv).replace(
    /\/$/,
    ""
  );

  const required = {
    STRIPE_SECRET_KEY,
    SUPABASE_SERVICE_ROLE_KEY,
    NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_APP_URL,
  };
  const missing = Object.entries(required)
    .filter(([, v]) => !v)
    .map(([k]) => k);

  if (missing.length) {
    console.error(`Missing required env vars: ${missing.join(", ")}`);
    process.exit(1);
  }

  const report = [];
  const requiredEvents = new Set([
    "payment_intent.succeeded",
    "checkout.session.completed",
    "payment_intent.payment_failed",
    "account.updated",
  ]);

  // 1) Stripe auth/account check.
  const acct = await stripeGet(STRIPE_SECRET_KEY, "account");
  report.push(`Stripe account OK: ${acct.id}`);

  // 2) Webhook endpoint check.
  const endpoints = await stripeGet(STRIPE_SECRET_KEY, "webhook_endpoints?limit=100");
  const preferredUrl = BOOKING_VERIFY_WEBHOOK_URL
    ? BOOKING_VERIFY_WEBHOOK_URL
    : `${NEXT_PUBLIC_APP_URL}/api/stripe/webhook`;
  let match = (endpoints.data ?? []).find((e) => e.url === preferredUrl);
  if (!match && NEXT_PUBLIC_APP_URL.includes("localhost")) {
    match = (endpoints.data ?? []).find((e) =>
      String(e.url ?? "").endsWith("/api/stripe/webhook")
    );
  }
  if (!match) {
    throw new Error(
      `Webhook endpoint missing in Stripe: ${preferredUrl} (set BOOKING_VERIFY_WEBHOOK_URL for production checks)`
    );
  }
  const enabled = new Set(match.enabled_events ?? []);
  const missingEvents = [...requiredEvents].filter((e) => !enabled.has(e));
  if (missingEvents.length) {
    throw new Error(
      `Webhook endpoint ${targetUrl} missing events: ${missingEvents.join(", ")}`
    );
  }
  report.push(`Webhook endpoint OK: ${match.url}`);

  // 3) Supabase service role basic read check.
  await supaGet(
    NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    "jobs",
    "select=id,stripe_payment_intent_id,created_at&order=created_at.desc&limit=200"
  );
  report.push("Supabase service role read OK: jobs");

  // 4) Booking pipeline reconciliation for recent Stripe payments.
  const now = Math.floor(Date.now() / 1000);
  const sixHoursAgo = now - 6 * 60 * 60;
  const pis = await stripeGet(STRIPE_SECRET_KEY, "payment_intents?limit=100");
  const recentSucceeded = (pis.data ?? []).filter(
    (pi) => pi.status === "succeeded" && pi.created >= sixHoursAgo && pi.metadata?.customer_id
  );

  const jobs = await supaGet(
    NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    "jobs",
    "select=id,stripe_payment_intent_id,created_at&order=created_at.desc&limit=500"
  );
  const piSet = new Set(
    (jobs ?? []).map((j) => j.stripe_payment_intent_id).filter(Boolean)
  );
  const missingPi = recentSucceeded.filter((pi) => !piSet.has(pi.id));

  report.push(`Recent succeeded Stripe payments (6h): ${recentSucceeded.length}`);
  report.push(`Missing jobs for recent payments: ${missingPi.length}`);
  if (missingPi.length > 0) {
    console.error("Booking pipeline reconciliation FAILED.");
    for (const pi of missingPi.slice(0, 10)) {
      console.error(
        `- ${pi.id} created=${new Date(pi.created * 1000).toISOString()} customer_id=${pi.metadata?.customer_id ?? "n/a"}`
      );
    }
    process.exit(2);
  }

  console.log("Booking pipeline verification PASSED.");
  for (const line of report) console.log(`- ${line}`);
}

main().catch((err) => {
  console.error(`Booking pipeline verification FAILED: ${err.message}`);
  process.exit(1);
});

