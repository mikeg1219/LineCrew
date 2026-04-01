import { saveProfileSettingsAction } from "@/app/profile/actions";
import { BOOKING_CATEGORIES } from "@/lib/jobs/options";
import { parsePhoneFromStored } from "@/lib/phone";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types";
import { NextResponse } from "next/server";

function debugProfileSaveAllowed(): boolean {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.LINECREW_PROFILE_SAVE_DEBUG === "1"
  );
}

/**
 * Dev / explicit-debug only: run the same logic as Profile “Save changes” with
 * optional JSON overrides. Authenticates via Supabase session cookies (same as the app).
 *
 * GET: usage + curl example
 * POST: `{ ...SaveProfileSettingsInput fields optional }` — omitted fields come from DB
 */
export async function GET() {
  if (!debugProfileSaveAllowed()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({
    hint: "POST with your browser Cookie header (Application → Cookies, or copy request from Network).",
    curlExample: [
      'curl -sS -X POST "http://localhost:3000/api/dev/profile-save" \\',
      '  -H "Content-Type: application/json" \\',
      '  -H "Cookie: <paste sb-access-token and related cookies>" \\',
      '  -d "{}"',
    ].join("\n"),
    env: "Set LINECREW_PROFILE_SAVE_DEBUG=1 to enable this route outside NODE_ENV=development.",
  });
}

export async function POST(request: Request) {
  if (!debugProfileSaveAllowed()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "Not signed in — include Supabase session cookies." },
      { status: 401 }
    );
  }

  const { data: profileRow, error: profileErr } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profileErr || !profileRow) {
    return NextResponse.json(
      {
        ok: false,
        error: profileErr?.message ?? "Profile row missing",
      },
      { status: 400 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  const role = profileRow.role as UserRole;
  const parsed = parsePhoneFromStored(profileRow.phone ?? null);
  const preferredFromDb =
    (profileRow as { preferred_categories?: string[] | null })
      .preferred_categories ?? [...BOOKING_CATEGORIES];

  const input = {
    firstName: String(body.firstName ?? profileRow.first_name ?? ""),
    displayName: String(
      body.displayName ?? profileRow.display_name ?? profileRow.full_name ?? ""
    ),
    phoneCountryId: String(body.phoneCountryId ?? parsed.countryId),
    phoneNationalDigits: String(body.phoneNationalDigits ?? parsed.nationalDigits),
    role,
    preferredAirport: String(
      body.preferredAirport ?? profileRow.preferred_airport ?? ""
    ),
    travelerNotes: String(body.travelerNotes ?? profileRow.traveler_notes ?? ""),
    bio: String(body.bio ?? profileRow.bio ?? ""),
    homeAirport: String(body.homeAirport ?? profileRow.home_airport ?? ""),
    servingAirportsText: String(
      body.servingAirportsText ??
        (Array.isArray(profileRow.serving_airports)
          ? profileRow.serving_airports.join(", ")
          : "")
    ),
    waiterPreferredCategories: Array.isArray(body.waiterPreferredCategories)
      ? (body.waiterPreferredCategories as string[])
      : preferredFromDb,
    isAvailable:
      typeof body.isAvailable === "boolean"
        ? body.isAvailable
        : profileRow.is_available !== false,
    avatarStoragePath:
      body.avatarStoragePath !== undefined && body.avatarStoragePath !== null
        ? String(body.avatarStoragePath)
        : (profileRow.avatar_url ?? null),
    waiterManualPayoutPreference:
      body.waiterManualPayoutPreference !== undefined
        ? (body.waiterManualPayoutPreference as string | null)
        : ((profileRow as { contact_preference?: string | null })
            .contact_preference ?? null),
    waiterIndependentContractorConfirmed:
      typeof body.waiterIndependentContractorConfirmed === "boolean"
        ? body.waiterIndependentContractorConfirmed
        : Boolean(
            (
              profileRow as {
                independent_contractor_acknowledged_at?: string | null;
              }
            ).independent_contractor_acknowledged_at
          ),
    waiterTaxResponsibilityConfirmed:
      typeof body.waiterTaxResponsibilityConfirmed === "boolean"
        ? body.waiterTaxResponsibilityConfirmed
        : Boolean(
            (
              profileRow as {
                tax_responsibility_acknowledged_at?: string | null;
              }
            ).tax_responsibility_acknowledged_at
          ),
  };

  const result = await saveProfileSettingsAction(input);
  const status = result.ok ? 200 : 422;
  return NextResponse.json(result, { status });
}
