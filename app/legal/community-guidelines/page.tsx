import { PolicyShell } from "@/app/legal/policy-shell";

export default function CommunityGuidelinesPage() {
  return (
    <PolicyShell title="Community Guidelines" versionKey="guidelines">
      <h2>Respect and safety</h2>
      <p>No harassment, threats, discriminatory behavior, or unsafe conduct.</p>
      <h2>Authenticity</h2>
      <p>No impersonation, fraud, fake bookings, or misuse of payment and handoff flows.</p>
      <h2>Legal and venue compliance</h2>
      <p>
        Users must follow local laws and venue policies. Services and access can be restricted by third-party rules at
        any time.
      </p>
    </PolicyShell>
  );
}
