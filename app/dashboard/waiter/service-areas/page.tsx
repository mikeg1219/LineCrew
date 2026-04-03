import { ServiceAreasForm } from "@/app/dashboard/waiter/service-areas/service-areas-form";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function WaiterServiceAreasPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "waiter") redirect("/dashboard/customer");

  const selected = new Set(
    (profile as { serving_airports?: string[] | null }).serving_airports ?? []
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-2xl px-4 py-10">
      <Link
        href="/dashboard/waiter"
        className="text-sm font-medium text-blue-700 hover:text-blue-800"
      >
        ← Back to dashboard
      </Link>
      <h1 className="mt-6 text-2xl font-semibold text-slate-900">
        Service areas
      </h1>
      <p className="mt-2 text-slate-600">
        Choose where you want to receive nearby requests. You can update this
        anytime.
      </p>

      <ServiceAreasForm defaultSelected={selected} />
      </div>
    </div>
  );
}
