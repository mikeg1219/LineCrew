/** True when the user may access the app without the custom verify-email flow. */
export function isEmailVerifiedForApp(
  profile: { email_verified_at: string | null | undefined } | null,
  user: { email_confirmed_at?: string | null }
): boolean {
  if (profile?.email_verified_at) return true;
  if (user.email_confirmed_at) return true;
  return false;
}
