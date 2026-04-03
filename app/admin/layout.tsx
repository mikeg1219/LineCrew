import { isAdminUser } from "@/lib/admin-config";
import { createClient } from "@/lib/supabase/server";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth?next=/admin");
  }

  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profileErr) {
    console.error("[admin/layout] profiles select:", profileErr.message);
  }

  const email = user.email ?? "";
  if (!isAdminUser(email)) {
    const role = profile?.role;
    const segment =
      role === "waiter" || role === "customer" ? role : "customer";
    redirect(`/dashboard/${segment}`);
  }

  return (
    <div className="linecrew-zone-admin relative min-h-screen bg-slate-900">
      <div
        className="pointer-events-none absolute right-4 top-4 z-[100] sm:right-6 sm:top-5"
        aria-hidden
      >
        <span className="inline-block rounded-md border border-red-600 bg-red-950 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-red-100 shadow-lg">
          ADMIN MODE
        </span>
      </div>
      {children}
    </div>
  );
}
