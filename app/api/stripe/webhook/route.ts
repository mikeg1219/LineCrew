import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import { NextResponse } from "next/server";
import type Stripe from "stripe";

export const runtime = "nodejs";

/** Vercel serverless timeout (Stripe webhook can wait on DB). */
export const maxDuration = 60;

function readMeta(
  ...sources: Array<Record<string, string | null | undefined> | null | undefined>
) {
  const out: Record<string, string> = {};
  for (const src of sources) {
    if (!src) continue;
    for (const [k, v] of Object.entries(src)) {
      if (typeof v === "string" && v.trim() !== "" && !out[k]) {
        out[k] = v;
      }
    }
  }
  return out;
}

/** Dev-only: event type/id and non-sensitive metadata keys — never log secrets or full payloads. */
function devLogStripeEvent(event: Stripe.Event): void {
  if (process.env.NODE_ENV !== "development") return;

  const base = { type: event.type, id: event.id };
  if (
    event.type === "payment_intent.succeeded" ||
    event.type === "payment_intent.payment_failed"
  ) {
    const o = event.data.object as Stripe.PaymentIntent;
    console.log("[stripe/webhook]", {
      ...base,
      payment_intent: o.id,
      metadata_keys: Object.keys(o.metadata ?? {}),
      customer_id: o.metadata?.customer_id ?? null,
    });
    return;
  }
  if (event.type === "account.updated") {
    const a = event.data.object as Stripe.Account;
    console.log("[stripe/webhook]", {
      ...base,
      stripe_account: a.id,
      supabase_user_id: a.metadata?.supabase_user_id ?? null,
    });
    return;
  }
  console.log("[stripe/webhook]", base);
}

export async function POST(req: Request) {
  const rawBody = await req.text();
  const sig = req.headers.get("stripe-signature");
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!whSecret) {
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET is not configured" },
      { status: 500 }
    );
  }
  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, sig, whSecret);
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.error("[stripe/webhook] constructEvent failed", err);
    }
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  devLogStripeEvent(event);

  const admin = createAdminClient();
  const stripe = getStripe();

  try {
    switch (event.type) {
      case "payment_intent.succeeded":
        await handlePaymentIntentSucceeded(
          admin,
          event.data.object as Stripe.PaymentIntent
        );
        break;
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(
          admin,
          stripe,
          event.data.object as Stripe.Checkout.Session
        );
        break;
      case "payment_intent.payment_failed":
        handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;
      case "account.updated":
        await handleAccountUpdated(admin, event.data.object as Stripe.Account);
        break;
      default:
        if (process.env.NODE_ENV === "development") {
          console.log("[stripe/webhook] unhandled event type (acknowledged)", {
            type: event.type,
            id: event.id,
          });
        }
        break;
    }
  } catch (e) {
    console.error("Stripe webhook handler error:", e);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

/**
 * Jobs are only inserted on payment_intent.succeeded. Failed intents never create
 * a job row; log for ops/debug (no customer PII in production logs beyond ids).
 */
function handlePaymentIntentFailed(pi: Stripe.PaymentIntent) {
  const md = pi.metadata;
  console.warn("[stripe] payment_intent.payment_failed", {
    id: pi.id,
    customer_id: md.customer_id ?? null,
    last_payment_error: pi.last_payment_error?.message ?? null,
  });
}

async function handlePaymentIntentSucceeded(
  admin: ReturnType<typeof createAdminClient>,
  pi: Stripe.PaymentIntent,
  metadataOverride?: Record<string, string | null | undefined> | null
) {
  if (pi.status !== "succeeded") return;

  const md = readMeta(pi.metadata, metadataOverride);
  const customerId = md.customer_id;
  if (!customerId) {
    console.warn("payment_intent.succeeded: missing customer_id", pi.id);
    return;
  }

  const { data: existing } = await admin
    .from("jobs")
    .select("id")
    .eq("stripe_payment_intent_id", pi.id)
    .maybeSingle();
  if (existing) return;

  const offered = parseFloat(md.offered_price ?? "");
  if (Number.isNaN(offered) || offered < 10) {
    console.error("payment_intent.succeeded: invalid offered_price", pi.id);
    return;
  }

  const amountCents = pi.amount_received ?? pi.amount;
  const expectedCents = Math.round(offered * 100);
  if (amountCents !== expectedCents) {
    console.error(
      "payment_intent.succeeded: amount mismatch",
      pi.id,
      amountCents,
      expectedCents
    );
    return;
  }

  const airport = md.airport?.trim();
  const terminal = md.terminal?.trim();
  const lineType = md.line_type?.trim();
  const estimatedWait = md.estimated_wait?.trim();
  if (!airport || !terminal || !lineType || !estimatedWait) {
    console.error("payment_intent.succeeded: missing job fields", pi.id);
    return;
  }

  const overageRate = parseFloat(md.overage_rate ?? "10");
  if (Number.isNaN(overageRate) || overageRate < 5) {
    console.error("payment_intent.succeeded: invalid overage_rate", pi.id);
    return;
  }

  const { error } = await admin.from("jobs").insert({
    customer_id: customerId,
    customer_email: md.customer_email || null,
    airport,
    terminal,
    line_type: lineType,
    description: md.description ?? "",
    offered_price: offered,
    overage_rate: overageRate,
    overage_agreed: md.overage_agreed === "true",
    estimated_wait: estimatedWait,
    status: "open",
    stripe_payment_intent_id: pi.id,
  });

  if (error) {
    if (error.code === "23505") return;
    throw error;
  }
}

async function handleCheckoutSessionCompleted(
  admin: ReturnType<typeof createAdminClient>,
  stripe: Stripe,
  session: Stripe.Checkout.Session
) {
  const piRef = session.payment_intent;
  const piId = typeof piRef === "string" ? piRef : piRef?.id ?? null;
  if (!piId) {
    console.warn("checkout.session.completed: missing payment_intent", session.id);
    return;
  }
  const pi = await stripe.paymentIntents.retrieve(piId);
  await handlePaymentIntentSucceeded(admin, pi, session.metadata);
}

async function handleAccountUpdated(
  admin: ReturnType<typeof createAdminClient>,
  account: Stripe.Account
) {
  const userId = account.metadata?.supabase_user_id;
  if (userId && account.id) {
    await admin
      .from("profiles")
      .update({ stripe_account_id: account.id })
      .eq("id", userId);
  } else if (process.env.NODE_ENV === "development") {
    console.warn("[stripe/webhook] account.updated: missing supabase_user_id or id", {
      account_id: account.id,
    });
  }
}
