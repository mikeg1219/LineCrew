import type Stripe from "stripe";

/** Stripe PaymentIntent.latest_charge may be an id string or expanded Charge. */
export function chargeIdFromPaymentIntent(pi: Stripe.PaymentIntent): string | null {
  const ch = pi.latest_charge;
  if (typeof ch === "string" && ch.trim()) return ch;
  if (ch && typeof ch === "object" && "id" in ch && typeof ch.id === "string") {
    return ch.id;
  }
  return null;
}
