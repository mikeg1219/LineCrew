"use server";

import { appBaseUrl } from "@/lib/app-url";
import { getStripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
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

  if (err.code === "api_key_expired" || lowered.includes("invalid api key")) {
    return "Stripe secret key is invalid for this environment. Update STRIPE_SECRET_KEY and retry.";
  }

  return msg || fallback;
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

/**
 * Incomplete Connect → resume with account_onboarding.
 * Fully enabled Connect → use account_update so Line Holders can change bank without restarting full onboarding.
 */
function stripeAccountLinkType(
  profile: Record<string, unknown> | null | undefined
): "account_onboarding" | "account_update" {
  const id = profile?.stripe_account_id;
  if (typeof id !== "string" || !id.trim()) return "account_onboarding";
  const ds = profile?.stripe_details_submitted;
  const pe = profile?.stripe_payouts_enabled;
  if (ds === undefined && pe === undefined) return "account_onboarding";
  if (ds === true && pe === true) return "account_update";
  return "account_onboarding";
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
      const db = createServiceRoleClient() ?? supabase;
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
    const returnPath =
      rawReturn === "/dashboard/profile" || rawReturn === "/dashboard/waiter"
        ? rawReturn
        : "/dashboard/waiter";
    const linkType = stripeAccountLinkType({
      ...(profile as Record<string, unknown>),
      stripe_account_id: accountId,
    });
    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${base}${returnPath}?connect=refresh`,
      return_url: `${base}${returnPath}?connect=return`,
      type: linkType,
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
