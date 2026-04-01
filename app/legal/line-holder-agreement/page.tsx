import { POLICY_VERSIONS } from "@/lib/legal";
import { PolicyShell } from "@/app/legal/policy-shell";

export default function LineHolderAgreementPage() {
  return (
    <PolicyShell
      title="Independent Line Holder Agreement"
      updated={POLICY_VERSIONS.workerAgreement}
    >
      <h2>Independent contractor status</h2>
      <p>
        Line holders are independent contractors, not employees, agents, or representatives of LineCrew.ai.
      </p>
      <h2>Operational responsibility</h2>
      <p>
        Line holders are solely responsible for conduct during services, compliance with laws and venue policies, and
        accurate communication with customers.
      </p>
      <h2>Tax and legal obligations</h2>
      <p>
        Line holders are responsible for their own taxes, filings, and legal eligibility to perform services in their
        jurisdiction.
      </p>
    </PolicyShell>
  );
}
