#!/usr/bin/env node
/**
 * Checks that payment/webhook-related env vars are present.
 * Does not validate Supabase migrations — see docs/PAYMENT_PREREQUISITES.md
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function loadDotEnvLocal() {
  const p = resolve(root, ".env.local");
  if (!existsSync(p)) return;
  const raw = readFileSync(p, "utf8");
  for (const line of raw.split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2].trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined && val !== "") process.env[key] = val;
  }
}

loadDotEnvLocal();

const required = [
  ["STRIPE_SECRET_KEY", "Stripe API (Checkout, refunds, Charge retrieve)"],
  ["STRIPE_WEBHOOK_SECRET", "Verify POST /api/stripe/webhook"],
  ["NEXT_PUBLIC_SUPABASE_URL", "Supabase project URL"],
  ["SUPABASE_SERVICE_ROLE_KEY", "Webhook + service inserts (jobs, processed_stripe_events)"],
];

let failed = false;
console.log("LineCrew payment prerequisites (env)\n");

for (const [name, hint] of required) {
  const ok = Boolean(process.env[name]?.trim());
  const label = ok ? "ok  " : "MISS";
  console.log(`  [${label}] ${name}`);
  if (!ok) {
    console.log(`         ${hint}`);
    failed = true;
  }
}

console.log("\nSQL migrations (manual): see docs/PAYMENT_PREREQUISITES.md");
console.log(
  "Stripe Dashboard: add webhook events including charge.refunded and charge.dispute.created\n"
);

process.exit(failed ? 1 : 0);
