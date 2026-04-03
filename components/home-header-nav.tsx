import { getBookingDraftCookie } from "@/lib/booking-draft-cookie";
import { createClient } from "@/lib/supabase/server";
import { HomeHeaderNavClient } from "@/components/home-header-nav-client";

/**
 * Marketing home header: server auth + client scroll / mobile menu (Uber/Airbnb-style).
 */
export async function HomeHeaderNav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profileRole: "customer" | "waiter" | null = null;
  let customerHasBookingDraft = false;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (profile?.role === "customer" || profile?.role === "waiter") {
      profileRole = profile.role;
    }
    if (profile?.role === "customer") {
      const draft = await getBookingDraftCookie();
      customerHasBookingDraft = draft != null;
    }
  }

  const dashboardHref =
    profileRole === "waiter"
      ? "/dashboard/waiter"
      : profileRole === "customer"
        ? "/dashboard/customer"
        : "/dashboard";

  return (
    <HomeHeaderNavClient
      isLoggedIn={!!user}
      customerHasBookingDraft={customerHasBookingDraft}
      dashboardHref={dashboardHref}
    />
  );
}
