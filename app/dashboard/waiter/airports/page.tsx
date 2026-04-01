import { redirect } from "next/navigation";

export default function WaiterAirportsPage() {
  // Backward-compatible route; keep old URL working.
  redirect("/dashboard/waiter/service-areas");
}
