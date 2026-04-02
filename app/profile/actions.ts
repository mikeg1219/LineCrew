"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureProfileForUser } from "@/lib/ensure-profile";
import { buildProfileSettingsSupabasePayload } from "@/lib/profile-settings-payload";
import type { UserRole } from "@/lib/types";
import { isValidE164ForStorage, normalizePhoneE164 } from "@/lib/phone";
import { revalidatePath } from "next/cache";
import { BOOKING_CATEGORIES } from "@/lib/jobs/options";
import { POLICY_VERSIONS } from "@/lib/legal";
import {
  buildManualPayoutPreference,
  type ManualPayoutMethod,
} from "@/lib/waiter-profile-complete";
import {
  clipToMaxLength,
  MAX_PROFILE_BIO_CHARS,
} from "@/lib/server-input";
import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

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
  waiterIndependentContractorConfirmed?: boolean;
  waiterTaxResponsibilityConfirmed?: boolean;
};

const SESSION_MESSAGE =
  "Session expired — please sign in again.";
const DATABASE_MESSAGE =
  "Could not save — please try again.";

export type SaveProfileSettingsResult =
  | { ok: true }
  | { ok: false; phoneError: string }
  | { ok: false; kind: "session"; message: string }
  | { ok: false; kind: "database"; message: string };

function logProfileSaveFailure(
  label: string,
  data: Record<string, unknown>
): void {
  console.error(`[profile/save] ${label}`, data);
}

