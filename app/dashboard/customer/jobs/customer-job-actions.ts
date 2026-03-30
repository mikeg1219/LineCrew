"use server";

import { finalizeJobPayout } from "@/lib/stripe-release-payout";
import { getStripe } from "@/lib/stripe";
import { sendAdminEmail } from "@/lib/notify-admin";
import { createClient } from "@/lib/supabase/server";
import type { JobStatus } from "@/lib/types/job";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type CustomerJobActionState = { error: string } | null;

const KILL_FEE_CENTS = 500;

const NON_CANCEL: JobStatus[] = [
  "completed",
  "cancelled",
  "disputed",
  "refunded",
];

export async function confirmJobCompletionAction(
  _prev: CustomerJobActionState | undefined,
  formData: FormData
): Promise<CustomerJobActionState> {
  const jobId = String(formData.get("jobId") ?? "");
  if (!jobId) return { error: "Missing booking." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in required." };

  const { data: job } = await supabase
    .from("jobs")
    .select("id, customer_id, status")
    .eq("id", jobId)
    .maybeSingle();

  if (!job || job.customer_id !== user.id) {
    return { error: "Not your booking." };
  }
  if (job.status !== "pending_confirmation") {
    return { error: "This booking is not waiting for confirmation." };
  }

  const result = await finalizeJobPayout(supabase, jobId, "pending_confirmation");
  if (!result.ok) {
    return { error: result.error };
  }

  revalidatePath(`/dashboard/customer/jobs/${jobId}`);
  redirect(`/dashboard/customer/jobs/${jobId}`);
  return null;
}

export async function disputeJobAction(
  _prev: CustomerJobActionState | undefined,
  formData: FormData
): Promise<CustomerJobActionState> {
  const jobId = String(formData.get("jobId") ?? "");
  if (!jobId) return { error: "Missing booking." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in required." };

  const { data: job } = await supabase
    .from("jobs")
    .select("id, customer_id, status, airport, offered_price")
    .eq("id", jobId)
    .maybeSingle();

  if (!job || job.customer_id !== user.id) {
    return { error: "Not your booking." };
  }
  if (job.status !== "pending_confirmation") {
    return {
      error:
        "You can only dispute after the Line Holder marks the booking complete.",
    };
  }

  const { error } = await supabase
    .from("jobs")
    .update({ status: "disputed" })
    .eq("id", jobId)
    .eq("status", "pending_confirmation");

  if (error) return { error: error.message };

  await sendAdminEmail(
    `LineCrew dispute — booking ${jobId}`,
    `<p>A customer disputed booking <strong>${jobId}</strong>.</p>
     <p>Airport: ${job.airport}, amount: $${Number(job.offered_price).toFixed(2)}</p>
     <p>Review in admin panel.</p>`
  );

  revalidatePath(`/dashboard/customer/jobs/${jobId}`);
  redirect(`/dashboard/customer/jobs/${jobId}`);
  return null;
}

export async function cancelJobAction(
  _prev: CustomerJobActionState | undefined,
  formData: FormData
): Promise<CustomerJobActionState> {
  const jobId = String(formData.get("jobId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!jobId) return { error: "Missing booking." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in required." };

  let stripe;
  try {
    stripe = getStripe();
  } catch {
    return { error: "Payment system not configured." };
  }

  const { data: job } = await supabase
    .from("jobs")
    .select(
      "id, customer_id, status, stripe_payment_intent_id, offered_price, waiter_id"
    )
    .eq("id", jobId)
    .maybeSingle();

  if (!job || job.customer_id !== user.id) {
    return { error: "Not your booking." };
  }

  const st = job.status as JobStatus;
  if (NON_CANCEL.includes(st)) {
    return { error: "This booking cannot be cancelled." };
  }

  if (!job.stripe_payment_intent_id) {
    return { error: "No payment on file for this booking." };
  }

  const pi = job.stripe_payment_intent_id;
  const offeredCents = Math.round(Number(job.offered_price) * 100);
  const fullRefund = st === "open" || job.waiter_id == null;

  try {
    if (fullRefund) {
      await stripe.refunds.create({
        payment_intent: pi,
        amount: offeredCents,
      });
    } else {
      const { data: waiterRow } = job.waiter_id
        ? await supabase
            .from("profiles")
            .select("*")
            .eq("id", job.waiter_id)
            .maybeSingle()
        : { data: null };

      const refundCents = offeredCents - KILL_FEE_CENTS;
      if (refundCents < 0) {
        return { error: "Invalid booking amount for cancellation." };
      }

      await stripe.refunds.create({
        payment_intent: pi,
        amount: refundCents,
      });

      if (waiterRow?.stripe_account_id) {
        await stripe.transfers.create(
          {
            amount: KILL_FEE_CENTS,
            currency: "usd",
            destination: waiterRow.stripe_account_id,
            metadata: { job_id: jobId, type: "cancellation_kill_fee" },
            transfer_group: jobId,
          },
          { idempotencyKey: `linecrew_kill_${jobId}` }
        );
      }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Refund failed";
    return { error: msg };
  }

  const { error } = await supabase
    .from("jobs")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      cancellation_reason: reason || null,
      waiter_id: null,
      waiter_email: null,
      accepted_at: null,
    })
    .eq("id", jobId);

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/customer/jobs/${jobId}`);
  redirect(`/dashboard/customer`);
  return null;
}
