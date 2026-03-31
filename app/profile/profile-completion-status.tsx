import { isEmailVerifiedForApp } from "@/lib/auth-email-verified";
import { isCustomerProfileComplete } from "@/lib/customer-profile-complete";
import {
  isStripeConnectPayoutReady,
  isWaiterAcceptSetupComplete,
  type WaiterAcceptGateRow,
} from "@/lib/waiter-profile-complete";

type CustomerProps = {
  role: "customer";
  firstName: string;
  displayName: string;
  phone: string;
  profileCompletedFlag: boolean | null;
};

type WaiterProps = {
  role: "waiter";
  firstName: string;
  phone: string;
  bio: string;
  avatarPath: string | null;
  servingCodes: string[];
  onboardingCompleted: boolean | null;
  emailVerifiedAt: string | null;
  /** Supabase Auth — same source as middleware / accept-job gate */
  authEmailConfirmedAt: string | null;
  stripeAccountId: string | null;
  stripeDetailsSubmitted: boolean | null;
  stripePayoutsEnabled: boolean | null;
};

export function ProfileCompletionStatus(props: CustomerProps | WaiterProps) {
  if (props.role === "customer") {
    const p = props;
    const done = isCustomerProfileComplete({
      first_name: p.firstName,
      display_name: p.displayName,
      full_name: p.displayName,
      phone: p.phone,
      profile_completed: p.profileCompletedFlag,
    });
    return (
      <div
        className={`rounded-3xl border px-4 py-4 shadow-sm ring-1 ring-slate-900/5 sm:px-5 ${
          done
            ? "border-emerald-200/90 bg-emerald-50/70 text-emerald-950"
            : "border-amber-200/90 bg-amber-50/80 text-amber-950"
        }`}
        role="status"
      >
        <p className="text-sm font-semibold">
          {done ? "Traveler profile complete" : "Finish your traveler profile"}
        </p>
        {!done && (
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm leading-relaxed opacity-95">
            {!p.firstName.trim() && <li>First name</li>}
            {!p.displayName.trim() && <li>Display name</li>}
            {!p.phone.trim() && <li>Phone number</li>}
          </ul>
        )}
        {done && (
          <p className="mt-1 text-sm opacity-90">
            Line Holders see your name and can reach you reliably for bookings.
          </p>
        )}
      </div>
    );
  }

  const p = props;
  const gate: WaiterAcceptGateRow = {
    first_name: p.firstName,
    avatar_url: p.avatarPath,
    phone: p.phone,
    bio: p.bio,
    serving_airports: p.servingCodes,
    onboarding_completed: p.onboardingCompleted,
    email_verified_at: p.emailVerifiedAt,
    stripe_account_id: p.stripeAccountId,
    stripe_details_submitted: p.stripeDetailsSubmitted,
    stripe_payouts_enabled: p.stripePayoutsEnabled,
  };
  const authUser = {
    email_confirmed_at: p.authEmailConfirmedAt ?? undefined,
  };
  const full = isWaiterAcceptSetupComplete(gate, authUser);
  const emailOk = isEmailVerifiedForApp(
    { email_verified_at: p.emailVerifiedAt },
    authUser
  );

  return (
    <div
      className={`rounded-3xl border px-4 py-4 shadow-sm ring-1 ring-slate-900/5 sm:px-5 ${
        full
          ? "border-emerald-200/90 bg-emerald-50/70 text-emerald-950"
          : "border-indigo-200/90 bg-indigo-50/70 text-indigo-950"
      }`}
      role="status"
    >
      <p className="text-sm font-semibold">
        {full ? "Line Holder profile ready" : "Line Holder onboarding"}
      </p>
      <p className="mt-1 text-sm leading-relaxed opacity-90">
        {full
          ? "You can accept bookings that match your airports."
          : "Complete the checklist so travelers can trust you and you can accept jobs."}
      </p>
      {!full && (
        <ul className="mt-3 list-none space-y-1.5 text-sm">
          <Check ok={Boolean(p.firstName.trim())} label="First name" />
          <Check ok={Boolean(p.avatarPath)} label="Profile photo" />
          <Check ok={Boolean(p.phone.trim())} label="Phone" />
          <Check ok={Boolean(p.bio.trim())} label="Bio" />
          <Check
            ok={p.servingCodes.length > 0}
            label="At least one airport served"
          />
          <Check
            ok={p.onboardingCompleted === true}
            label="Save profile to confirm onboarding (auto when core fields are done)"
          />
          <Check ok={emailOk} label="Email verified" />
          <Check
            ok={isStripeConnectPayoutReady(gate)}
            label="Payouts ready (Stripe onboarding + bank)"
          />
        </ul>
      )}
    </div>
  );
}

function Check({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-start gap-2">
      <span className={ok ? "text-emerald-600" : "text-slate-400"} aria-hidden>
        {ok ? "✓" : "○"}
      </span>
      <span className={ok ? "text-slate-800" : "text-slate-600"}>{label}</span>
    </li>
  );
}