function tryCreateAdminClient(): SupabaseClient | null {
  try {
    return createAdminClient();
  } catch (e) {
    logProfileSaveFailure("admin_client_unavailable", {
      message: e instanceof Error ? e.message : String(e),
    });
    return null;
  }
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

function isRetriableConnectionError(err: PostgrestError | null): boolean {
  if (!err) return false;
  const m = (err.message ?? "").toLowerCase();
  const c = String(err.code ?? "");
  if (
    m.includes("fetch") ||
    m.includes("network") ||
    m.includes("econnreset") ||
    m.includes("etimedout") ||
    m.includes("socket") ||
    m.includes("timeout") ||
    m.includes("timed out") ||
    m.includes("connection")
  ) {
    return true;
  }
  if (["503", "504", "08006", "57P01"].includes(c)) return true;
  return false;
}

function isPermissionOrSessionError(err: PostgrestError | null): boolean {
  if (!err) return false;
  const m = (err.message ?? "").toLowerCase();
  const c = String(err.code ?? "");
  if (m.includes("jwt") || m.includes("expired") || m.includes("invalid token"))
    return true;
  if (m.includes("permission denied") || m.includes("rls")) return true;
  if (c === "PGRST301" || c === "42501") return true;
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runUpdateWithOptionalRetry(
  client: SupabaseClient,
  payload: Record<string, unknown>,
  userId: string,
  usingAdmin: boolean
): Promise<{
  data: { id: string }[] | null;
  error: PostgrestError | null;
}> {
  const doUpdate = () =>
    client
      .from("profiles")
      .update(payload)
      .eq("id", userId)
      .select("id");

  let { data, error } = await doUpdate();

  if (error && isRetriableConnectionError(error)) {
    logProfileSaveFailure("update_retry_connection", {
      userId,
      usingAdmin,
      code: error.code,
      message: error.message,
    });
    await sleep(500);
    ({ data, error } = await doUpdate());
    if (error) {
      logProfileSaveFailure("update_retry_failed", {
        userId,
        usingAdmin,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
    }
  }

  return { data, error };
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
    logProfileSaveFailure("auth", {
      message: authErr?.message ?? "no_user",
      authErrorName: authErr?.name,
    });
    return { ok: false, kind: "session", message: SESSION_MESSAGE };
  }

  let { data: profileRow, error: profileErr } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profileErr) {
    logProfileSaveFailure("profile_select", {
      userId: user.id,
      code: profileErr.code,
      message: profileErr.message,
      details: profileErr.details,
      hint: profileErr.hint,
    });
    if (isPermissionOrSessionError(profileErr)) {
      return { ok: false, kind: "session", message: SESSION_MESSAGE };
    }
    return { ok: false, kind: "database", message: DATABASE_MESSAGE };
  }

  if (!profileRow) {
    logProfileSaveFailure("profile_row_missing_attempt_ensure", {
      userId: user.id,
    });
    try {
      await ensureProfileForUser(
        supabase,
        user.id,
        user.user_metadata as Record<string, unknown> | undefined
      );
    } catch (ensureErr) {
      logProfileSaveFailure("ensure_profile_failed", {
        userId: user.id,
        error:
          ensureErr instanceof Error ? ensureErr.message : String(ensureErr),
      });
      return { ok: false, kind: "database", message: DATABASE_MESSAGE };
    }
    const second = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();
    profileRow = second.data;
    profileErr = second.error;
    if (profileErr || !profileRow) {
      logProfileSaveFailure("profile_still_missing_after_ensure", {
        userId: user.id,
        code: profileErr?.code,
        message: profileErr?.message,
      });
      return { ok: false, kind: "database", message: DATABASE_MESSAGE };
    }
  }

  const dbRole = profileRow.role as UserRole;
  if (input.role != null && input.role !== dbRole) {
    logProfileSaveFailure("role_mismatch", { inputRole: input.role, dbRole });
    return { ok: false, kind: "session", message: SESSION_MESSAGE };
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
    .filter((c): c is string =>
      (BOOKING_CATEGORIES as readonly string[]).includes(c)
    );

  const bioClipped = clipToMaxLength(input.bio.trim(), MAX_PROFILE_BIO_CHARS);

  let payload: Record<string, unknown>;
  try {
    payload = sanitizePayload(
      buildProfileSettingsSupabasePayload(
        dbRole,
        shared,
        {
          preferred_airport: input.preferredAirport.trim() || null,
          traveler_notes: input.travelerNotes.trim() || null,
        },
        {
          bio: bioClipped || null,
          home_airport: input.homeAirport.trim() || null,
          serving_airports: unique,
          preferred_categories: preferredCategories,
          is_available: input.isAvailable,
          contact_preference: input.waiterManualPayoutPreference ?? null,
          accepted_worker_agreement_version:
            input.waiterIndependentContractorConfirmed &&
            input.waiterTaxResponsibilityConfirmed
              ? POLICY_VERSIONS.workerAgreement
              : (profileRow as { accepted_worker_agreement_version?: string | null })
                  .accepted_worker_agreement_version ?? null,
          independent_contractor_acknowledged_at:
            input.waiterIndependentContractorConfirmed
              ? new Date().toISOString()
              : (profileRow as { independent_contractor_acknowledged_at?: string | null })
                  .independent_contractor_acknowledged_at ?? null,
          tax_responsibility_acknowledged_at:
            input.waiterTaxResponsibilityConfirmed
              ? new Date().toISOString()
              : (profileRow as { tax_responsibility_acknowledged_at?: string | null })
                  .tax_responsibility_acknowledged_at ?? null,
          onboarding_completed: Boolean(
            fn &&
              ph &&
              bioClipped &&
              unique.length > 0 &&
              input.avatarStoragePath
          ),
        }
      ) as Record<string, unknown>
    );
  } catch (payloadErr) {
    logProfileSaveFailure("payload_build_failed", {
      userId: user.id,
      dbRole,
      error:
        payloadErr instanceof Error ? payloadErr.message : String(payloadErr),
      inputSnapshot: {
        hasPreferredCategories: input.waiterPreferredCategories?.length ?? 0,
        servingParts: unique.length,
      },
    });
    return { ok: false, kind: "database", message: DATABASE_MESSAGE };
  }

  const admin = tryCreateAdminClient();
  const clientForMutation = admin ?? supabase;
  const usingAdmin = Boolean(admin);

  if (process.env.NODE_ENV === "development") {
    console.info("[profile/save] payload_keys", {
      keys: Object.keys(payload),
      userId: user.id,
      usingAdmin,
    });
  }

  payload.updated_at = new Date().toISOString();

  let { data: updatedRows, error } = await runUpdateWithOptionalRetry(
    clientForMutation,
    payload,
    user.id,
    usingAdmin
  );

  if (error && typeof payload.preferred_categories !== "undefined") {
    const msg = (error.message ?? "").toLowerCase();
    const details = (error.details ?? "").toLowerCase();
    const missingPreferredCategories =
      msg.includes("preferred_categories") ||
      details.includes("preferred_categories");
    if (missingPreferredCategories) {
      const retryPayload = { ...payload };
      delete retryPayload.preferred_categories;
      ({ data: updatedRows, error } = await runUpdateWithOptionalRetry(
        clientForMutation,
        retryPayload,
        user.id,
        usingAdmin
      ));
    }
  }

  if (error) {
    logProfileSaveFailure("supabase_update", {
      userId: user.id,
      fullError: {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      },
      keys: Object.keys(payload),
      usingAdmin,
    });
    if (isPermissionOrSessionError(error)) {
      return { ok: false, kind: "session", message: SESSION_MESSAGE };
    }
    return { ok: false, kind: "database", message: DATABASE_MESSAGE };
  }

  let rowCount = updatedRows?.length ?? 0;

  if (rowCount === 0) {
    logProfileSaveFailure("zero_rows_after_update", {
      userId: user.id,
      usingAdmin,
    });

    const checkClient = admin ?? tryCreateAdminClient() ?? supabase;
    const { data: existsRow, error: existsErr } = await checkClient
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (existsErr) {
      logProfileSaveFailure("zero_rows_existence_check_failed", {
        userId: user.id,
        code: existsErr.code,
        message: existsErr.message,
      });
      return { ok: false, kind: "database", message: DATABASE_MESSAGE };
    }

    if (!existsRow) {
      const insertPayload = {
        id: user.id,
        role: dbRole,
        ...payload,
      };
      logProfileSaveFailure("zero_rows_insert_attempt", {
        userId: user.id,
        keys: Object.keys(insertPayload),
      });
      const { error: insertErr } = await checkClient
        .from("profiles")
        .insert(insertPayload);
      if (insertErr) {
        logProfileSaveFailure("insert_after_zero_rows_failed", {
          userId: user.id,
          fullError: {
            code: insertErr.code,
            message: insertErr.message,
            details: insertErr.details,
            hint: insertErr.hint,
          },
        });
        if (isPermissionOrSessionError(insertErr)) {
          return { ok: false, kind: "session", message: SESSION_MESSAGE };
        }
        return { ok: false, kind: "database", message: DATABASE_MESSAGE };
      }
      rowCount = 1;
    } else {
      const retryClient = tryCreateAdminClient() ?? checkClient;
      ({ data: updatedRows, error } = await runUpdateWithOptionalRetry(
        retryClient,
        payload,
        user.id,
        Boolean(tryCreateAdminClient())
      ));
      if (error) {
        logProfileSaveFailure("zero_rows_retry_update_failed", {
          userId: user.id,
          fullError: {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint,
          },
        });
        if (isPermissionOrSessionError(error)) {
          return { ok: false, kind: "session", message: SESSION_MESSAGE };
        }
        return { ok: false, kind: "database", message: DATABASE_MESSAGE };
      }
      rowCount = updatedRows?.length ?? 0;
    }
  }

  if (rowCount === 0) {
    logProfileSaveFailure("zero_rows_unresolved", {
      userId: user.id,
      keys: Object.keys(payload),
    });
    return { ok: false, kind: "database", message: DATABASE_MESSAGE };
  }

  revalidatePath("/dashboard/profile");
  revalidatePath("/profile");
  revalidatePath("/dashboard/customer");
  revalidatePath("/dashboard/waiter");

  return { ok: true };
}

export type SaveWaiterManualPayoutResult =
  | { ok: true }
  | { ok: false; kind: "auth" | "save" | "validation"; message?: string };

/**
 * Updates only `contact_preference` for waiters (manual Zelle / PayPal / etc.).
 */
export async function saveWaiterManualPayoutAction(input: {
  method: string;
  handle: string;
}): Promise<SaveWaiterManualPayoutResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    logProfileSaveFailure("manual_payout_auth", {
      message: authErr?.message ?? "no_user",
    });
    return { ok: false, kind: "auth" };
  }

  const { data: profileRow, error: profileErr } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileErr || !profileRow) {
    logProfileSaveFailure("manual_payout_profile_select", {
      userId: user.id,
      code: profileErr?.code,
      message: profileErr?.message,
    });
    return { ok: false, kind: "save" };
  }

  if (profileRow.role !== "waiter") {
    return { ok: false, kind: "auth" };
  }

  const methodRaw = input.method.trim();
  const handleRaw = input.handle.trim();

  let contactPreference: string | null;
  if (!methodRaw && !handleRaw) {
    contactPreference = null;
  } else {
    const m = methodRaw as ManualPayoutMethod;
    const valid =
      m === "zelle" ||
      m === "cash_app" ||
      m === "paypal" ||
      m === "venmo" ||
      m === "other";
    if (!valid || !handleRaw) {
      return {
        ok: false,
        kind: "validation",
        message:
          "Choose a payment method and enter your handle, email, or phone.",
      };
    }
    const built = buildManualPayoutPreference(m, handleRaw);
    if (!built) {
      return {
        ok: false,
        kind: "validation",
        message:
          "Choose a payment method and enter your handle, email, or phone.",
      };
    }
    contactPreference = built;
  }

  const admin = tryCreateAdminClient();
  const clientForUpdate = admin ?? supabase;

  const { error } = await clientForUpdate
    .from("profiles")
    .update({
      contact_preference: contactPreference,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id)
    .eq("role", "waiter");

  if (error) {
    logProfileSaveFailure("manual_payout_update", {
      userId: user.id,
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    return { ok: false, kind: "save" };
  }

  revalidatePath("/dashboard/profile");
  revalidatePath("/profile");
  revalidatePath("/dashboard/waiter");

  return { ok: true };
}
