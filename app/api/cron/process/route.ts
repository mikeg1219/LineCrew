import { createAdminClient } from "@/lib/supabase/admin";
import { finalizeJobPayout } from "@/lib/stripe-release-payout";
import { verifyCronRequest } from "@/lib/cron-auth";
import { sendSms } from "@/lib/twilio-sms";
import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";

export const maxDuration = 120;

const GHOST_MS = 30 * 60 * 1000;
const CONFIRM_MS = 15 * 60 * 1000;
const OVERAGE_MS = 20 * 60 * 1000;

export async function GET(request: NextRequest) {
  if (!verifyCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = Date.now();
  const ghostCutoff = new Date(now - GHOST_MS).toISOString();
  const confirmCutoff = new Date(now - CONFIRM_MS).toISOString();
  const overageCutoff = new Date(now - OVERAGE_MS).toISOString();

  const results = {
    ghostReleased: 0,
    autoCompleted: 0,
    overageAutoApproved: 0,
    errors: [] as string[],
  };

  try {
    const { data: ghostJobs } = await admin
      .from("jobs")
      .select("id, customer_id, accepted_at")
      .eq("status", "accepted")
      .not("accepted_at", "is", null)
      .lt("accepted_at", ghostCutoff);

    for (const job of ghostJobs ?? []) {
      const { error } = await admin
        .from("jobs")
        .update({
          status: "open",
          waiter_id: null,
          waiter_email: null,
          accepted_at: null,
        })
        .eq("id", job.id)
        .eq("status", "accepted");

      if (error) {
        results.errors.push(`ghost ${job.id}: ${error.message}`);
        continue;
      }

      results.ghostReleased += 1;

      const { data: profile } = await admin
        .from("profiles")
        .select("phone")
        .eq("id", job.customer_id)
        .maybeSingle();

      await sendSms(
        profile?.phone ?? null,
        "Your waiter didn't show up. We're finding you a new one."
      );
    }

    const { data: staleConfirm } = await admin
      .from("jobs")
      .select("id")
      .eq("status", "pending_confirmation")
      .not("completed_at", "is", null)
      .lt("completed_at", confirmCutoff);

    for (const job of staleConfirm ?? []) {
      const r = await finalizeJobPayout(admin, job.id, "pending_confirmation");
      if (r.ok) {
        results.autoCompleted += 1;
      } else {
        results.errors.push(`confirm ${job.id}: ${r.error}`);
      }
    }

    const { data: staleOverage } = await admin
      .from("overage_requests")
      .select("id, job_id")
      .eq("status", "pending")
      .lt("created_at", overageCutoff);

    for (const row of staleOverage ?? []) {
      const { error } = await admin
        .from("overage_requests")
        .update({ status: "approved" })
        .eq("id", row.id)
        .eq("status", "pending");

      if (!error) {
        results.overageAutoApproved += 1;
      }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "cron error";
    results.errors.push(msg);
    return NextResponse.json(
      { ok: false, results, errors: results.errors },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, results });
}
