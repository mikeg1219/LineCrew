import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role === "customer" || profile?.role === "waiter") {
    redirect(`/dashboard/${profile.role}`);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
        Finishing setup
      </h1>
      <p className="mt-3 text-slate-600">
        {error
          ? `We couldn’t load your profile (${error.message}). Try again in a moment.`
          : "Your profile row isn’t ready yet. This usually resolves after a few seconds — refresh the page. If it keeps happening, confirm the database trigger in Supabase ran for new users."}
      </p>
      <p className="mt-6 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700">
        <span className="font-medium text-slate-800">Signed in as</span>{" "}
        {user.email}
      </p>
    </div>
  );
}
