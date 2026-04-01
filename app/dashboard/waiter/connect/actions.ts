"use server";

import { appBaseUrl } from "@/lib/app-url";
import { getStripe } from "@/lib/stripe";
import { syncStripeConnectFromStripeForUser } from "@/lib/stripe-account-sync";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import type { SupabaseClient } from "@supabase/supabase-js";
import Stripe from "stripe";

export type ConnectState = { error: string } | null;

function normalizeStripeConnectError(err: unknown): string {
  const fallback = "Could not start Stripe onboarding.";
  if (!(err instanceof Stripe.errors.StripeError)) {
    return err instanceof Error ? err.message : fallback;
  }

  const msg = (err.message ?? "").trim();
  const lowered = msg.toLowerCase();

  if (lowered.includes("signed up for connect")) {
    return "Stripe Connect account creation is blocked for the configured STRIPE_SECRET_KEY. Confirm Connect is enabled for this Stripe account and that the key has Connect write permissions in the same test/live mode.";
  }

  if (lowered.includes("no such account")) {
    return "Your saved Stripe account could not be found. Please contact support to reconnect payouts.";
  }

  if (
    lowered.includes("account_update") &&
    lowered.includes("account_onboarding")
  ) {
    return "Finish Stripe onboarding first (Review and confirm on Stripe, then return here). Use Continue payout setup or Refresh status.";
  }

  if (err.code === "api_key_expired" || lowered.includes("invalid api key")) {
    return "Stripe secret key is invalid for this environment. Update STRIPE_SECRET_KEY and retry.";
  }

  return msg || fallback;
}

function isNoSuchAccountError(err: unknown): boolean {
  if (!(err instanceof Stripe.errors.StripeError)) return false;
  const msg = (err.message ?? "").toLowerCase();
  return msg.includes("no such account");
}

async function findExistingConnectedAccountId(
  stripe: Stripe,
  userId: string,
  userEmail: string
): Promise<string | null> {
  let startingAfter: string | undefined;
  for (let page = 0; page < 5; page += 1) {
    const list = await stripe.accounts.list({
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });
    const hit = list.data.find((acct) => {
      if (acct.metadata?.supabase_user_id === userId) return true;
      return (acct.email ?? "").toLowerCase() === userEmail.toLowerCase();
    });
    if (hit?.id) return hit.id;
    if (!list.has_more || list.data.length === 0) break;
    startingAfter = list.data[list.data.length - 1]?.id;
  }
  return null;
}

type ProfileConnectFlags = {
  stripe_details_submitted?: boolean | null;
  stripe_payouts_enabled?: boolean | null;
};

/**
 * Account Link type from persisted flags (after optional Stripe→DB sync).
 * - `account_onboarding` until identity/details are submitted in Stripe.
 * - `account_update` once `stripe_details_submitted` is true (e.g. pending
 *   payouts verification or post-onboarding bank updates). Do not use
 *   `account_update` when details are still missing — Stripe rejects it.
 */
function resolveAccountLinkTypeFromProfileFlags(
  profile: ProfileConnectFlags
): "account_onboarding" | "account_update" {
  if (profile.stripe_details_submitted !== true) {
    return "account_onboarding";
  }
  // Details submitted: use account_update (payouts still pending, or fully enabled).
  return "account_update";
}

/** Refresh Connect flags from Stripe API into `profiles` before choosing link type. */
async function syncConnectFlagsForLinkDecision(
  supabase: SupabaseClient,
  userId: string,
  profile: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const sync = await syncStripeConnectFromStripeForUser(supabase, userId);
  if (!sync.ok) {
    console.info("[waiter/connect] pre-link sync skipped or failed", {
      userId,
      error: sync.error,
    });
    return profile;
  }
  const { data: fresh } = await supabase
    .from("profiles")
    .select("stripe_details_submitted, stripe_payouts_enabled")
    .eq("id", userId)
    .maybeSingle();
  if (!fresh) return profile;
  return {
    ...profile,
    stripe_details_submitted: fresh.stripe_details_submitted,
    stripe_payouts_enabled: fresh.stripe_payouts_enabled,
  };
}

