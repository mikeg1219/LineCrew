import { notifyJobCreated } from "@/lib/emails";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import {
  markStripeWebhookEventProcessed,
  releaseStripeWebhookEventClaim,
  tryClaimStripeWebhookEvent,
} from "@/lib/stripe-processed-events";
import { chargeIdFromPaymentIntent } from "@/lib/stripe-charge";
import { findJobIdByStripePaymentIntentOrCharge } from "@/lib/stripe-webhook-job-lookup";
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

function legacyCompatibleLineType(raw: string): string {
  const v = raw.trim();
  if (v === "Check-In (Ticket Counter)") return "Check-In";
  if (v === "Bag Drop (Checked Bags)") return "Bag Drop";
  if (v === "Security Line (Standard)") return "Security";
  if (v === "Security Line (PreCheck / CLEAR)") return "TSA PreCheck";
  // For legacy schemas limited to 5 enum-like values.
  if (
    v === "Flight Changes / Customer Service" ||
    v.startsWith("Gate Agent") ||
    v === "Rental Car Pickup" ||
    v === "Taxi / Rideshare Line" ||
    v === "Food / Coffee Line" ||
    v === "Lounge Entry Waitlist" ||
    v === "Other (Describe your line)"
  ) {
    return "Customs";
  }
  return v;
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

  const claimed = await tryClaimStripeWebhookEvent(admin, event);
  if (!claimed) {
    return NextResponse.json({ received: true, duplicate: true });
  }

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
      case "charge.dispute.created":
        await handleChargeDisputeCreated(
          admin,
          stripe,
          event.data.object as Stripe.Dispute
        );
        break;
      case "charge.refunded":
        await handleChargeRefunded(admin, event.data.object as Stripe.Charge);
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
    await markStripeWebhookEventProcessed(admin, event.id);
  } catch (e) {
    await releaseStripeWebhookEventClaim(admin, event.id, e);
    console.error("Stripe webhook handler error:", e);
    const err = e as { code?: string; message?: string };
    return NextResponse.json(
      { error: "Webhook handler failed", code: err?.code ?? null },
      { status: 500 }
    );
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
  metadataOverride?: Record<string, string | null | undefined> | null,
  opts?: { checkoutSessionId?: string | null }
) {
  if (pi.status !== "succeeded") return;

  const md = readMeta(pi.metadata, metadataOverride);
  const checkoutSessionId = opts?.checkoutSessionId?.trim() || null;
  const stripeChargeId = chargeIdFromPaymentIntent(pi);
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

  const baseInsert = {
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
    booking_terms_acknowledged_at: md.booking_terms_acknowledged_at ?? null,
    booking_disclaimer_acknowledged_at:
      md.booking_disclaimer_acknowledged_at ?? null,
    category_specific_disclaimer_version:
      md.category_disclaimer_version ?? null,
    refund_policy_version: md.refund_policy_version ?? null,
    status: "open",
    stripe_payment_intent_id: pi.id,
    payment_status: "captured" as const,
    stripe_checkout_session_id: checkoutSessionId,
    stripe_charge_id: stripeChargeId,
  };

  const { data: inserted, error } = await admin
    .from("jobs")
    .insert(baseInsert)
    .select("id")
    .maybeSingle();

  if (!error && inserted?.id) {
    await notifyJobCreated(inserted.id);
    return;
  }

  if (error) {
    if (error.code === "23505") return;
    const fallbackLineType = legacyCompatibleLineType(lineType);
    if (fallbackLineType !== lineType) {
      const fallbackDescription = baseInsert.description
        ? `${baseInsert.description}\n\nOriginal line type: ${lineType}`
        : `Original line type: ${lineType}`;
      const { data: retryRow, error: retryErr } = await admin
        .from("jobs")
        .insert({
          ...baseInsert,
          line_type: fallbackLineType,
          description: fallbackDescription,
        })
        .select("id")
        .maybeSingle();
      if (!retryErr && retryRow?.id) {
        await notifyJobCreated(retryRow.id);
        return;
      }
      if (!retryErr || retryErr.code === "23505") return;
      throw retryErr;
    }
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
  await handlePaymentIntentSucceeded(admin, pi, session.metadata, {
    checkoutSessionId: session.id,
  });
}

async function handleAccountUpdated(
  admin: ReturnType<typeof createAdminClient>,
  account: Stripe.Account
) {
  if (!account.id) return;

  const detailsSubmitted = account.details_submitted === true;
  const payoutsEnabled = account.payouts_enabled === true;
  const patch = {
    stripe_account_id: account.id,
    stripe_details_submitted: detailsSubmitted,
    stripe_payouts_enabled: payoutsEnabled,
  };

  const userId = account.metadata?.supabase_user_id;
  if (userId) {
    await admin.from("profiles").update(patch).eq("id", userId);
    return;
  }

  const { error } = await admin
    .from("profiles")
    .update(patch)
    .eq("stripe_account_id", account.id);
  if (error && process.env.NODE_ENV === "development") {
    console.warn("[stripe/webhook] account.updated: no row for account", account.id);
  }
}

/**
 * Card chargeback: freeze payout by marking payment_status (in-app "disputed" is status-only).
 */
async function handleChargeDisputeCreated(
  admin: ReturnType<typeof createAdminClient>,
  stripe: Stripe,
  dispute: Stripe.Dispute
) {
  const chargeId =
    typeof dispute.charge === "string"
      ? dispute.charge
      : dispute.charge?.id ?? null;
  if (!chargeId) {
    console.warn("[stripe/webhook] charge.dispute.created: missing charge id", dispute.id);
    return;
  }

  const charge = await stripe.charges.retrieve(chargeId);
  const piRef = charge.payment_intent;
  const piId = typeof piRef === "string" ? piRef : piRef?.id ?? null;

  const jobId = await findJobIdByStripePaymentIntentOrCharge(
    admin,
    piId,
    chargeId
  );

  if (!jobId) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[stripe/webhook] charge.dispute.created: no matching job", {
        disputeId: dispute.id,
        chargeId,
        piId,
      });
    }
    return;
  }

  const { error } = await admin
    .from("jobs")
    .update({
      payment_status: "disputed",
      stripe_dispute_id: dispute.id,
    })
    .eq("id", jobId);

  if (error) {
    console.error("[stripe/webhook] charge.dispute.created update failed:", error.message);
    throw error;
  }
}

