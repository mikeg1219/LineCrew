/**
 * Templates for booking-scoped SMS from LineCrew’s Twilio number.
 *
 * MVP: one-way outbound notification. True masked bidirectional relay
 * (dedicated proxy numbers, session bridging) is not implemented — wire here later.
 */

const MAX_BODY = 480;

function truncate(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

export function buildBookingContactSmsBody(params: {
  jobShortRef: string;
  senderLabel: string;
  /** e.g. "Traveler" | "Line Holder" */
  senderRoleLabel: string;
  optionalNote: string;
}): string {
  const ref = truncate(params.jobShortRef, 12);
  const name = truncate(params.senderLabel, 40);
  const role = truncate(params.senderRoleLabel, 24);
  const note = truncate(params.optionalNote, 120);

  let body = `LineCrew [${ref}]: ${name} (${role}) sent a message about your booking. Open LineCrew to view details.`;
  if (note) {
    body += ` Note: ${note}`;
  }
  return truncate(body, MAX_BODY);
}
