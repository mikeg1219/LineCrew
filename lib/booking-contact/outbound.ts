/** Legacy re-exports — prefer `@/lib/twilio-contact-service` or `@/lib/contact-service`. */
export {
  executeBookingScopedContactOutbound,
  executeBookingScopedContactOutbound as executeBookingContactOutbound,
  type BookingContactDeliveryResult,
} from "@/lib/twilio-contact-service";

export type BookingOutboundResult =
  import("@/lib/twilio-contact-service").BookingContactDeliveryResult;
