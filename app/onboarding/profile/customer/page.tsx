import { CustomerOnboardingProfileForm } from "@/app/onboarding/_components/customer-onboarding-profile-form";
import { OnboardingProgress } from "@/app/onboarding/_components/onboarding-progress";
import { isEmailVerifiedForApp } from "@/lib/auth-email-verified";
import { AVATAR_STORAGE_BUCKET, avatarPublicUrlWithBust } from "@/lib/avatar-storage";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function CustomerOnboardingProfilePage() {
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

  if (profile.role !== "customer") {
    redirect("/dashboard/waiter");
  }

  if (!isEmailVerifiedForApp(profile, user)) {
    redirect("/onboarding/verify");
  }

  if (Number(profile.onboarding_step ?? 0) >= 3) {
    redirect("/dashboard/customer");
  }

  let avatarPublic: string | null = null;
  if (profile.avatar_url) {
    const { data } = supabase.storage.from(AVATAR_STORAGE_BUCKET).getPublicUrl(profile.avatar_url);
    avatarPublic = avatarPublicUrlWithBust(data.publicUrl, profile.updated_at ?? null);
  }

  return (
    <div className="mx-auto max-w-md">
      <OnboardingProgress currentStep={3} title="Profile" />
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
        Set up your profile
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        This helps Line Holders know who they&apos;re meeting
      </p>
      <div className="mt-6">
        <CustomerOnboardingProfileForm
          userId={user.id}
          initialAvatarUrl={avatarPublic}
        />
      </div>
    </div>
  );
}
