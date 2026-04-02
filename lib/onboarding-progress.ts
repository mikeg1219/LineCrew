import { isEmailVerifiedForApp } from "@/lib/auth-email-verified";

type OnboardingProfile = {
  onboarding_step?: number | null;
  role?: "customer" | "waiter" | null;
  email_verified_at?: string | null;
  created_at?: string | null;
};

/** UTC start of 2026-04-02 — accounts created before this skip onboarding enforcement. */
const LEGACY_ONBOARDING_CUTOFF_MS = Date.parse("2026-04-02T00:00:00.000Z");

/**
 * Pre-onboarding users: profile has a role and was created before the onboarding flow shipped.
 * They should use /dashboard/[role] and not be forced through /onboarding by middleware or auth.
 */
export function shouldSkipOnboardingAsLegacyUser(
  profile: OnboardingProfile | null
): boolean {
  if (!profile) return false;
  if (profile.role !== "customer" && profile.role !== "waiter") return false;
  const created = profile.created_at ? Date.parse(profile.created_at) : NaN;
  if (Number.isNaN(created)) return false;
  return created < LEGACY_ONBOARDING_CUTOFF_MS;
}

export function onboardingStepValue(step: number | null | undefined): number {
  if (typeof step !== "number" || Number.isNaN(step)) return 0;
  return Math.max(0, Math.min(3, Math.trunc(step)));
}

export function needsOnboardingRedirect(
  profile: OnboardingProfile | null,
  user: { email_confirmed_at?: string | null }
):
  | "/onboarding"
  | "/onboarding/verify"
  | "/onboarding/profile"
  | "/onboarding/profile/customer"
  | "/onboarding/profile/waiter"
  | null {
  if (shouldSkipOnboardingAsLegacyUser(profile)) return null;

  const step = onboardingStepValue(profile?.onboarding_step);
  if (step >= 3) return null;

  if (
    !isEmailVerifiedForApp(
      { email_verified_at: profile?.email_verified_at ?? null },
      user
    )
  ) {
    return "/onboarding/verify";
  }

  if (step === 0) {
    return "/onboarding";
  }

  if (profile?.role === "customer") {
    return "/onboarding/profile/customer";
  }
  if (profile?.role === "waiter") {
    return "/onboarding/profile/waiter";
  }
  return "/onboarding";
}
