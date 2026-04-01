"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { buildProfileSettingsSupabasePayload } from "@/lib/profile-settings-payload";
import type { UserRole } from "@/lib/types";
import { isValidE164ForStorage, normalizePhoneE164 } from "@/lib/phone";
import { revalidatePath } from "next/cache";
import { BOOKING_CATEGORIES } from "@/lib/jobs/options";

export type SaveProfileSettingsInput = {
  firstName: string;
  displayName: string;
  phoneCountryId: string;
  phoneNationalDigits: string;
  role: UserRole;
  preferredAirport: string;
  travelerNotes: string;
  bio: string;
  homeAirport: string;
  servingAirportsText: string;
  waiterPreferredCategories: string[];
  isAvailable: boolean;
  avatarStoragePath: string | null;
  waiterManualPayoutPreference?: string | null;
};

export type SaveProfileSettingsResult =
  | { ok: true }
  | { ok: false; phoneError: string }
  | { ok: false; kind: "auth" | "save" };

function devLogProfileSave(
  label: string,
  data: Record<string, unknown>
): void {
  if (process.env.NODE_ENV !== "development") return;
  console.error(`[profile/save] ${label}`, data);
}

function sanitizePayload(
  p: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(p)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}

export async function saveProfileSettingsAction(
  input: SaveProfileSettingsInput
): Promise<SaveProfileSettingsResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    devLogProfileSave("auth", { message: authErr?.message });
    return { ok: false, kind: "auth" };
  }

  const { data: profileRow, error: profileErr } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profileErr || !profileRow) {
    devLogProfileSave("profile_select", {
      code: profileErr?.code,
      message: profileErr?.message,
      details: profileErr?.details,
      userId: user.id,
    });
    return { ok: false, kind: "save" };
  }

  const dbRole = profileRow.role as UserRole;
  if (input.role != null && input.role !== dbRole) {
    devLogProfileSave("role_mismatch", { inputRole: input.role, dbRole });
    return { ok: false, kind: "auth" };
  }

  const phoneNorm = normalizePhoneE164(
    input.phoneCountryId,
    input.phoneNationalDigits
  );
  if (!phoneNorm.ok) {
    return { ok: false, phoneError: phoneNorm.message };
  }
  const ph = phoneNorm.e164;
  if (!isValidE164ForStorage(ph)) {
    return { ok: false, phoneError: "Enter a valid phone number." };
  }

  const fn = input.firstName.trim();
  const dn = input.displayName.trim();
  const profile_completed = Boolean(fn && dn && ph);

  const shared = {
    first_name: fn || null,
    display_name: dn || null,
    full_name: dn || null,
    phone: ph,
    profile_completed,
  };

  const parts = input.servingAirportsText
    .split(/[,;\s]+/)
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
  const unique = [...new Set(parts)];
  const preferredCategories = [...new Set(input.waiterPreferredCategories)]
    .filter((c): c is string => (BOOKING_CATEGORIES as readonly string[]).includes(c));

  const payload = sanitizePayload(
    buildProfileSettingsSupabasePayload(
      dbRole,
      shared,
      {
        preferred_airport: input.preferredAirport.trim() || null,
        traveler_notes: input.travelerNotes.trim() || null,
      },
      {
        bio: input.bio.trim() || null,
        home_airport: input.homeAirport.trim() || null,
        serving_airports: unique,
        preferred_categories: preferredCategories,
        is_available: input.isAvailable,
        contact_preference: input.waiterManualPayoutPreference ?? null,
        onboarding_completed: Boolean(
          fn &&
            ph &&
            input.bio.trim() &&
            unique.length > 0 &&
            input.avatarStoragePath
        ),
      }
    ) as Record<string, unknown>
  );

  const service = createServiceRoleClient();
  const clientForUpdate = service ?? supabase;

  devLogProfileSave("payload", {
    keys: Object.keys(payload),
    eqColumn: "id",
    eqValue: user.id,
    usingServiceRole: Boolean(service),
    phoneLen: typeof payload.phone === "string" ? payload.phone.length : 0,
    payloadPreview: payload,
  });
  payload.updated_at = new Date().toISOString();
  let { data: updatedRows, error } = await clientForUpdate
    .from("profiles")
    .update(payload)
    .eq("id", user.id)
    .select("id");

  if (error && typeof payload.preferred_categories !== "undefined") {
    const msg = (error.message ?? "").toLowerCase();
    const details = (error.details ?? "").toLowerCase();
    const missingPreferredCategories =
      msg.includes("preferred_categories") || details.includes("preferred_categories");
    if (missingPreferredCategories) {
      const retryPayload = { ...payload };
      delete retryPayload.preferred_categories;
      ({ data: updatedRows, error } = await clientForUpdate
        .from("profiles")
        .update(retryPayload)
        .eq("id", user.id)
        .select("id"));
    }
  }

if (error) {
    console.error("[profile/save] supabase_update", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
      keys: Object.keys(payload),
      usingServiceRole: Boolean(service),
    });
    return { ok: false, kind: "save" };
  }

  const rowCount = updatedRows?.length ?? 0;
  if (rowCount === 0) {
    console.error("[profile/save] zero_rows", {
      userId: user.id,
      keys: Object.keys(payload),
      usingServiceRole: Boolean(service),
    });
    return { ok: false, kind: "save" };
  }

  revalidatePath("/dashboard/profile");
  revalidatePath("/dashboard/customer");
  revalidatePath("/dashboard/waiter");

  return { ok: true };
}
