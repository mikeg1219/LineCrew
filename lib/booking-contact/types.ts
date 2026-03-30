/**
 * Booking-scoped contact: who receives the outbound SMS (MVP one-way).
 * Full bidirectional masked relay is not implemented yet.
 */
export type BookingContactRecipientRole = "customer" | "waiter";

export type BookingContactDirection =
  | "customer_to_waiter"
  | "waiter_to_customer";
