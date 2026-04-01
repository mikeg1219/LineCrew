import { getStripe } from "@/lib/stripe";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Same path as webhooks — avoids RLS edge cases on stripe_* columns. */
function dbForStripeWrite(supabase: SupabaseClient): SupabaseClient {
  return createServiceRoleClient() ?? supabase;
}

/**
 * Pull Connect account state from Stripe into profiles (for gating + UI).
 * Safe to call on dashboard load after onboarding return or when columns are null.
 */
export async function syncStripeConnectFromStripeForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<
  | {
      ok: true;
      detailsSubmitted: boolean;
      payoutsEnabled: boolean;
    }
  | { ok: false; error: string }
> {
  const { data: profile, error: pErr } = await supabase
    .from("profiles")
    .select("stripe_account_id")
    .eq("id", userId)
    .maybeSingle();

  if (pErr) {
    return { ok: false, error: pErr.message };
  }
  const accountId = profile?.stripe_account_id as string | null | undefined;
  if (!accountId?.trim()) {
    return { ok: false, error: "No Stripe Connect account on file." };
  }

  try {
    const stripe = getStripe();
    const account = await stripe.accounts.retrieve(accountId);
    const detailsSubmitted = account.details_submitted === true;
    const payoutsEnabled = account.payouts_enabled === true;

    const db = dbForStripeWrite(supabase);
    const { error: upErr } = await db
      .from("profiles")
      .update({
        stripe_details_submitted: detailsSubmitted,
        stripe_payouts_enabled: payoutsEnabled,
      })
      .eq("id", userId);

    if (upErr) {
      console.error("[stripe-account-sync] profiles update failed:", {
        code: upErr.code,
        message: upErr.message,
        hint:
          upErr.message?.includes("column") || upErr.code === "PGRST204"
            ? "Run supabase/stripe-connect-status-migration.sql in Supabase SQL Editor."
            : undefined,
      });
      return { ok: false, error: upErr.message };
    }

    return { ok: true, detailsSubmitted, payoutsEnabled };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Stripe account lookup failed";
    return { ok: false, error: msg };
  }
}

type ProfileRow = Record<string, unknown>;

export type SyncWaiterStripeResult = {
  profile: ProfileRow;
  /** Set when a Stripe→DB sync was attempted and failed (e.g. show banner on dashboard). */
  stripeSyncError: string | null;
};

/**
 * Refreshes Connect flags when missing or after Stripe redirect (?connect=return).
 * Returns the latest profile row (or the input if no sync ran / failed).
 */
export async function syncWaiterStripeIfNeeded(
  supabase: SupabaseClient,
  userId: string,
  profile: ProfileRow,
  opts: { force?: boolean }
): Promise<SyncWaiterStripeResult> {
  const noop = (): SyncWaiterStripeResult => ({
    profile,
    stripeSyncError: null,
  });
  try {
    if (profile.role !== "waiter") return noop();
    const accountId = profile.stripe_account_id as string | null | undefined;
    if (!accountId?.trim()) return noop();

    const force = opts.force ?? false;
    const fullyReady =
      profile.stripe_details_submitted === true &&
      profile.stripe_payouts_enabled === true;
    if (!force && fullyReady) return noop();

    const r = await syncStripeConnectFromStripeForUser(supabase, userId);
    if (!r.ok) {
      console.error(
        "[stripe-account-sync] syncWaiterStripeIfNeeded: Stripe→profiles sync failed",
        { userId, error: r.error, force }
      );
      return { profile, stripeSyncError: r.error };
    }

    const { data } = await dbForStripeWrite(supabase)
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    return {
      profile: (data ?? profile) as ProfileRow,
      stripeSyncError: null,
    };
  } catch (e) {
    console.error("[stripe-account-sync] syncWaiterStripeIfNeeded:", e);
    const msg =
      e instanceof Error ? e.message : "Could not sync Stripe payout status.";
    return { profile, stripeSyncError: msg };
  }
}
