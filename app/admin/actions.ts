"use server";

import { isAdminUser } from "@/lib/admin-config";
import { finalizeJobPayout } from "@/lib/stripe-release-payout";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseJobIdFromFormData } from "@/lib/server-input";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type AdminActionState = { error: string } | null;

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email || !isAdminUser(user.email)) {
    return { error: "Unauthorized" as const, user: null };
  }
  return { error: null, user };
}

export async function adminRefundCustomerAction(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const jobId = String(formData.get("jobId") ?? "");
  if (!jobId) return { error: "Missing booking." };

  const auth = await requireAdmin();
  if (auth.error) return { error: auth.error };

  let stripe;
  try {
    stripe = getStripe();
  } catch {
    return { error: "Stripe not configured." };
  }

  const admin = createAdminClient();
  const { data: job } = await admin
    .from("jobs")
    .select("id, status, stripe_payment_intent_id, offered_price, payout_transfer_id")
    .eq("id", jobId)
    .maybeSingle();

  if (!job || job.status !== "disputed") {
    return { error: "Booking not found or not disputed." };
  }

  if (job.payout_transfer_id) {
    return { error: "Payout already sent — cannot full refund." };
  }

  const pi = job.stripe_payment_intent_id;
  if (!pi) return { error: "No payment on file." };

  const cents = Math.round(Number(job.offered_price) * 100);
  try {
    await stripe.refunds.create({
      payment_intent: pi,
      amount: cents,
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Refund failed" };
  }

  const { error } = await admin
    .from("jobs")
    .update({ status: "refunded", payment_status: "refunded" })
    .eq("id", jobId);

  if (error) return { error: error.message };

  revalidatePath("/admin");
  return null;
}

export async function adminPayWaiterAction(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const jobId = parseJobIdFromFormData(formData);
  if (!jobId) return { error: "Invalid booking." };

  const auth = await requireAdmin();
  if (auth.error) return { error: auth.error };

  const admin = createAdminClient();
  const r = await finalizeJobPayout(admin, jobId, "disputed");
  if (!r.ok) {
    return { error: r.error };
  }

  revalidatePath("/admin");
  return null;
}

export async function adminMarkFraudReviewedAction(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const jobId = parseJobIdFromFormData(formData);
  const notes = String(formData.get("notes") ?? "").trim();
  if (!jobId) return { error: "Invalid booking." };

  const auth = await requireAdmin();
  if (auth.error || !auth.user) return { error: auth.error ?? "Unauthorized" };

  const admin = createAdminClient();
  const { error } = await admin
    .from("jobs")
    .update({
      handoff_reviewed_at: new Date().toISOString(),
      handoff_reviewed_by: auth.user.email,
      handoff_review_notes: notes || null,
    })
    .eq("id", jobId);

  if (error) return { error: error.message };
  revalidatePath("/admin");
  return null;
}
