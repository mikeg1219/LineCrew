import { isEmailVerifiedForApp } from "@/lib/auth-email-verified";

type OnboardingProfile = {
  onboarding_step?: number | null;
  role?: "customer" | "waiter" | null;
  email_verified_at?: string | null;
};

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
