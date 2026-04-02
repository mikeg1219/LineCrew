import { BookingSessionExpired } from "@/app/dashboard/customer/booking-review/booking-session-expired";
import { BookingReviewClient } from "@/app/dashboard/customer/booking-review/booking-review-client";
import { DashboardFinishingSetup } from "@/app/dashboard/finishing-setup";
import { getBookingDraftCookie } from "@/lib/booking-draft-cookie";
import {
  bookingCardTitle,
  bookingLocationLine,
  bookingTimingLine,
  estimatedWaitSummary,
  notesPreview,
} from "@/lib/booking-review-display";
import { splitOfferedPrice } from "@/lib/booking-pricing";
import { isProfileCompleteForBookings } from "@/lib/profile-booking-gate";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

type PageProps = {
  searchParams: Promise<{ cancelled?: string }>;
};

export default async function BookingReviewPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const cancelled = sp.cancelled === "1";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return (
      <DashboardFinishingSetup
        userEmail={user.email ?? ""}
        errorMessage={`We couldn’t load your profile (${profileError.message}). Try again in a moment.`}
      />
    );
  }

  if (!profile) {
    return <DashboardFinishingSetup userEmail={user.email ?? ""} />;
  }

  if (profile.role === "waiter") {
    redirect("/dashboard/waiter");
  }

  if (!isProfileCompleteForBookings(profile)) {
    redirect("/dashboard/profile?profile_required=1");
  }

  const draft = await getBookingDraftCookie();
  if (!draft) {
    return <BookingSessionExpired />;
  }

  const split = splitOfferedPrice(draft.offered_price);

  return (
    <div className="mx-auto max-w-lg px-4 pb-28 pt-6 sm:px-5 sm:pb-12 sm:pt-8 lg:max-w-xl">
      <div className="mb-6 flex flex-col gap-3 sm:mb-8">
        <Link
          href="/dashboard/customer/post-job"
          className="inline-flex text-sm font-medium text-blue-700 hover:text-blue-800"
        >
          ← Edit booking
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-[1.65rem]">
          Review &amp; pay
        </h1>
        <p className="text-[15px] leading-relaxed text-slate-600">
          Confirm details before secure checkout. Your card is charged when you
          continue to Stripe.
        </p>
      </div>

      {cancelled && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900">
          Checkout was cancelled. You can adjust anything below and try again.
        </div>
      )}

      <BookingReviewClient
        cardTitle={bookingCardTitle(draft)}
        locationLine={bookingLocationLine(draft)}
        timingLine={bookingTimingLine(draft)}
        estimatedWaitLine={estimatedWaitSummary(draft)}
        notesPreview={notesPreview(draft)}
        lineHolderFee={split.lineHolderFee}
        platformFee={split.platformFee}
        totalCharged={split.total}
        overageRate={draft.overage_rate}
      />
    </div>
  );
}
