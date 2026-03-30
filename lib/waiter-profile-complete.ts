import type { User } from "@supabase/supabase-js";

import { isEmailVerifiedForApp } from "@/lib/auth-email-verified";
import {
  profileHasResolvableName,
  type ProfileNameFields,
} from "@/lib/profile-display-name";

export type WaiterProfileGateRow = ProfileNameFields & {
  avatar_url?: string | null;
  phone?: string | null;
  bio?: string | null;
  serving_airports?: string[] | null;
  onboarding_completed?: boolean | null;
  email_verified_at?: string | null;
};

/** Profile row including Stripe for accept / earning gates */
export type WaiterAcceptGateRow = WaiterProfileGateRow & {
  stripe_account_id?: string | null;
};

export function waiterCoreFieldsComplete(p: WaiterProfileGateRow): boolean {
  const airports = p.serving_airports?.filter(Boolean) ?? [];
  return (
    profileHasResolvableName(p) &&
    Boolean(p.avatar_url?.trim()) &&
    Boolean(p.phone?.trim()) &&
    Boolean(p.bio?.trim()) &&
    airports.length > 0
  );
}

/** Photo, phone, bio, and onboarding — excludes airports and email verification. */
export function waiterProfileBasicsAndOnboardingComplete(
  p: WaiterProfileGateRow
): boolean {
  return (
    profileHasResolvableName(p) &&
    Boolean(p.avatar_url?.trim()) &&
    Boolean(p.phone?.trim()) &&
    Boolean(p.bio?.trim()) &&
    p.onboarding_completed === true
  );
}

export function isWaiterProfileComplete(p: WaiterProfileGateRow): boolean {
  return (
    waiterCoreFieldsComplete(p) &&
    p.onboarding_completed === true &&
    Boolean(p.email_verified_at)
  );
}

/**
 * Ready to accept bookings: verified email (app rules), profile + airports,
 * onboarding, and Stripe Connect for payouts.
 */
export function isWaiterAcceptSetupComplete(
  p: WaiterAcceptGateRow | null,
  user: Pick<User, "email_confirmed_at">
): boolean {
  if (!p) return false;
  if (
    !isEmailVerifiedForApp(
      { email_verified_at: p.email_verified_at ?? null },
      user
    )
  ) {
    return false;
  }
  if (!waiterCoreFieldsComplete(p)) return false;
  if (p.onboarding_completed !== true) return false;
  if (!String(p.stripe_account_id ?? "").trim()) return false;
  return true;
}

/** One-line hint for disabled Accept actions (browse / job preview). */
export function waiterAcceptSetupShortfallMessage(
  p: WaiterAcceptGateRow | null,
  user: Pick<User, "email_confirmed_at">
): string {
  if (!p) {
    return "Finish setup on your dashboard before accepting.";
  }
  if (isWaiterAcceptSetupComplete(p, user)) return "";
  if (
    !isEmailVerifiedForApp(
      { email_verified_at: p.email_verified_at ?? null },
      user
    )
  ) {
    return "Verify your email before accepting bookings.";
  }
  if (
    !profileHasResolvableName(p) ||
    !String(p.avatar_url ?? "").trim() ||
    !String(p.phone ?? "").trim() ||
    !String(p.bio ?? "").trim()
  ) {
    return "Add your photo, phone, and bio in Profile before accepting.";
  }
  if ((p.serving_airports?.filter(Boolean) ?? []).length === 0) {
    return "Select at least one airport before accepting.";
  }
  if (p.onboarding_completed !== true) {
    return "Finish Line Holder onboarding in Profile before accepting.";
  }
  if (!String(p.stripe_account_id ?? "").trim()) {
    return "Connect payouts on your dashboard before accepting bookings.";
  }
  return "Finish setup on your dashboard before accepting.";
}
