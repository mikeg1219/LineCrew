import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Resolve a LineCrew job from Stripe payment objects stored on the row.
 */
export async function findJobIdByStripePaymentIntentOrCharge(
  admin: SupabaseClient,
  paymentIntentId: string | null | undefined,
  stripeChargeId: string | null | undefined
): Promise<string | null> {
  const pi = paymentIntentId?.trim();
  if (pi) {
    const { data } = await admin
      .from("jobs")
      .select("id")
      .eq("stripe_payment_intent_id", pi)
      .maybeSingle();
    if (data?.id) return data.id as string;
  }
  const ch = stripeChargeId?.trim();
  if (ch) {
    const { data } = await admin
      .from("jobs")
      .select("id")
      .eq("stripe_charge_id", ch)
      .maybeSingle();
    if (data?.id) return data.id as string;
  }
  return null;
}
