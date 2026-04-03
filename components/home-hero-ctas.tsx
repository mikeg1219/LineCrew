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
    <div className="flex w-full flex-col items-center">
      <div className="flex w-full flex-col justify-center gap-3 sm:flex-row sm:justify-center">
        <Link
          href={bookHref}
          className="inline-flex min-h-[56px] w-full min-w-0 items-center justify-center rounded-2xl border-2 border-white bg-white px-8 py-4 text-center text-base font-bold text-blue-700 shadow-lg transition hover:bg-blue-50 sm:w-auto sm:min-w-[12rem]"
        >
          Book a Line Holder
        </Link>
        <Link
          href={becomeHref}
          className="inline-flex min-h-[56px] w-full min-w-0 items-center justify-center rounded-2xl border-2 border-white bg-transparent px-8 py-4 text-center text-base font-bold text-white transition hover:bg-white/15 sm:w-auto sm:min-w-[12rem]"
        >
          Start earning
        </Link>
      </div>
      <p className="mt-4 text-center text-sm text-white/80">
        Already have an account?{" "}
        <Link
          href="/auth"
          className="font-semibold text-white underline decoration-white underline-offset-2 transition hover:text-white"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
