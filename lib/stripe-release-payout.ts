import { notifyBookingCompletedAndPayout } from "@/lib/emails";
import { getStripe } from "@/lib/stripe";
import { isPaymentCapturedForPayout } from "@/lib/payment-status";
import type { SupabaseClient } from "@supabase/supabase-js";

const PLATFORM_FEE = 0.2;

/**
 * Transfer 80% to Line Holder and mark booking completed. Idempotent via payout_transfer_id.
 * `fromStatus` is the status the job must currently have.
 */
export async function finalizeJobPayout(
  supabase: SupabaseClient,
  jobId: string,
  fromStatus:
    | "pending_confirmation"
    | "awaiting_dual_confirmation"
    | "disputed"
): Promise<
  { ok: true; transferId: string } | { ok: false; error: string }
> {
  const stripe = getStripe();

  const { data: job, error: jErr } = await supabase
    .from("jobs")
    .select(
      "offered_price, payout_transfer_id, stripe_payment_intent_id, stripe_charge_id, waiter_id, status, customer_id, airport, line_type"
    )
    .eq("id", jobId)
    .maybeSingle();

  if (jErr || !job) {
    return { ok: false, error: "Booking not found." };
  }

  if (job.status !== fromStatus) {
    return { ok: false, error: "Booking is not in the expected status." };
  }

  if (job.payout_transfer_id) {
    return { ok: true, transferId: job.payout_transfer_id as string };
  }

  if (!job.stripe_payment_intent_id || !job.waiter_id) {
    return { ok: false, error: "Booking missing payment or Line Holder." };
  }

  const payStatus = (job as { payment_status?: string | null }).payment_status;
  if (payStatus != null && !isPaymentCapturedForPayout(payStatus)) {
    return {
      ok: false,
      error: "Payment is not in a captured state; payout blocked.",
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", job.waiter_id)
    .maybeSingle();

  if (!profile?.stripe_account_id) {
    return { ok: false, error: "Line Holder has no Stripe Connect account." };
  }

  const offered = Number(job.offered_price);
  const waiterShareCents = Math.floor(offered * 100 * (1 - PLATFORM_FEE));
  if (waiterShareCents < 1) {
    return { ok: false, error: "Invalid payout amount." };
  }

  try {
    const stripeChargeId = (job as { stripe_charge_id?: string | null })
      .stripe_charge_id ?? null;
    const transfer = await stripe.transfers.create(
      {
        amount: waiterShareCents,
        currency: "usd",
        destination: profile.stripe_account_id,
        ...(stripeChargeId ? { source_transaction: stripeChargeId } : {}),
        metadata: { job_id: jobId },
        transfer_group: jobId,
      },
      { idempotencyKey: `linecrew_payout_${jobId}` }
    );

    const { error: upErr } = await supabase
      .from("jobs")
      .update({
        status: "completed",
        payout_transfer_id: transfer.id,
      })
      .eq("id", jobId)
      .eq("status", fromStatus);

    if (upErr) {
      return {
        ok: false,
        error: `Transfer created but booking update failed: ${upErr.message}`,
      };
    }

    await notifyBookingCompletedAndPayout({
      jobId,
      customerId: String(job.customer_id),
      waiterId: String(job.waiter_id),
      airport: String(job.airport),
      lineType: String(job.line_type),
      amountCharged: offered,
      waiterPayoutAmount: waiterShareCents / 100,
    });

    return { ok: true, transferId: transfer.id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Stripe transfer failed";
    return { ok: false, error: msg };
  }
}
