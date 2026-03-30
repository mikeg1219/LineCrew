import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/supabase/constants";

/**
 * Server-only client with the service role key. Bypasses RLS — use only after
 * verifying the acting user (e.g. via cookie session + getUser()), and scope
 * mutations with `.eq("id", user.id)` where appropriate.
 */
export function createServiceRoleClient(): SupabaseClient | null {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!key || !SUPABASE_URL) return null;
  return createClient(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Service role client; throws if env is missing (admin APIs, webhooks, email).
 */
export function createAdminClient(): SupabaseClient {
  const c = createServiceRoleClient();
  if (!c) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL is not configured"
    );
  }
  return c;
}
