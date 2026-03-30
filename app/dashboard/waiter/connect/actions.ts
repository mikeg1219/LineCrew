"use server";

import { appBaseUrl } from "@/lib/app-url";
import { getStripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export type ConnectState = { error: string } | null;

export async function startStripeConnectOnboardingAction(
  _prev: ConnectState,
  _formData: FormData
): Promise<ConnectState> {
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

  let stripe;
  try {
    stripe = getStripe();
  } catch (e) {
    return {
      error:
        e instanceof Error
          ? e.message
          : "Stripe is not configured. Add STRIPE_SECRET_KEY to .env.local.",
    };
  }

  let accountId = profile?.stripe_account_id ?? null;

  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      country: "US",
      email: user.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      metadata: { supabase_user_id: user.id },
    });
    accountId = account.id;
    const { error: upErr } = await supabase
      .from("profiles")
      .update({ stripe_account_id: accountId })
      .eq("id", user.id);
    if (upErr) {
      return { error: upErr.message };
    }
  }

  const base = appBaseUrl();
  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${base}/dashboard/waiter?connect=refresh`,
    return_url: `${base}/dashboard/waiter?connect=return`,
    type: "account_onboarding",
  });

  redirect(link.url);
  return null;
}
