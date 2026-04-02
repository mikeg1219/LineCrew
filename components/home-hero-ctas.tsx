import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

/**
 * Hero primary CTAs: onboarding for guests, role dashboards for signed-in users.
 */
export async function HomeHeroCTAs() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let bookHref = "/onboarding?role=customer";
  let becomeHref = "/onboarding?role=waiter";

  if (user) {
    bookHref = "/dashboard/customer/post-job";
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    becomeHref =
      profile?.role === "waiter"
        ? "/dashboard/waiter"
        : "/onboarding?role=waiter";
  }

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
        <Link
          href={bookHref}
          className="rounded-2xl bg-white px-8 py-4 text-center text-sm font-bold text-blue-600 shadow-lg shadow-blue-900/15 transition hover:bg-blue-50 sm:text-base"
        >
          Book a Line Holder
        </Link>
        <Link
          href={becomeHref}
          className="rounded-2xl border-2 border-white bg-transparent px-8 py-4 text-center text-sm font-semibold text-white transition hover:bg-white/10 sm:text-base"
        >
          Start earning
        </Link>
      </div>
      <p className="mt-4 text-sm text-white/75">
        Already have an account?{" "}
        <Link
          href="/auth"
          className="font-medium text-white underline decoration-white/40 underline-offset-2 transition hover:text-white hover:decoration-white"
        >
          Sign in
        </Link>
      </p>
    </>
  );
}
