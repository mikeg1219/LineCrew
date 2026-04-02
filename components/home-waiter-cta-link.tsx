import type { ReactNode } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

/** Marketing “earn” destinations: onboarding for guests, waiter dashboard when applicable. */
export async function HomeWaiterCtaLink({
  className,
  children,
}: {
  className: string;
  children: ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let href = "/onboarding?role=waiter";
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (profile?.role === "waiter") {
      href = "/dashboard/waiter";
    }
  }

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
