"use server";

import { syncWaiterStripeIfNeeded } from "@/lib/stripe-account-sync";
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
 * Runs after profile loads (client) so the dashboard profile RSC never calls Stripe.
 * Call when waiter has a Connect account and flags are missing or ?connect=return|refresh.
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

  const updated = await syncWaiterStripeIfNeeded(
    supabase,
    user.id,
    profileRow as Record<string, unknown>,
    { force: opts.force }
  );

  revalidatePath("/dashboard/profile");
  revalidatePath("/dashboard/waiter");

  const u = updated as {
    stripe_details_submitted?: boolean | null;
    stripe_payouts_enabled?: boolean | null;
  };

  return {
    ok: true,
    stripe_details_submitted: u.stripe_details_submitted ?? null,
    stripe_payouts_enabled: u.stripe_payouts_enabled ?? null,
  };
}
