import { AuthenticatedAppHeader } from "@/components/authenticated-app-header";
import { AVATAR_STORAGE_BUCKET, avatarPublicUrlWithBust } from "@/lib/avatar-storage";
import { createClient } from "@/lib/supabase/server";
import { ensureProfileForUser } from "@/lib/ensure-profile";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  await ensureProfileForUser(
    supabase,
    user.id,
    user.user_metadata as Record<string, unknown> | undefined
  );

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, first_name, full_name, avatar_url, updated_at")
    .eq("id", user.id)
    .maybeSingle();

  let avatarPublic: string | null = null;
  if (profile?.avatar_url) {
    const { data: pub } = supabase.storage
      .from(AVATAR_STORAGE_BUCKET)
      .getPublicUrl(profile.avatar_url);
    avatarPublic = avatarPublicUrlWithBust(
      pub.publicUrl,
      profile.updated_at ?? null
    );
  }

  const displayName =
    profile?.first_name?.trim() ||
    profile?.full_name?.trim() ||
    user.email?.split("@")[0] ||
    "Account";

  const role =
    profile?.role === "waiter" || profile?.role === "customer"
      ? profile.role
      : null;

  return (
    <div className="flex min-h-full flex-col bg-gradient-to-b from-slate-50 to-white">
      <AuthenticatedAppHeader
        email={user.email ?? null}
        role={role}
        avatarUrl={avatarPublic}
        displayName={displayName}
      />
      <main className="flex-1">{children}</main>
    </div>
  );
}
