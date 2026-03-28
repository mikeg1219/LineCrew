import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/supabase/constants";

/** Service role client for webhooks and trusted server tasks (bypasses RLS). */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. Add it to .env.local (Supabase → Project Settings → API)."
    );
  }
  return createClient(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
