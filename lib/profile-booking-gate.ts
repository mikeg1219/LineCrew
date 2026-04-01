/**
 * Booking-related UI (lists, browse, post job) is shown only after the user has
 * saved a minimal profile (first name, display name, phone). See
 * `saveProfileSettingsAction` → `profile_completed`.
 */
export function isProfileCompleteForBookings(
  profile: { profile_completed?: boolean | null } | null | undefined
): boolean {
  return profile?.profile_completed === true;
}
