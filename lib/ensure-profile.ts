import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { UserRole } from "@/lib/types";

/**
 * When Supabase Auth already has a confirmed email but profiles.email_verified_at
 * is null (legacy users / missed trigger), copy the timestamp so RLS/UI stay consistent.
 */
export async function syncEmailVerifiedFromAuth(
  supabase: SupabaseClient,
  user: Pick<User, "id" | "email_confirmed_at">
): Promise<void> {
  if (!user.email_confirmed_at) return;
  const { data: row } = await supabase
    .from("profiles")
    .select("email_verified_at")
    .eq("id", user.id)
    .maybeSingle();
  if (row?.email_verified_at) return;
  await supabase
    .from("profiles")
    .update({ email_verified_at: user.email_confirmed_at })
    .eq("id", user.id);
}

export function roleFromUserMetadata(
  meta: Record<string, unknown> | undefined
): UserRole {
  const r = meta?.role;
  if (r === "waiter" || r === "customer") return r;
  return "customer";
}

/**
 * Ensures a profiles row exists for the signed-in user (trigger may have failed or user is legacy).
 * Safe to call repeatedly. Uses RLS insert policy when missing.
 */
export async function ensureProfileForUser(
  supabase: SupabaseClient,
  userId: string,
  userMetadata?: Record<string, unknown> | undefined
): Promise<void> {
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (data) {
    return;
  }

  const role = roleFromUserMetadata(userMetadata);
  const { error } = await supabase.from("profiles").insert({ id: userId, role });

  if (error && error.code !== "23505") {
    throw error;
  }
}
