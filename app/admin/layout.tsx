import type { ReactNode } from "react";

/**
 * Dedicated layout for /admin so the route is a stable App Router segment
 * (same pattern as dashboard routes).
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return children;
}
 
