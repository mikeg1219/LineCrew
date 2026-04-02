import { createAdminClient } from "@/lib/supabase/admin";
import {
  getProfilePhone,
  safeSendSms,
  smsCustomerBookingComplete,
  smsWaiterNewJobAtAirport,
  smsWaiterPayoutProcessing,
} from "@/lib/sms-job-notifications";
import {
  type BookingConfirmedData,
  sendBookingConfirmedEmail,
} from "@/lib/emails/booking-confirmed";
import {
  type BookingCompletedData,
  sendBookingCompletedEmail,
} from "@/lib/emails/booking-completed";
import {
  type LineHolderAssignedData,
  sendLineHolderAssignedEmail,
} from "@/lib/emails/line-holder-assigned";
import {
  type NewJobAvailableData,
  sendNewJobAvailableEmail,
} from "@/lib/emails/new-job-available";
import { type PayoutSentData, sendPayoutSentEmail } from "@/lib/emails/payout-sent";

export type EmailTemplateName =
  | "booking-confirmed"
  | "line-holder-assigned"
  | "booking-completed"
  | "new-job-available"
  | "payout-sent";

export type SendEmailPayload =
  | { template: "booking-confirmed"; data: BookingConfirmedData }
  | { template: "line-holder-assigned"; data: LineHolderAssignedData }
  | { template: "booking-completed"; data: BookingCompletedData }
  | { template: "new-job-available"; data: NewJobAvailableData }
  | { template: "payout-sent"; data: PayoutSentData };

/**
 * Unified transactional email entry — never throws; logs failures.
 */
export async function sendEmail(payload: SendEmailPayload): Promise<void> {
  try {
    switch (payload.template) {
      case "booking-confirmed":
        await sendBookingConfirmedEmail(payload.data);
        return;
      case "line-holder-assigned":
        await sendLineHolderAssignedEmail(payload.data);
        return;
      case "booking-completed":
        await sendBookingCompletedEmail(payload.data);
        return;
      case "new-job-available":
        await sendNewJobAvailableEmail(payload.data);
        return;
      case "payout-sent":
        await sendPayoutSentEmail(payload.data);
        return;
    }
  } catch (e) {
    console.error("[emails] sendEmail failed:", payload.template, e);
  }
}

async function getAuthEmailForUserId(userId: string): Promise<string | null> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.getUserById(userId);
    if (error || !data.user?.email) return null;
    return data.user.email.trim() || null;
  } catch (e) {
    console.error("[emails] getAuthEmailForUserId", e);
    return null;
  }
}

function lineHolderDisplayName(p: {
  first_name?: string | null;
  display_name?: string | null;
  full_name?: string | null;
}): string {
  return (
    p.display_name?.trim() ||
    p.full_name?.trim() ||
    p.first_name?.trim() ||
    "Your Line Holder"
  );
}

/**
 * After a job row is created (checkout confirm or Stripe webhook): customer confirmation + waiter alerts.
 */
export async function notifyJobCreated(jobId: string): Promise<void> {
  try {
    const admin = createAdminClient();
    const { data: job } = await admin
      .from("jobs")
      .select(
        "id, customer_id, customer_email, airport, terminal, line_type, offered_price"
      )
      .eq("id", jobId)
      .maybeSingle();

    if (!job) return;

    let customerEmail = job.customer_email?.trim() || null;
    if (!customerEmail) {
      customerEmail = await getAuthEmailForUserId(job.customer_id);
    }
    if (customerEmail) {
      await sendEmail({
        template: "booking-confirmed",
        data: {
          jobId: job.id,
          customerEmail,
          airport: job.airport,
          terminal: job.terminal,
          lineType: job.line_type,
          offeredPrice: Number(job.offered_price),
        },
      });
    }

    const airport = job.airport;
    const { data: waiters } = await admin
      .from("profiles")
      .select("id, serving_airports")
      .eq("role", "waiter");

    const matching =
      (waiters ?? []).filter((w) => {
        const s = w.serving_airports as string[] | null;
        return Array.isArray(s) && s.includes(airport);
      }) ?? [];

    await Promise.all(
      matching.map(async (w) => {
        const email = await getAuthEmailForUserId(w.id);
        if (email) {
          await sendEmail({
            template: "new-job-available",
            data: {
              waiterEmail: email,
              jobId: job.id,
              airport: job.airport,
              terminal: job.terminal,
              lineType: job.line_type,
              offeredPrice: Number(job.offered_price),
            },
          });
        }
        const phone = await getProfilePhone(admin, w.id);
        await safeSendSms(
          phone,
          smsWaiterNewJobAtAirport(Number(job.offered_price), job.airport)
        );
      })
    );
  } catch (e) {
    console.error("[emails] notifyJobCreated", e);
  }
}

