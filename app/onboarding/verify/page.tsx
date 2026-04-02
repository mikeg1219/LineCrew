import { OnboardingProgress } from "@/app/onboarding/_components/onboarding-progress";
import { OnboardingVerifyForm } from "@/app/onboarding/_components/onboarding-verify-form";
import { isEmailVerifiedForApp } from "@/lib/auth-email-verified";
import { parseAuthIntent } from "@/lib/auth-intent";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types";
import { redirect } from "next/navigation";

type Props = {
  searchParams: Promise<{ role?: string | string[]; intent?: string | string[]; email?: string | string[] }>;
};

export default async function OnboardingVerifyAliasPage({ searchParams }: Props) {
  const sp = await searchParams;
  const role =
    parseAuthIntent(sp.role ?? sp.intent) ??
    ("customer" as UserRole);
  const emailRaw = sp.email;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/onboarding/account?role=${encodeURIComponent(role)}`);
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  const initialEmail = (Array.isArray(emailRaw) ? emailRaw[0] : emailRaw) ?? user.email ?? "";
  const initiallyVerified = isEmailVerifiedForApp(profile ?? null, user);
  if (initiallyVerified) {
    await supabase
      .from("profiles")
      .update({
        onboarding_step: Math.max(Number(profile?.onboarding_step ?? 0), 2),
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);
  }

  return (
    <div>
      <OnboardingProgress currentStep={2} title="Verify email" />
      <OnboardingVerifyForm
        role={role}
        initialEmail={initialEmail}
        initiallyVerified={initiallyVerified}
      />
    </div>
  );
}
