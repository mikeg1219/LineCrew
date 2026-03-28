"use server";

import { AIRPORT_CODES } from "@/lib/airports";
import { isValidTerminalForAirport } from "@/lib/airport-terminals";
import { appBaseUrl } from "@/lib/app-url";
import {
  ESTIMATED_WAIT_OPTIONS,
  LINE_TYPES,
} from "@/lib/jobs/options";
import { buildJobPaymentMetadata } from "@/lib/stripe-job-metadata";
import { getStripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export type PostJobState = { error: string } | null;

export async function postJobAction(
  _prev: PostJobState,
  formData: FormData
): Promise<PostJobState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to post a job." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "customer") {
    return { error: "Only customers can post jobs." };
  }

  const airport = String(formData.get("airport") ?? "").trim();
  const terminal = String(formData.get("terminal") ?? "").trim();
  const line_type = String(formData.get("line_type") ?? "");
  const description = String(formData.get("description") ?? "");
  const priceRaw = formData.get("offered_price");
  const overageRaw = formData.get("overage_rate");
  const overageAgreed = formData.get("overage_agreed") === "on";
  const estimated_wait = String(formData.get("estimated_wait") ?? "");

  if (!overageAgreed) {
    return {
      error:
        "You must agree to the extra time rate to post a job.",
    };
  }

  const overage_rate =
    typeof overageRaw === "string" && overageRaw.trim() !== ""
      ? parseFloat(overageRaw)
      : 10;
  if (Number.isNaN(overage_rate) || overage_rate < 5) {
    return {
      error: "Extra time rate must be at least $5.00 per 30 minutes.",
    };
  }

  if (!AIRPORT_CODES.has(airport)) {
    return { error: "Please select a valid airport from the list." };
  }
  if (!terminal) {
    return { error: "Please select a terminal." };
  }
  if (!isValidTerminalForAirport(airport, terminal)) {
    return {
      error: "Please select a valid terminal for the chosen airport.",
    };
  }
  if (!(LINE_TYPES as readonly string[]).includes(line_type)) {
    return { error: "Please select a valid line type." };
  }
  if (!(ESTIMATED_WAIT_OPTIONS as readonly string[]).includes(estimated_wait)) {
    return { error: "Please select a valid estimated wait time." };
  }

  const offered_price =
    typeof priceRaw === "string" ? parseFloat(priceRaw) : Number(priceRaw);
  if (Number.isNaN(offered_price) || offered_price < 10) {
    return { error: "Offered price must be at least $10." };
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

  const meta = buildJobPaymentMetadata({
    customerId: user.id,
    customerEmail: user.email ?? null,
    airport,
    terminal,
    lineType: line_type,
    description,
    estimatedWait: estimated_wait,
    overageRate: overage_rate,
    offeredPrice: offered_price,
    overageAgreed: true,
  });

  const base = appBaseUrl();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: user.email ?? undefined,
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: "LineCrew line service",
            description: `${airport} · ${line_type}`,
          },
          unit_amount: Math.round(offered_price * 100),
        },
        quantity: 1,
      },
    ],
    metadata: { ...meta },
    payment_intent_data: {
      metadata: { ...meta },
    },
    success_url: `${base}/dashboard/customer/job-posted/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/dashboard/customer/post-job?cancelled=1`,
  });

  if (!session.url) {
    return { error: "Could not start checkout. Please try again." };
  }

  redirect(session.url);
  return null;
}
