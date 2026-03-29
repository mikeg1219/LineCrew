import type { UserRole } from "@/lib/types";

/** Homepage /auth links use ?intent=customer|waiter */
export function parseAuthIntent(
  value: string | string[] | null | undefined
): UserRole | null {
  const v = Array.isArray(value) ? value[0] : value;
  if (v === "customer" || v === "waiter") return v;
  return null;
}
