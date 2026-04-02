"use server";

import { getBookingDraftCookie } from "@/lib/booking-draft-cookie";
import { createBookingCheckoutSession } from "@/lib/create-booking-checkout-session";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export type ConfirmBookingState = { error: string } | null;

/** Reads stored booking draft, creates Stripe Checkout, redirects to Stripe. */
export async function confirmAndCheckout(
  _prev: ConfirmBookingState,
  formData: FormData
): Promise<ConfirmBookingState> {
  const ack = formData.get("review_terms_ack") === "on";
  if (!ack) {
    return {
      error:
        "Please confirm you agree to the booking terms, cancellation policy, and community guidelines.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to continue." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "customer") {
    return { error: "Only customers can complete checkout." };
  }

  const draft = await getBookingDraftCookie();
  if (!draft) {
    return {
      error:
        "Your booking session expired. Please start over from the booking form.",
    };
  }

  const acknowledgedAt = new Date().toISOString();
  const result = await createBookingCheckoutSession(
    draft,
    { id: user.id, email: user.email ?? null },
    acknowledgedAt
  );

  if ("error" in result) {
    return { error: result.error };
  }

  redirect(result.url);
  return null;
}

/** Alias for older imports — use `confirmAndCheckout`. */
export const confirmBookingCheckoutAction = confirmAndCheckout;
