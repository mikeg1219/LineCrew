import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

/**
 * Marketing home header: Sign in when logged out; Dashboard when logged in (`/dashboard` routes by role).
 */
export async function HomeHeaderNav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const linkClass = "transition hover:text-white";
  /** Public marketing nav — Sign in / Dashboard as bordered CTAs (white on hero gradient). */
  const ctaClass =
    "inline-flex min-h-[44px] shrink-0 items-center rounded-lg border border-white/40 bg-white/10 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:border-white/55 hover:bg-white/20";

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
      <Link href="/dashboard/customer/post-job" className={linkClass}>
        Book
      </Link>
      <Link href="/auth?intent=waiter" className={linkClass}>
        Become a Line Holder
      </Link>
      {user ? (
        <Link href="/dashboard" className={ctaClass}>
          Dashboard
        </Link>
      ) : (
        <Link href="/auth" className={ctaClass}>
          Sign in
        </Link>
      )}
    </nav>
  );
}
