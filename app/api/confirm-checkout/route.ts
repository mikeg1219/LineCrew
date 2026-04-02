import { notifyJobCreated } from "@/lib/emails";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { chargeIdFromPaymentIntent } from "@/lib/stripe-charge";
import { getStripe } from "@/lib/stripe";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function readMeta(
  ...sources: Array<Record<string, string | null | undefined> | null | undefined>
) {
  const out: Record<string, string> = {};
  for (const src of sources) {
    if (!src) continue;
    for (const [k, v] of Object.entries(src)) {
      if (typeof v === "string" && v.trim() !== "" && !out[k]) {
        out[k] = v;
      }
    }
  }
  return out;
}

function legacyCompatibleLineType(raw: string): string {
  const v = raw.trim();
  if (v === "Check-In (Ticket Counter)") return "Check-In";
  if (v === "Bag Drop (Checked Bags)") return "Bag Drop";
  if (v === "Security Line (Standard)") return "Security";
  if (v === "Security Line (PreCheck / CLEAR)") return "TSA PreCheck";
  if (
    v === "Flight Changes / Customer Service" ||
    v.startsWith("Gate Agent") ||
    v === "Rental Car Pickup" ||
    v === "Taxi / Rideshare Line" ||
    v === "Food / Coffee Line" ||
    v === "Lounge Entry Waitlist" ||
    v === "Other (Describe your line)"
  ) {
    return "Customs";
  }
  return v;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("session_id");
  if (!sessionId) {
    return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (session.payment_status !== "paid") {
    return NextResponse.json({ ok: false, pending: true, reason: "unpaid" });
  }

  const piRef = session.payment_intent;
  const piId = typeof piRef === "string" ? piRef : piRef?.id ?? null;
  if (!piId) {
    return NextResponse.json({ error: "No payment intent" }, { status: 400 });
  }

  const pi = await stripe.paymentIntents.retrieve(piId);
  const md = readMeta(pi.metadata, session.metadata);

  if (md.customer_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createServiceRoleClient() ?? supabase;

  const { data: existing } = await admin
    .from("jobs")
    .select("id")
    .eq("stripe_payment_intent_id", piId)
    .maybeSingle();

  if (existing?.id) {
    return NextResponse.json({ ok: true, jobId: existing.id });
  }

  const offered = parseFloat(md.offered_price ?? "");
  const overageRate = parseFloat(md.overage_rate ?? "10");

  if (
    Number.isNaN(offered) || offered < 10 ||
    !md.airport || !md.terminal || !md.line_type || !md.estimated_wait
  ) {
    return NextResponse.json({ ok: false, pending: true });
  }

  const baseInsert = {
    customer_id: md.customer_id,
    customer_email: md.customer_email || null,
    airport: md.airport,
    terminal: md.terminal,
    line_type: md.line_type,
    description: md.description ?? "",
    offered_price: offered,
    overage_rate: overageRate,
    overage_agreed: md.overage_agreed === "true",
    estimated_wait: md.estimated_wait,
    booking_terms_acknowledged_at: md.booking_terms_acknowledged_at ?? null,
    booking_disclaimer_acknowledged_at:
      md.booking_disclaimer_acknowledged_at ?? null,
    category_specific_disclaimer_version:
      md.category_disclaimer_version ?? null,
    refund_policy_version: md.refund_policy_version ?? null,
    status: "open",
    stripe_payment_intent_id: piId,
    payment_status: "captured" as const,
    stripe_checkout_session_id: sessionId,
    stripe_charge_id: chargeIdFromPaymentIntent(pi),
  };

  let { data: newJob, error } = await admin
    .from("jobs")
    .insert(baseInsert)
    .select("id")
    .single();

  if (error?.code === "23505") {
    const { data: dup } = await admin
      .from("jobs")
      .select("id")
      .eq("stripe_payment_intent_id", piId)
      .maybeSingle();
    return NextResponse.json({ ok: true, jobId: dup?.id });
  }

  if (error) {
    const fallbackLineType = legacyCompatibleLineType(baseInsert.line_type);
    if (fallbackLineType !== baseInsert.line_type) {
      const fallbackDescription = baseInsert.description
        ? `${baseInsert.description}\n\nOriginal line type: ${baseInsert.line_type}`
        : `Original line type: ${baseInsert.line_type}`;
      const retry = await admin
        .from("jobs")
        .insert({
          ...baseInsert,
          line_type: fallbackLineType,
          description: fallbackDescription,
        })
        .select("id")
        .single();
      newJob = retry.data;
      error = retry.error;
    }
  }

  if (error) {
    const isRlsOrPermission =
      error.code === "42501" ||
      error.code === "PGRST301" ||
      /permission|policy|rls/i.test(error.message ?? "");
    if (isRlsOrPermission) {
      return NextResponse.json(
        {
          error:
            "Could not save booking after payment. Configure SUPABASE_SERVICE_ROLE_KEY (webhook/confirm insert) or restore jobs insert policy for authenticated customers.",
          code: error.code ?? null,
        },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: error.message, code: error.code ?? null },
      { status: 500 }
    );
  }

  if (!newJob?.id) {
    return NextResponse.json({ ok: false, pending: true, reason: "retry_insert" });
  }
  await notifyJobCreated(newJob.id);
  return NextResponse.json({ ok: true, jobId: newJob.id });
}