/**
 * Line Holder accepted an open job — notify customer.
 */
export async function notifyLineHolderAssigned(opts: {
  jobId: string;
  customerId: string;
  airport: string;
  terminal: string;
  waiterUserId: string;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    const { data: jobRow } = await admin
      .from("jobs")
      .select("customer_email")
      .eq("id", opts.jobId)
      .maybeSingle();

    let customerEmail = jobRow?.customer_email?.trim() || null;
    if (!customerEmail) {
      customerEmail = await getAuthEmailForUserId(opts.customerId);
    }
    if (!customerEmail) return;

    const { data: waiterProfile } = await admin
      .from("profiles")
      .select("first_name, display_name, full_name, serving_airports")
      .eq("id", opts.waiterUserId)
      .maybeSingle();

    const serviceAreas = Array.isArray(waiterProfile?.serving_airports)
      ? (waiterProfile!.serving_airports as string[]).filter(Boolean)
      : [];
    const serviceAreasLabel =
      serviceAreas.length > 0 ? serviceAreas.join(", ") : "—";

    const data: LineHolderAssignedData = {
      jobId: opts.jobId,
      customerEmail,
      airport: opts.airport,
      terminal: opts.terminal,
      lineHolderName: lineHolderDisplayName(waiterProfile ?? {}),
      serviceAreasLabel,
    };
    await sendEmail({ template: "line-holder-assigned", data });
  } catch (e) {
    console.error("[emails] notifyLineHolderAssigned", e);
  }
}

/**
 * Booking marked completed and Stripe transfer created — customer thank-you + waiter payout notice.
 */
export async function notifyBookingCompletedAndPayout(opts: {
  jobId: string;
  customerId: string;
  waiterId: string;
  airport: string;
  lineType: string;
  amountCharged: number;
  waiterPayoutAmount: number;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    const { data: jobEmailRow } = await admin
      .from("jobs")
      .select("customer_email")
      .eq("id", opts.jobId)
      .maybeSingle();
    let customerEmail = jobEmailRow?.customer_email?.trim() || null;
    if (!customerEmail) {
      customerEmail = await getAuthEmailForUserId(opts.customerId);
    }

    if (customerEmail) {
      const completed: BookingCompletedData = {
        customerEmail,
        airport: opts.airport,
        lineType: opts.lineType,
        amountCharged: opts.amountCharged,
      };
      await sendEmail({ template: "booking-completed", data: completed });
    }

    const waiterEmail = await getAuthEmailForUserId(opts.waiterId);
    if (waiterEmail) {
      const payout: PayoutSentData = {
        waiterEmail,
        amount: opts.waiterPayoutAmount,
        destinationLabel: "Your Stripe Connect account",
      };
      await sendEmail({ template: "payout-sent", data: payout });
    }

    const customerPhone = await getProfilePhone(admin, opts.customerId);
    await safeSendSms(customerPhone, smsCustomerBookingComplete());

    const waiterPhone = await getProfilePhone(admin, opts.waiterId);
    await safeSendSms(
      waiterPhone,
      smsWaiterPayoutProcessing(opts.waiterPayoutAmount)
    );
  } catch (e) {
    console.error("[emails] notifyBookingCompletedAndPayout", e);
  }
}

export {
  sendBookingConfirmedEmail,
  sendLineHolderAssignedEmail,
  sendBookingCompletedEmail,
  sendNewJobAvailableEmail,
  sendPayoutSentEmail,
};
export type {
  BookingConfirmedData,
  LineHolderAssignedData,
  BookingCompletedData,
  NewJobAvailableData,
  PayoutSentData,
};
