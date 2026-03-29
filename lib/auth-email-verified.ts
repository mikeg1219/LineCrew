import type { User } from "@supabase/supabase-js";

/** True when the user may access the app without the custom verify-email flow. */
export function isEmailVerifiedForApp(
  profile: { email_verified_at: string | null } | null,
  user: Pick<User, "email_confirmed_at">
): boolean {
  if (profile?.email_verified_at) return true;
  if (user.email_confirmed_at) return true;
  return false;
}
