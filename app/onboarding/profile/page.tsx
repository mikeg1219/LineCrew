import { isEmailVerifiedForApp } from "@/lib/auth-email-verified";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function OnboardingProfilePage() {
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

  if (!isEmailVerifiedForApp(profile, user)) {
    redirect("/onboarding/verify");
  }
  if (Number(profile.onboarding_step ?? 0) >= 3) {
    redirect(profile.role === "waiter" ? "/dashboard/waiter" : "/dashboard/customer");
  }

  if (profile.role === "customer") {
    redirect("/onboarding/profile/customer");
  }
  redirect("/onboarding/profile/waiter");
}
