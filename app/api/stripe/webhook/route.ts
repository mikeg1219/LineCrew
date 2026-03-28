import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import { NextResponse } from "next/server";
import type Stripe from "stripe";

export const runtime = "nodejs";

/** Vercel serverless timeout (Stripe webhook can wait on DB). */
export const maxDuration = 60;

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
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const admin = createAdminClient();

  try {
    switch (event.type) {
      case "payment_intent.succeeded":
        await handlePaymentIntentSucceeded(
          admin,
          event.data.object as Stripe.PaymentIntent
        );
        break;
      case "account.updated":
        await handleAccountUpdated(admin, event.data.object as Stripe.Account);
        break;
      default:
        break;
    }
  } catch (e) {
    console.error("Stripe webhook handler error:", e);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handlePaymentIntentSucceeded(
  admin: ReturnType<typeof createAdminClient>,
  pi: Stripe.PaymentIntent
) {
  if (pi.status !== "succeeded") return;

  const md = pi.metadata;
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
  }
}
