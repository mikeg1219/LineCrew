import type { SupabaseClient } from "@supabase/supabase-js";

/** In-progress / actionable jobs for customer “Bookings” badge */
const CUSTOMER_BADGE_STATUSES = [
  "open",
  "accepted",
  "at_airport",
  "in_line",
  "near_front",
  "customer_on_the_way",
  "ready_for_handoff",
  "qr_generated",
  "qr_scanned",
  "awaiting_dual_confirmation",
  "pending_confirmation",
] as const;

/** In-progress assignments for Line Holder “Assignments” badge */
const WAITER_BADGE_STATUSES = [
  "accepted",
  "at_airport",
  "in_line",
  "near_front",
] as const;

export async function fetchNavBadgeCounts(
  supabase: SupabaseClient,
  userId: string,
  role: "customer" | "waiter" | null
): Promise<{ customerBookings: number; waiterAssignments: number }> {
  if (role === "customer") {
    const { count, error } = await supabase
      .from("jobs")
      .select("*", { count: "exact", head: true })
      .eq("customer_id", userId)
      .in("status", [...CUSTOMER_BADGE_STATUSES]);
    if (error) {
      console.error("[nav-badge-counts] customer:", error.message);
      return { customerBookings: 0, waiterAssignments: 0 };
    }
    return { customerBookings: count ?? 0, waiterAssignments: 0 };
  }
  if (role === "waiter") {
    const { count, error } = await supabase
      .from("jobs")
      .select("*", { count: "exact", head: true })
      .eq("waiter_id", userId)
      .in("status", [...WAITER_BADGE_STATUSES]);
    if (error) {
      console.error("[nav-badge-counts] waiter:", error.message);
      return { customerBookings: 0, waiterAssignments: 0 };
    }
    return { customerBookings: 0, waiterAssignments: count ?? 0 };
  }
  return { customerBookings: 0, waiterAssignments: 0 };
}
