import { isEmailVerifiedForApp } from "@/lib/auth-email-verified";
import { parseManualPayoutPreference } from "@/lib/waiter-profile-complete";
import type { User } from "@supabase/supabase-js";

/**
 * Progressive onboarding gates for the Line Holder dashboard progress UI.
 * DB columns (`gate*_unlocked`) can be stale or false while profile fields satisfy
 * the gate — we merge computed truth with explicit DB `true` flags.
 */
export type WaiterOnboardingGateProfile = {
  first_name?: string | null;
  phone?: string | null;
  bio?: string | null;
  serving_airports?: string[] | null;
  avatar_url?: string | null;
  email_verified_at?: string | null;
  stripe_payouts_enabled?: boolean | null;
  manual_payout_method?: string | null;
  contact_preference?: string | null;
  gate1_unlocked?: boolean | null;
  gate2_unlocked?: boolean | null;
  gate3_unlocked?: boolean | null;
};

export function hasPayoutMethodForGate3(
  profile: WaiterOnboardingGateProfile
): boolean {
  if (profile.stripe_payouts_enabled === true) return true;
  if (String(profile.manual_payout_method ?? "").trim()) return true;
  return parseManualPayoutPreference(profile.contact_preference) !== null;
}

/**
 * Field-based gates (aligns with supabase/progressive-onboarding-gates-migration.sql,
 * plus email on gate 1 for parity with WaiterOnboardingProgress checklist).
 */
export function computeWaiterOnboardingGatesFromFields(
  profile: WaiterOnboardingGateProfile | null,
  user: Pick<User, "email_confirmed_at" | "email">
): {
  gate1Unlocked: boolean;
  gate2Unlocked: boolean;
  gate3Unlocked: boolean;
} {
  if (!profile) {
    return { gate1Unlocked: false, gate2Unlocked: false, gate3Unlocked: false };
  }

  const emailVerified = isEmailVerifiedForApp(
    { email_verified_at: profile.email_verified_at ?? null },
    user
  );

  const g1Base = !!(profile.first_name?.trim() && profile.phone?.trim());
  const servingLen = Array.isArray(profile.serving_airports)
    ? profile.serving_airports.length
    : 0;

  const gate1Computed = !!(g1Base && emailVerified);

  const gate2Computed = !!(
    g1Base &&
    profile.bio?.trim() &&
    servingLen > 0
  );

  const gate3Computed = !!(
    gate2Computed &&
    hasPayoutMethodForGate3(profile)
  );

  return {
    gate1Unlocked: gate1Computed,
    gate2Unlocked: gate2Computed,
    gate3Unlocked: gate3Computed,
  };
}

export function resolveWaiterOnboardingGates(
  profile: WaiterOnboardingGateProfile | null,
  user: Pick<User, "email_confirmed_at" | "email">
): {
  gate1Unlocked: boolean;
  gate2Unlocked: boolean;
  gate3Unlocked: boolean;
} {
  const c = computeWaiterOnboardingGatesFromFields(profile, user);
  if (!profile) return c;

  return {
    gate1Unlocked: c.gate1Unlocked || profile.gate1_unlocked === true,
    gate2Unlocked: c.gate2Unlocked || profile.gate2_unlocked === true,
    gate3Unlocked: c.gate3Unlocked || profile.gate3_unlocked === true,
  };
}
