import { validatePositiveUsdAmount } from "@/lib/server-input";
import { appBaseUrl } from "@/lib/app-url";
import type { BookingDraftV1 } from "@/lib/booking-draft-cookie";
import { POLICY_VERSIONS } from "@/lib/legal";
import { buildJobPaymentMetadata } from "@/lib/stripe-job-metadata";
import { getStripe } from "@/lib/stripe";
import type Stripe from "stripe";

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
  if (
    code === "stripe_card" ||
    code === "stripe_apple_pay" ||
    code === "stripe_google_pay" ||
    code === "stripe_link" ||
    code === "stripe_wallet_qr"
  ) {
    return checkoutMethodsFromEnv();
  }
  if (code === "external_paypal") return ["paypal", "card"];
  if (code === "external_cash_app") return ["cashapp", "card"];
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

    return await stripe.checkout.sessions.create({
      ...params,
      payment_method_types: ["card"],
    });
  }
}

export type BookingCheckoutUser = {
  id: string;
  email: string | null;
};

/**
 * Create a Stripe Checkout session for a validated booking draft.
 * `acknowledgedAt` is ISO time for terms/disclaimer metadata.
 */
export async function createBookingCheckoutSession(
  draft: BookingDraftV1,
  user: BookingCheckoutUser,
  acknowledgedAt: string
): Promise<{ url: string } | { error: string }> {
  let stripe: ReturnType<typeof getStripe>;
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

  const priceCheck = validatePositiveUsdAmount(draft.offered_price, {
    min: 10,
    fieldLabel: "Offered price",
  });
  if (!priceCheck.ok) return { error: priceCheck.error };
  const overageCheck = validatePositiveUsdAmount(draft.overage_rate, {
    min: 5,
    fieldLabel: "Extra time rate",
  });
  if (!overageCheck.ok) return { error: overageCheck.error };

  const isAirportCategory = draft.booking_category === "Airports";
  const meta = buildJobPaymentMetadata({
    customerId: user.id,
    customerEmail: user.email ?? null,
    airport: isAirportCategory ? draft.airport : draft.venue_location,
    terminal: isAirportCategory ? draft.terminal : "General queue",
    lineType: draft.line_type,
    description: draft.description,
    estimatedWait: draft.estimated_wait,
    overageRate: overageCheck.value,
    offeredPrice: priceCheck.value,
    overageAgreed: draft.overage_agreed,
    paymentMethodCode: draft.payment_method_code || "stripe_card",
    bookingTermsAcknowledgedAt: acknowledgedAt,
    bookingDisclaimerAcknowledgedAt: acknowledgedAt,
    categoryDisclaimerVersion: draft.category_disclaimer_version,
    refundPolicyVersion: POLICY_VERSIONS.refund,
  });

  const base = appBaseUrl();
  const chosenPaymentMethod = draft.payment_method_code || "stripe_card";
  const locationLabel = isAirportCategory ? draft.airport : draft.venue_location;

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
              description: `${locationLabel} · ${draft.line_type}`,
            },
            unit_amount: Math.round(priceCheck.value * 100),
          },
          quantity: 1,
        },
      ],
      metadata: { ...meta },
      payment_intent_data: {
        metadata: { ...meta },
      },
      success_url: `${base}/dashboard/customer/job-posted/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/dashboard/customer/booking-review?cancelled=1`,
    },
    chosenPaymentMethod
  );

  if (!session.url) {
    return { error: "Could not start checkout. Please try again." };
  }

  return { url: session.url };
}
