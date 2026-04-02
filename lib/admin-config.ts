export const ADMIN_EMAILS = [
  "mikeg1219@yahoo.com",
  "mikeg1219@hotmail.com",
] as const;

const ADMIN_EMAIL_SET = new Set(
  ADMIN_EMAILS.map((e) => e.toLowerCase().trim())
);

export function isAdminUser(email: string): boolean {
  return ADMIN_EMAIL_SET.has(email.toLowerCase().trim());
}
