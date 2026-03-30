import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserRole } from "@/lib/types";

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

  if (data) return;

  const role = roleFromUserMetadata(userMetadata);
  const { error } = await supabase.from("profiles").insert({ id: userId, role });

  if (error && error.code !== "23505") {
    throw error;
  }
}
