export type CustomerProfileBannerRow = {
  first_name?: string | null;
  display_name?: string | null;
  full_name?: string | null;
  phone?: string | null;
  profile_completed?: boolean | null;
};

export function isCustomerProfileComplete(
  p: CustomerProfileBannerRow
): boolean {
  if (p.profile_completed === true) return true;
  const display = (p.display_name ?? p.full_name ?? "").trim();
  return Boolean(
    p.first_name?.trim() && display.length > 0 && p.phone?.trim()
  );
}
