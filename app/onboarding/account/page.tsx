import { OnboardingAccountForm } from "@/app/onboarding/_components/onboarding-account-form";
import { OnboardingProgress } from "@/app/onboarding/_components/onboarding-progress";
import { parseAuthIntent } from "@/lib/auth-intent";
import { needsOnboardingRedirect } from "@/lib/onboarding-progress";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

type Props = {
  searchParams: Promise<{ intent?: string | string[]; role?: string | string[] }>;
};

export default async function OnboardingAccountPage({ searchParams }: Props) {
  const sp = await searchParams;
  const intent = parseAuthIntent(sp.role ?? sp.intent);
  if (!intent) redirect("/onboarding/role");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();
    const onboardingRedirect = needsOnboardingRedirect(profile ?? null, user);
    if (onboardingRedirect) {
      redirect(onboardingRedirect);
    }
    redirect(profile?.role === "waiter" ? "/dashboard/waiter" : "/dashboard/customer");
  }

  return (
    <div>
      <OnboardingProgress currentStep={1} title="Create account" />
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
        Create your account
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        You&apos;re signing up as a{" "}
        <span className="font-medium text-slate-800">
          {intent === "customer" ? "Customer" : "Line Holder"}
        </span>
      </p>
      <div className="mt-5">
        <OnboardingAccountForm role={intent} />
      </div>
    </div>
  );
}
