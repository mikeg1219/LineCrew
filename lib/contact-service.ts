/**
 * Booking-scoped contact (server-side). Re-export from `twilio-contact-service`.
 * Do not import recipient phone into client components.
 */

export {
  executeBookingScopedContactOutbound,
  getBookingContactScope,
  isTwilioEnvConfigured,
  type BookingContactDeliveryResult,
} from "./twilio-contact-service";
