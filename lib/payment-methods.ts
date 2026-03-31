export type PaymentMethodCode =
  | "stripe_card"
  | "stripe_apple_pay"
  | "stripe_google_pay"
  | "stripe_link"
  | "stripe_wallet_qr"
  | "external_paypal"
  | "external_cash_app"
  | "external_zelle"
  | "external_other";

export const PAYMENT_METHOD_LABEL: Record<PaymentMethodCode, string> = {
  stripe_card: "Card on file (Stripe)",
  stripe_apple_pay: "Apple Pay (via Stripe)",
  stripe_google_pay: "Google Pay (via Stripe)",
  stripe_link: "Link (Stripe saved payment)",
  stripe_wallet_qr: "QR code (Stripe-hosted page)",
  external_paypal: "PayPal (manual / future)",
  external_cash_app: "Cash App (manual / future)",
  external_zelle: "Zelle (manual / future)",
  external_other: "Other manual method",
};

export function isStripeBasedMethod(code: PaymentMethodCode): boolean {
  return (
    code === "stripe_card" ||
    code === "stripe_apple_pay" ||
    code === "stripe_google_pay" ||
    code === "stripe_link" ||
    code === "stripe_wallet_qr"
  );
}

