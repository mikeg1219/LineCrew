"use server";

import { appBaseUrl } from "@/lib/app-url";
import { getStripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";

export type ConnectState = { error: string } | null;

/**
 * Incomplete Connect → resume with account_onboarding.
 * Fully enabled Connect → use account_update so Line Holders can change bank without restarting full onboarding.
 */
function stripeAccountLinkType(
  profile: Record<string, unknown> | null | undefined
): "account_onboarding" | "account_update" {
  const id = profile?.stripe_account_id;
  if (typeof id !== "string" || !id.trim()) return "account_onboarding";
  const ds = profile.stripe_details_submitted;
  const pe = profile.stripe_payouts_enabled;
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
    const msg = e instanceof Error ? e.message : "Could not start Stripe onboarding.";
    console.error("[waiter/connect] start onboarding failed:", msg);
    return {
      error: msg,
    };
  }
}
