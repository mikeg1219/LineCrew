import { PolicyShell } from "@/app/legal/policy-shell";

export default function ContactSupportPage() {
  return (
    <PolicyShell title="Contact & Support" versionKey="contactSupport">
      <h2>Support channels</h2>
      <p>
        For booking, payout, or safety issues, contact support through in-app issue reporting first so booking context
        is included.
      </p>
      <h2>Response goals</h2>
      <p>
        Urgent safety reports are prioritized. Standard booking disputes are reviewed in queue order using event logs
        and available evidence.
      </p>
      <h2>Notice</h2>
      <p>
        Submitting a report does not guarantee a refund or a specific resolution. Outcomes are based on policy and
        available evidence.
      </p>
    </PolicyShell>
  );
}