export async function startStripeConnectOnboardingAction(
  _prev: ConnectState,
  formData: FormData
): Promise<ConnectState> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      return { error: "You must be signed in." };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.role !== "waiter") {
      return { error: "Only Line Holders can set up payouts." };
    }

    const stripe = getStripe();
    const db = createServiceRoleClient() ?? supabase;
    let accountId = profile?.stripe_account_id ?? null;

    if (!accountId) {
      const existingId = await findExistingConnectedAccountId(
        stripe,
        user.id,
        user.email
      );
      if (existingId) {
        accountId = existingId;
      }
    }

    if (!accountId) {
      // Transfers only: Line Holders receive platform payouts, not direct charges.
      // Requesting card_payments can fail or add unnecessary onboarding in some accounts.
      const account = await stripe.accounts.create({
        type: "express",
        country: "US",
        email: user.email,
        capabilities: {
          transfers: { requested: true },
        },
        metadata: { supabase_user_id: user.id },
      });
      accountId = account.id;
      const { error: upErr } = await db
        .from("profiles")
        .update({ stripe_account_id: accountId })
        .eq("id", user.id);
      if (upErr) {
        console.error("[waiter/connect] save stripe_account_id:", upErr.message);
        return { error: upErr.message };
      }
    }

    const base = appBaseUrl();
    const rawReturn = String(formData.get("returnTo") ?? "").trim();
    const rawMode = String(formData.get("mode") ?? "onboarding").trim();
    const mode: "onboarding" | "update" =
      rawMode === "update" ? "update" : "onboarding";
    const allowedReturn =
      rawReturn === "/dashboard/profile" ||
      rawReturn === "/dashboard/waiter" ||
      rawReturn === "/profile";
    const returnPath = allowedReturn ? rawReturn : "/dashboard/waiter";

    const createAccountLink = async (
      acctId: string,
      linkType: "account_onboarding" | "account_update"
    ) =>
      stripe.accountLinks.create({
        account: acctId,
        refresh_url: `${base}${returnPath}?connect=refresh`,
        return_url: `${base}${returnPath}?connect=return`,
        type: linkType,
      });

    let link: Stripe.AccountLink;
    let resolvedLinkType: "account_onboarding" | "account_update" | null = null;
    try {
      const profileForLink = await syncConnectFlagsForLinkDecision(
        supabase,
        user.id,
        profile as Record<string, unknown>
      );
      resolvedLinkType = resolveAccountLinkTypeFromProfileFlags(
        profileForLink as ProfileConnectFlags
      );
      link = await createAccountLink(accountId, resolvedLinkType);
    } catch (err) {
      // Auto-heal stale account IDs saved in profile: retry with a recovered account ID.
      if (!isNoSuchAccountError(err)) {
        throw err;
      }

      const recoveredId =
        (await findExistingConnectedAccountId(stripe, user.id, user.email)) ?? null;
      if (recoveredId) {
        accountId = recoveredId;
      } else {
        const account = await stripe.accounts.create({
          type: "express",
          country: "US",
          email: user.email,
          capabilities: {
            transfers: { requested: true },
          },
          metadata: { supabase_user_id: user.id },
        });
        accountId = account.id;
      }

      const { error: repairErr } = await db
        .from("profiles")
        .update({ stripe_account_id: accountId })
        .eq("id", user.id);
      if (repairErr) {
        console.error("[waiter/connect] repair stripe_account_id:", repairErr.message);
        return { error: repairErr.message };
      }

      const profileAfterRepair = await syncConnectFlagsForLinkDecision(
        supabase,
        user.id,
        profile as Record<string, unknown>
      );
      resolvedLinkType = resolveAccountLinkTypeFromProfileFlags(
        profileAfterRepair as ProfileConnectFlags
      );
      link = await createAccountLink(accountId, resolvedLinkType);
    }

    // Lightweight server-side analytics marker (visible in Vercel logs).
    console.info("[analytics][waiter_connect_click]", {
      userId: user.id,
      mode,
      linkType: resolvedLinkType,
      accountId,
      returnPath,
      timestamp: new Date().toISOString(),
    });

    redirect(link.url);
    return null;
  } catch (e) {
    // redirect() throws NEXT_REDIRECT; must not be turned into a form error.
    if (isRedirectError(e)) {
      throw e;
    }
    const msg = normalizeStripeConnectError(e);
    console.error("[waiter/connect] start onboarding failed:", msg);
    return {
      error: msg,
    };
  }
}
