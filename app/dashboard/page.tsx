import { DashboardFinishingSetup } from "@/app/dashboard/finishing-setup";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    return (
      <DashboardFinishingSetup
        userEmail={user.email ?? ""}
        errorMessage={`We couldn’t load your profile (${error.message}). Try again in a moment.`}
      />
    );
  }

  if (profile?.role === "customer" || profile?.role === "waiter") {
    redirect(`/dashboard/${profile.role}`);
  }

  return (
    <DashboardFinishingSetup
      userEmail={user.email ?? ""}
      errorMessage={null}
    />
  );
}
