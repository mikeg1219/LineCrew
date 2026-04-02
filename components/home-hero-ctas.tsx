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
          className="rounded-[14px] bg-white px-8 py-4 text-center text-sm font-bold text-[#1E4FAF] shadow-[0_16px_40px_rgba(30,79,175,0.12)] transition hover:bg-slate-100 sm:text-base"
        >
          Book a Line Holder
        </Link>
        <Link
          href={becomeHref}
          className="rounded-[14px] border border-white/40 bg-white/10 px-8 py-4 text-center text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20 sm:text-base"
        >
          Become a Line Holder
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
