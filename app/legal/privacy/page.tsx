import { POLICY_VERSIONS } from "@/lib/legal";
import { PolicyShell } from "@/app/legal/policy-shell";

export default function PrivacyPage() {
  return (
    <PolicyShell title="Privacy Policy" updated={POLICY_VERSIONS.privacy}>
      <h2>Data collected</h2>
      <p>
        We collect account data, booking data, payment-related metadata, location and handoff events, and support
        messages to operate and secure the marketplace.
      </p>
      <h2>How data is used</h2>
      <p>
        Data is used to match users, process bookings, detect fraud, provide support, enforce policies, and improve
        product reliability.
      </p>
      <h2>Recordkeeping</h2>
      <p>
        We store policy acceptance events with version, timestamp, and context to support compliance and audit needs.
      </p>
    </PolicyShell>
  );
}
