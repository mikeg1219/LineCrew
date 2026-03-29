export type WaiterProfileGateRow = {
  first_name?: string | null;
  avatar_url?: string | null;
  phone?: string | null;
  bio?: string | null;
  serving_airports?: string[] | null;
  onboarding_completed?: boolean | null;
  email_verified_at?: string | null;
};

export function waiterCoreFieldsComplete(p: WaiterProfileGateRow): boolean {
  const airports = p.serving_airports?.filter(Boolean) ?? [];
  return (
    Boolean(p.first_name?.trim()) &&
    Boolean(p.avatar_url?.trim()) &&
    Boolean(p.phone?.trim()) &&
    Boolean(p.bio?.trim()) &&
    airports.length > 0
  );
}

export function isWaiterProfileComplete(p: WaiterProfileGateRow): boolean {
  return (
    waiterCoreFieldsComplete(p) &&
    p.onboarding_completed === true &&
    Boolean(p.email_verified_at)
  );
}
