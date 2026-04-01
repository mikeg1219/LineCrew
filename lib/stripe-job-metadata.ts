/** Stripe metadata values are limited to 500 characters each. */
const MAX_META = 500;

export type JobCheckoutMetadata = {
  customer_id: string;
  customer_email: string;
  airport: string;
  terminal: string;
  line_type: string;
  description: string;
  estimated_wait: string;
  overage_rate: string;
  offered_price: string;
  overage_agreed: string;
  payment_method_code?: string;
  booking_terms_acknowledged_at?: string;
  booking_disclaimer_acknowledged_at?: string;
  category_disclaimer_version?: string;
  refund_policy_version?: string;
};

export function buildJobPaymentMetadata(input: {
  customerId: string;
  customerEmail: string | null;
  airport: string;
  terminal: string;
  lineType: string;
  description: string;
  estimatedWait: string;
  overageRate: number;
  offeredPrice: number;
  overageAgreed: boolean;
  paymentMethodCode?: string | null;
  bookingTermsAcknowledgedAt?: string | null;
  bookingDisclaimerAcknowledgedAt?: string | null;
  categoryDisclaimerVersion?: string | null;
  refundPolicyVersion?: string | null;
}): JobCheckoutMetadata {
  const description =
    input.description.trim().length > MAX_META
      ? `${input.description.trim().slice(0, MAX_META - 3)}...`
      : input.description.trim();

  return {
    customer_id: input.customerId,
    customer_email: input.customerEmail ?? "",
    airport: input.airport,
    terminal: input.terminal,
    line_type: input.lineType,
    description,
    estimated_wait: input.estimatedWait,
    overage_rate: input.overageRate.toFixed(2),
    offered_price: input.offeredPrice.toFixed(2),
    overage_agreed: input.overageAgreed ? "true" : "false",
    payment_method_code: input.paymentMethodCode ?? undefined,
    booking_terms_acknowledged_at: input.bookingTermsAcknowledgedAt ?? undefined,
    booking_disclaimer_acknowledged_at:
      input.bookingDisclaimerAcknowledgedAt ?? undefined,
    category_disclaimer_version: input.categoryDisclaimerVersion ?? undefined,
    refund_policy_version: input.refundPolicyVersion ?? undefined,
  };
}
