import { OnboardingProgress } from "@/app/onboarding/_components/onboarding-progress";
import { WaiterOnboardingProfileForm } from "@/app/onboarding/_components/waiter-onboarding-profile-form";
import { CenteredGradientCardShell } from "@/components/centered-gradient-card-shell";
import { isEmailVerifiedForApp } from "@/lib/auth-email-verified";
import { AVATAR_STORAGE_BUCKET, avatarPublicUrlWithBust } from "@/lib/avatar-storage";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function WaiterOnboardingProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) redirect("/onboarding");

  if (profile.role !== "waiter") {
    redirect("/dashboard/customer");
  }

  if (!isEmailVerifiedForApp(profile, user)) {
    redirect("/onboarding/verify");
  }

  if (Number(profile.onboarding_step ?? 0) >= 3) {
    redirect("/dashboard/waiter");
  }

  let avatarPublic: string | null = null;
  if (profile.avatar_url) {
    const { data } = supabase.storage.from(AVATAR_STORAGE_BUCKET).getPublicUrl(profile.avatar_url);
    avatarPublic = avatarPublicUrlWithBust(data.publicUrl, profile.updated_at ?? null);
  }

  return (
    <CenteredGradientCardShell>
      <div>
        <OnboardingProgress currentStep={3} title="Profile" />
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Set up your Line Holder profile
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Complete your profile to start accepting bookings
        </p>
        <div className="mt-6">
          <WaiterOnboardingProfileForm
            userId={user.id}
            initialAvatarUrl={avatarPublic}
          />
        </div>
      </div>
    </CenteredGradientCardShell>
  );
}
