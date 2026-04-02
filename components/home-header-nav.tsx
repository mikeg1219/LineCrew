import Image from "next/image";
import Link from "next/link";
import { getBookingDraftCookie } from "@/lib/booking-draft-cookie";
import { createClient } from "@/lib/supabase/server";

/**
 * Marketing home header: logo + How it works, Sign in (text), Get started (CTA) when logged out.
 * Logged-in users: logo to role dashboard + optional booking draft CTA.
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

  const linkMuted = "text-sm font-medium text-white/90 transition hover:text-white";
  const ctaClass =
    "inline-flex min-h-[44px] shrink-0 items-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-900/20 transition hover:bg-blue-500";

  return (
    <div className="flex w-full items-center justify-between gap-4">
      <Link href="/" className="inline-flex shrink-0 items-center transition hover:opacity-90">
        <Image
          src="/linecrew-logo.png"
          alt="LineCrew.ai"
          width={180}
          height={54}
          className="h-8 w-auto"
          priority
        />
      </Link>

      <nav
        className="flex max-w-[min(100%,22rem)] flex-wrap items-center justify-end gap-x-4 gap-y-2 sm:max-w-none sm:gap-x-6"
        aria-label="Site"
      >
        {user && customerHasBookingDraft ? (
          <Link
            href="/dashboard/customer/booking-review"
            className="inline-flex min-h-[40px] shrink-0 items-center rounded-lg border border-amber-200/80 bg-amber-400/20 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-amber-400/30 sm:text-sm"
          >
            Continue to review
          </Link>
        ) : null}

        {user ? (
          <Link href={dashboardHref} className={linkMuted}>
            Open app
          </Link>
        ) : (
          <>
            <Link href="/#how-it-works" className={linkMuted}>
              How it works
            </Link>
            <Link href="/auth" className={linkMuted}>
              Sign in
            </Link>
            <Link href="/onboarding" className={ctaClass}>
              Get started
            </Link>
          </>
        )}
      </nav>
    </div>
  );
}
