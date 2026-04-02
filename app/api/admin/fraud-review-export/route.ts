import { isAdminUser } from "@/lib/admin-config";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";

function boolParam(v: string | null): boolean {
  return v === "true";
}

function csvEscape(v: unknown): string {
  return `"${String(v ?? "").replaceAll('"', '""')}"`;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email || !isAdminUser(user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const unreviewedOnly = boolParam(url.searchParams.get("unreviewedOnly"));
  const escalatedOnly = boolParam(url.searchParams.get("escalatedOnly"));
  const lowConfidenceOnly = boolParam(url.searchParams.get("lowConfidenceOnly"));

  const admin = createAdminClient();
  let query = admin
    .from("jobs")
    .select(
      "id,status,airport,line_type,customer_email,waiter_email,handoff_issue_flag,handoff_issue_reason,handoff_confidence_score,handoff_verification_attempts,handoff_escalated_at,handoff_reviewed_at,created_at"
    )
    .or("handoff_issue_flag.eq.true,handoff_confidence_score.lt.60,handoff_verification_attempts.gte.4")
    .order("created_at", { ascending: false })
    .limit(5000);

  if (unreviewedOnly) query = query.is("handoff_reviewed_at", null);
  if (escalatedOnly) query = query.not("handoff_escalated_at", "is", null);
  if (lowConfidenceOnly) query = query.lt("handoff_confidence_score", 60);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const header = [
    "job_id",
    "status",
    "airport",
    "line_type",
    "customer_email",
    "waiter_email",
    "issue_flag",
    "issue_reason",
    "confidence_score",
    "verification_attempts",
    "escalated_at",
    "reviewed_at",
    "created_at",
  ];

  const lines = (data ?? []).map((r) =>
    [
      r.id,
      r.status,
      r.airport,
      r.line_type,
      r.customer_email,
      r.waiter_email,
      r.handoff_issue_flag ? "true" : "false",
      r.handoff_issue_reason,
      r.handoff_confidence_score,
      r.handoff_verification_attempts ?? 0,
      r.handoff_escalated_at,
      r.handoff_reviewed_at,
      r.created_at,
    ]
      .map(csvEscape)
      .join(",")
  );

  const csv = [header.join(","), ...lines].join("\n");
  const filename = `linecrew-fraud-review-export-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
