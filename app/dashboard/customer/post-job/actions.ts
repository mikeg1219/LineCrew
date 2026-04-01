"use server";

import { AIRPORT_CODES } from "@/lib/airports";
import { isValidTerminalForAirport } from "@/lib/airport-terminals";
import { appBaseUrl } from "@/lib/app-url";
import {
  BOOKING_CATEGORIES,
  ESTIMATED_WAIT_OPTIONS,
  LINE_TYPES,
} from "@/lib/jobs/options";
import { buildJobPaymentMetadata } from "@/lib/stripe-job-metadata";
import { getStripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type Stripe from "stripe";

export type PostJobState = { error: string } | null;

const DEFAULT_CHECKOUT_METHODS = [
  "card",
  "link",
  "cashapp",
  "klarna",
  "amazon_pay",
  "us_bank_account",
] as const;

function checkoutMethodsFromEnv(): string[] {
  const raw = process.env.STRIPE_CHECKOUT_PAYMENT_METHOD_TYPES?.trim();
  const configured =
    raw && raw.length > 0
      ? raw
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean)
      : [...DEFAULT_CHECKOUT_METHODS];

  const disableLink = process.env.STRIPE_CHECKOUT_DISABLE_LINK === "true";
  const next = disableLink ? configured.filter((m) => m !== "link") : configured;
  return next.length > 0 ? next : ["card"];
}

function methodsForSelectedPaymentMethod(code: string): string[] {
  // Wallets (Apple/Google) and Link are part of Stripe Checkout's supported set.
  // We still request the broad configured set for these.
  if (
    code === "stripe_card" ||
    code === "stripe_apple_pay" ||
    code === "stripe_google_pay" ||
    code === "stripe_link" ||
    code === "stripe_wallet_qr"
  ) {
    return checkoutMethodsFromEnv();
  }
  // Try method-specific preference first, then fallback will keep checkout alive.
  if (code === "external_paypal") return ["paypal", "card"];
  if (code === "external_cash_app") return ["cashapp", "card"];
  // Zelle / custom are not direct Stripe Checkout rails.
  return ["card"];
}

async function createCheckoutSessionWithFallback(
  stripe: Stripe,
  params: Stripe.Checkout.SessionCreateParams,
  paymentMethodCode: string
) {
  const methods = methodsForSelectedPaymentMethod(paymentMethodCode);
  try {
    return await stripe.checkout.sessions.create({
      ...params,
      payment_method_types:
        methods as unknown as Stripe.Checkout.SessionCreateParams.PaymentMethodType[],
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const isMethodConfigIssue =
      /payment_method_types|not supported|unknown payment method|invalid/i.test(msg);
    if (!isMethodConfigIssue) throw e;

    // Safe fallback so checkout still works if account/mode/currency doesn't support a method.
    return await stripe.checkout.sessions.create({
      ...params,
      payment_method_types: ["card"],
    });
  }
}

export async function postJobAction(
  _prev: PostJobState,
  formData: FormData
): Promise<PostJobState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to post a booking." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "customer") {
    return { error: "Only customers can post bookings." };
  }

  const airport = String(formData.get("airport") ?? "").trim();
  const terminal = String(formData.get("terminal") ?? "").trim();
  const booking_category = String(formData.get("booking_category") ?? "").trim();
  const venue_location = String(formData.get("venue_location") ?? "").trim();
  const event_queue_name = String(formData.get("event_queue_name") ?? "").trim();
  const line_type = String(formData.get("line_type") ?? "");
  const descriptionRaw = String(formData.get("description") ?? "");
  const urgency_type = String(formData.get("urgency_type") ?? "asap").trim();
  const urgency_schedule = String(formData.get("urgency_schedule") ?? "").trim();
  const airline = String(formData.get("airline") ?? "").trim();
  const flight_number = String(formData.get("flight_number") ?? "").trim();
  const exact_location = String(formData.get("exact_location") ?? "").trim();
  const payment_method_code_raw = String(
    formData.get("payment_method_code") ?? ""
  ).trim();

  const urgencyLabels: Record<string, string> = {
    asap: "ASAP (within 15 minutes)",
    soon: "Soon (30–60 minutes)",
    schedule: "Scheduled",
  };
  if (!(urgency_type in urgencyLabels)) {
    return { error: "Please select when you need your Line Holder." };
  }

  const lines: string[] = [];
  if (booking_category) lines.push(`Category: ${booking_category}`);
  if (event_queue_name) lines.push(`Queue/event: ${event_queue_name}`);
  if (venue_location) lines.push(`Venue/location: ${venue_location}`);
  lines.push(`When needed: ${urgencyLabels[urgency_type]}`);
  if (urgency_type === "schedule" && urgency_schedule) {
    lines.push(`Scheduled for: ${urgency_schedule}`);
  }
  if (airline) lines.push(`Airline: ${airline}`);
  if (flight_number) lines.push(`Flight: ${flight_number}`);
  if (exact_location) lines.push(`Exact location: ${exact_location}`);
  if (descriptionRaw.trim()) {
    lines.push("");
    lines.push(descriptionRaw.trim());
  }
  const description = lines.join("\n");
  const priceRaw = formData.get("offered_price");
  const overageRaw = formData.get("overage_rate");
  const overageAgreed = formData.get("overage_agreed") === "on";
  const estimated_wait = String(formData.get("estimated_wait") ?? "");

  if (!overageAgreed) {
    return {
      error:
        "You must agree to the extra time rate to post a booking.",
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

  if (!(BOOKING_CATEGORIES as readonly string[]).includes(booking_category)) {
    return { error: "Please choose a request category." };
  }
  const isAirportCategory = booking_category === "Airports";
  if (isAirportCategory) {
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
  } else if (!venue_location) {
    return { error: "Please add a venue or location for this request." };
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
    airport: isAirportCategory ? airport : venue_location,
    terminal: isAirportCategory ? terminal : "General queue",
    lineType: line_type,
    description,
    estimatedWait: estimated_wait,
    overageRate: overage_rate,
    offeredPrice: offered_price,
    overageAgreed: true,
    paymentMethodCode:
      payment_method_code_raw || "stripe_card",
  });

  const base = appBaseUrl();

  const chosenPaymentMethod = payment_method_code_raw || "stripe_card";
  const session = await createCheckoutSessionWithFallback(
    stripe,
    {
    mode: "payment",
    customer_email: user.email ?? undefined,
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: "LineCrew booking",
            description: `${isAirportCategory ? airport : venue_location} · ${line_type}`,
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
    },
    chosenPaymentMethod
  );

  if (!session.url) {
    return { error: "Could not start checkout. Please try again." };
  }

  redirect(session.url);
  return null;
}
