import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * After Stripe Checkout, the client polls until the webhook has created the job row.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("session_id");
  if (!sessionId) {
    return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (session.payment_status !== "paid") {
    return NextResponse.json({
      ok: false,
      pending: true,
      reason: "unpaid",
    });
  }

  const piRef = session.payment_intent;
  const piId =
    typeof piRef === "string" ? piRef : piRef?.id ?? null;
  if (!piId) {
    return NextResponse.json({ error: "No payment intent" }, { status: 400 });
  }

  const pi = await stripe.paymentIntents.retrieve(piId);
  const customerId = pi.metadata?.customer_id;
  if (customerId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: job } = await supabase
    .from("jobs")
    .select("id")
    .eq("stripe_payment_intent_id", piId)
    .maybeSingle();

  if (job?.id) {
    return NextResponse.json({ ok: true, jobId: job.id });
  }

  return NextResponse.json({ ok: true, pending: true });
}
