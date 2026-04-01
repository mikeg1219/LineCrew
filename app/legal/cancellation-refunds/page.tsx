import { POLICY_VERSIONS } from "@/lib/legal";
import { PolicyShell } from "@/app/legal/policy-shell";

export default function CancellationRefundsPage() {
  return (
    <PolicyShell
      title="Cancellation & Refund Policy"
      updated={POLICY_VERSIONS.refund}
    >
      <h2>Before acceptance</h2>
      <p>Customers can cancel without penalty before a line holder accepts the booking.</p>
      <h2>After acceptance</h2>
      <p>
        Once a line holder accepts, cancellation terms apply based on current policy and booking state. Queue timing
        and on-site conditions may affect eligibility.
      </p>
      <h2>No-shows and late arrivals</h2>
      <p>
        Customer no-shows, worker no-shows, and late arrivals are reviewed using booking events, handoff evidence, and
        issue reports.
      </p>
    </PolicyShell>
  );
}
