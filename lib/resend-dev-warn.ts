/** One-shot dev hint when Resend is not configured (does not run in production). */
let warnedMissingKey = false;

export function warnDevIfResendKeyMissing(context: string): void {
  if (process.env.NODE_ENV !== "development" || warnedMissingKey) {
    return;
  }
  warnedMissingKey = true;
  console.warn(
    `[resend] RESEND_API_KEY is not set — ${context}. Add it to .env.local (see .env.example).`
  );
}
