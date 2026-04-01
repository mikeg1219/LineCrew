import { PolicyShell } from "@/app/legal/policy-shell";

export default function TermsPage() {
  return (
    <PolicyShell title="Terms of Service" versionKey="terms">
      <h2>Marketplace role</h2>
      <p>
        LineCrew.ai is a technology marketplace that connects customers with independent third-party line holders.
        LineCrew.ai does not directly provide in-person queue services and does not employ line holders.
      </p>
      <h2>User responsibilities</h2>
      <p>
        Users are responsible for accurate booking details, lawful conduct, and compliance with venue and local rules.
        Service outcomes can vary due to third-party policies and on-site conditions.
      </p>
      <h2>Payments, cancellations, and disputes</h2>
      <p>
        Fees may vary by category, location, timing, and demand. Cancellation and refund handling follow the
        published Cancellation & Refund Policy. Submitting a dispute does not guarantee a specific outcome.
      </p>
    </PolicyShell>
  );
}
