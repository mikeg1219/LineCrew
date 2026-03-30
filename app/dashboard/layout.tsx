import { AuthenticatedAppHeader } from "@/components/authenticated-app-header";
import { isEmailVerifiedForApp } from "@/lib/auth-email-verified";
import { AVATAR_STORAGE_BUCKET, avatarPublicUrlWithBust } from "@/lib/avatar-storage";
import { createClient } from "@/lib/supabase/server";
import { ensureProfileForUser } from "@/lib/ensure-profile";
import { profileResolvedLabel } from "@/lib/profile-display-name";
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

  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!isEmailVerifiedForApp(profileErr ? null : profile, user)) {
    const q = new URLSearchParams({ pending: "1" });
    if (user.email) q.set("email", user.email);
    redirect(`/auth/verify-email?${q.toString()}`);
  }

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

  const displayName = profileResolvedLabel(
    profile ?? null,
    user.email,
    user.user_metadata as Record<string, unknown> | undefined
  );

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
