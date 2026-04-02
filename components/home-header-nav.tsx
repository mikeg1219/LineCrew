import Link from "next/link";
import { getBookingDraftCookie } from "@/lib/booking-draft-cookie";
import { createClient } from "@/lib/supabase/server";

/**
 * Marketing home header: Sign in → /auth; Get started → /onboarding; Dashboard by role when logged in.
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

  const linkClass = "transition hover:text-white";
  const ctaClass =
    "inline-flex min-h-[44px] shrink-0 items-center rounded-lg border border-white/40 bg-white/10 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:border-white/55 hover:bg-white/20";
  const reviewCtaClass =
    "inline-flex min-h-[44px] shrink-0 items-center rounded-lg border border-amber-200/80 bg-amber-400/20 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-400/30";

  return (
    <nav
      className="flex max-w-[min(100%,28rem)] flex-wrap items-center justify-end gap-x-3 gap-y-2 text-sm text-white/90 sm:max-w-none sm:gap-x-4"
      aria-label="Site"
    >
      <a href="#categories" className={linkClass}>
        Categories
      </a>
      <a href="#how-it-works-heading" className={linkClass}>
        How It Works
      </a>
      {user && customerHasBookingDraft ? (
        <Link href="/dashboard/customer/booking-review" className={reviewCtaClass}>
          Continue to review
        </Link>
      ) : null}
      {user ? (
        <Link href={dashboardHref} className={ctaClass}>
          Dashboard
        </Link>
      ) : (
        <>
          <Link href="/auth" className={ctaClass}>
            Sign in
          </Link>
          <Link href="/onboarding" className={ctaClass}>
            Get started
          </Link>
        </>
      )}
    </nav>
  );
}