/**
 * Reconcile jobs.payment_status when a refund is created outside the app (Dashboard, API, etc.).
 * Full refund → refunded; partial → refund_pending (unless already refunded).
 */
async function handleChargeRefunded(
  admin: ReturnType<typeof createAdminClient>,
  charge: Stripe.Charge
) {
  const chargeId = charge.id;
  const piRef = charge.payment_intent;
  const piId = typeof piRef === "string" ? piRef : piRef?.id ?? null;

  const jobId = await findJobIdByStripePaymentIntentOrCharge(
    admin,
    piId,
    chargeId
  );

  if (!jobId) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[stripe/webhook] charge.refunded: no matching job", {
        chargeId,
        piId,
      });
    }
    return;
  }

  const amount = charge.amount ?? 0;
  const refunded = charge.amount_refunded ?? 0;
  if (refunded <= 0 || amount <= 0) return;

  const { data: row } = await admin
    .from("jobs")
    .select("payment_status")
    .eq("id", jobId)
    .maybeSingle();
  const current = row?.payment_status as string | null | undefined;
  if (current === "refunded") return;

  const nextStatus =
    refunded >= amount ? ("refunded" as const) : ("refund_pending" as const);
  if (current === nextStatus) return;

  const { error } = await admin
    .from("jobs")
    .update({ payment_status: nextStatus })
    .eq("id", jobId);

  if (error) {
    console.error("[stripe/webhook] charge.refunded update failed:", error.message);
    throw error;
  }
}
