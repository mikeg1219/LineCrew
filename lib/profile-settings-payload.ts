import type { UserRole } from "@/lib/types";

/** Editable `profiles` columns for this form (see supabase/*-migration.sql). */
export type ProfileSettingsShared = {
  first_name: string | null;
  display_name: string | null;
  full_name: string | null;
  phone: string | null;
  profile_completed: boolean;
};

export type ProfileSettingsCustomer = ProfileSettingsShared & {
  preferred_airport: string | null;
  traveler_notes: string | null;
};

export type ProfileSettingsWaiter = ProfileSettingsShared & {
  bio: string | null;
  home_airport: string | null;
  serving_airports: string[];
  preferred_categories: string[];
  is_available: boolean;
  contact_preference: string | null;
  onboarding_completed: boolean;
  accepted_worker_agreement_version: string | null;
  independent_contractor_acknowledged_at: string | null;
  tax_responsibility_acknowledged_at: string | null;
};

export type ProfileSettingsSupabasePayload =
  | ProfileSettingsCustomer
  | ProfileSettingsWaiter;

/**
 * Build update object for `.from("profiles").update(...).eq("id", user.id)`.
 * Only includes columns that exist on `public.profiles`.
 */
export function buildProfileSettingsSupabasePayload(
  dbRole: UserRole,
  shared: ProfileSettingsShared,
  customer: Pick<
    ProfileSettingsCustomer,
    "preferred_airport" | "traveler_notes"
  >,
  waiter: Pick<
    ProfileSettingsWaiter,
    | "bio"
    | "home_airport"
    | "serving_airports"
    | "preferred_categories"
    | "is_available"
    | "contact_preference"
    | "onboarding_completed"
    | "accepted_worker_agreement_version"
    | "independent_contractor_acknowledged_at"
    | "tax_responsibility_acknowledged_at"
  >
): ProfileSettingsSupabasePayload {
  if (dbRole === "customer") {
    return { ...shared, ...customer };
  }
  return { ...shared, ...waiter };
}
