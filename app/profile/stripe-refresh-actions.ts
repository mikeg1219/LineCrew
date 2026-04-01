"use server";

import { syncStripeConnectFromStripeForUser } from "@/lib/stripe-account-sync";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type RefreshStripeConnectStatusResult =
  | {
      ok: true;
      stripe_details_submitted: boolean | null;
      stripe_payouts_enabled: boolean | null;
    }
  | { ok: false; error: string };

/**
 * Pulls Connect state from Stripe into profiles. Use after onboarding return or manual refresh.
 * When `force` is true, always re-fetch from Stripe (if a Connect account exists).
 */
export async function refreshStripeConnectStatusAction(opts: {
  force: boolean;
}): Promise<RefreshStripeConnectStatusResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Not signed in" };
  }

  const { data: profileRow, error: selErr } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (selErr || !profileRow) {
    return { ok: false, error: selErr?.message ?? "Profile not found" };
  }
  if (profileRow.role !== "waiter") {
    return { ok: false, error: "Not a Line Holder account" };
  }

  const accountId = profileRow.stripe_account_id as string | null | undefined;
  if (!accountId?.trim()) {
    return {
      ok: false,
      error:
        "No Stripe Connect account yet. Use the payout setup button to start.",
    };
  }

  const fullyReady =
    profileRow.stripe_details_submitted === true &&
    profileRow.stripe_payouts_enabled === true;

  if (!opts.force && fullyReady) {
    return {
      ok: true,
      stripe_details_submitted: profileRow.stripe_details_submitted ?? null,
      stripe_payouts_enabled: profileRow.stripe_payouts_enabled ?? null,
    };
  }

  const syncResult = await syncStripeConnectFromStripeForUser(supabase, user.id);
  if (!syncResult.ok) {
    console.error("[stripe-refresh] syncStripeConnectFromStripeForUser failed", {
      userId: user.id,
      error: syncResult.error,
      force: opts.force,
    });
    return { ok: false, error: syncResult.error };
  }

  revalidatePath("/dashboard/profile");
  revalidatePath("/profile");
  revalidatePath("/dashboard/waiter");

  const { data: fresh } = await supabase
    .from("profiles")
    .select("stripe_details_submitted, stripe_payouts_enabled")
    .eq("id", user.id)
    .maybeSingle();

  return {
    ok: true,
    stripe_details_submitted: fresh?.stripe_details_submitted ?? null,
    stripe_payouts_enabled: fresh?.stripe_payouts_enabled ?? null,
  };
}
