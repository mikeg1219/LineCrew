/** Single admin for dispute panel and notifications (must match session email). */
export const ADMIN_EMAIL = "mikeg1219@yahoo.com";

export function isAdminEmail(email: string | undefined | null): boolean {
  return (email ?? "").toLowerCase() === ADMIN_EMAIL.toLowerCase();
}
