"use client";

import { ProfileCompletionStatus } from "@/app/profile/profile-completion-status";
import {
  ensureProfileForUser,
  syncEmailVerifiedFromAuth,
} from "@/lib/ensure-profile";
import type { Profile, UserRole } from "@/lib/types";
import {
  buildManualPayoutPreference,
  parseManualPayoutPreference,
  type ManualPayoutMethod,
  waiterCoreFieldsComplete,
} from "@/lib/waiter-profile-complete";
import { BOOKING_CATEGORIES, type BookingCategory } from "@/lib/jobs/options";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  AVATAR_MAX_INPUT_BYTES,
  AVATAR_PROCESSED_MIME,
  AVATAR_STORAGE_BUCKET,
  avatarPublicUrlWithBust,
  userAvatarObjectPath,
  validateAvatarForProcessing,
  validateProcessedAvatarBlob,
} from "@/lib/avatar-storage";
import { AvatarCropModal } from "@/components/avatar-crop-modal";
import { getCroppedSquareJpegBlob } from "@/lib/crop-image";
import { AVATAR_MAX_DIMENSION, processAvatarImageToJpeg } from "@/lib/process-avatar-image";
import type { Area } from "react-easy-crop";

import { WaiterPayoutSetup } from "@/app/dashboard/waiter/waiter-payout-setup";
import { saveProfileSettingsAction } from "@/app/profile/actions";
import { refreshStripeConnectStatusAction } from "@/app/profile/stripe-refresh-actions";
import {
  DEFAULT_PHONE_COUNTRY_ID,
  formatUsNationalDisplay,
  getPhoneCountry,
  isValidE164ForStorage,
  normalizePhoneE164,
  parsePhoneFromStored,
  PHONE_COUNTRIES,
} from "@/lib/phone";
import { LEGAL_PATHS } from "@/lib/legal";

export type ProfileHeroFallback = {
  display: string;
  email: string | null;
  roleLabel: string;
  initial: string;
  avatarUrl: string | null;
};

function logProfileError(
  context: string,
  err: unknown,
  meta?: Record<string, unknown>
) {
  if (process.env.NODE_ENV !== "development") return;
  const e = err as {
    code?: string;
    message?: string;
    details?: string;
    hint?: string;
  };
  console.error(`[profile] ${context}`, {
    code: e?.code,
    message: e?.message,
    details: e?.details,
    hint: e?.hint,
    err: err ?? null,
    ...meta,
  });
}

/** Always logs — pair with server `[profile/save]` logs to debug failed updates. */
function logProfileSaveFailureClient(meta: {
  kind?: string;
  phoneError?: boolean;
}) {
  console.error("[profile/save] client: save failed", {
    ...meta,
    hint: "Check server/Vercel logs for [profile/save] supabase_update or zero_rows.",
  });
}

const SAVE_FAILED_MSG =
  "We couldn't save your profile changes. Please try again.";

/** Server / unknown save failure (bottom of form). */
const PROFILE_SAVE_ERROR_ID = "profile-save-error";

/** Inline field errors (aria-errormessage targets). */
const PROFILE_FIELD_ERROR_IDS = {
  firstName: "profile-error-first-name",
  bio: "profile-error-bio",
  homeAirport: "profile-error-home-airport",
  servingAirports: "profile-error-serving-airports",
  legal: "profile-error-legal",
} as const;

const inlineFieldErrorClass = "mt-2 text-sm text-red-600";
const SAVE_SUCCESS_MSG = "Profile saved successfully";
const AVATAR_UPLOAD_FAILED_MSG =
  "We couldn't upload your photo. Please try again.";

const AIRPORTS_CATEGORY: BookingCategory = "Airports";

function RequiredAsterisk() {
  return (
    <span className="ml-0.5 text-red-500" aria-hidden>
      *
    </span>
  );
}

/** Which control a save error applies to (for aria-invalid / aria-errormessage). */
type ProfileSaveFieldError =
  | "firstName"
  | "bio"
  | "homeAirport"
  | "servingAirports"
  | "legal"
  | "generic";

type ProfileSaveFeedback =
  | null
  | { status: "success" }
  | {
      status: "error";
      message: string;
      field?: ProfileSaveFieldError;
    };

const inputClass =
  "min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-[15px] text-slate-900 shadow-sm outline-none ring-blue-600/15 transition focus:border-blue-600 focus:ring-[3px] sm:min-h-0 sm:text-sm";

const labelClass =
  "mb-1.5 block text-sm font-medium leading-snug text-slate-700";

const sectionShell =
  "rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm ring-1 ring-slate-900/5 sm:p-8";

const sectionTitle = "text-base font-semibold tracking-tight text-slate-900";

const sectionDesc = "mt-1.5 text-sm leading-relaxed text-slate-600";

function ProfileHeroCard({
  photoSrc,
  initial,
  display,
  email,
  roleBadge,
  busy,
}: {
  photoSrc: string | null;
  initial: string;
  display: string;
  email: string | null;
  roleBadge: string;
  busy?: boolean;
}) {
  return (
    <section
      className="relative mb-10 overflow-hidden rounded-3xl border border-slate-200/90 bg-gradient-to-br from-white via-slate-50/90 to-blue-50/40 p-6 shadow-sm ring-1 ring-slate-900/5 sm:p-10"
      aria-busy={busy}
    >
      <div
        className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-blue-400/15 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-12 -left-12 size-48 rounded-full bg-indigo-400/10 blur-3xl"
        aria-hidden
      />
      <div className="relative flex flex-col items-center gap-8 text-center sm:flex-row sm:items-center sm:text-left">
        <div className="relative shrink-0">
          <span
            className="absolute -inset-1 rounded-full bg-gradient-to-br from-blue-500/25 via-transparent to-indigo-500/20 blur-md"
            aria-hidden
          />
          {photoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoSrc}
              alt=""
              className="relative size-28 rounded-full object-cover shadow-xl ring-4 ring-white sm:size-32"
            />
          ) : (
            <div className="relative flex size-28 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 text-3xl font-bold text-white shadow-xl ring-4 ring-white sm:size-32 sm:text-4xl">
              {initial}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
            {display}
          </p>
          {email ? (
            <p className="mt-2 truncate text-sm text-slate-600">{email}</p>
          ) : null}
          <p className="mt-4 flex justify-center sm:justify-start">
            <span className="inline-flex rounded-full bg-white/90 px-3.5 py-1.5 text-xs font-semibold text-blue-900 shadow-sm ring-1 ring-blue-200/80">
              {roleBadge}
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}

export function ProfileSettingsForm({
  compactAvatar = false,
  heroFallback,
  stripeSyncForce = false,
}: {
  /** When true, avatar upload is a compact row (use when a hero shows the photo). */
  compactAvatar?: boolean;
  /** Server snapshot for hero before client profile load (dashboard profile page). */
  heroFallback?: ProfileHeroFallback;
  /** From ?connect=return|refresh after Stripe — triggers Connect flag refresh on load. */
  stripeSyncForce?: boolean;
} = {}) {
  const supabase = createClient();
  const router = useRouter();
  const pathname = usePathname();
  /** Match Stripe Connect allowlist — return here after onboarding. */
  const stripeConnectReturnTo =
    pathname === "/profile" ? "/profile" : "/dashboard/profile";
  const fileRef = useRef<HTMLInputElement>(null);
  const previewBlobRef = useRef<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarPhase, setAvatarPhase] = useState<
    "idle" | "preparing" | "uploading"
  >("idle");
  const [cropModal, setCropModal] = useState<{
    src: string;
    file: File;
  } | null>(null);
  /** Avatar / crop / storage messages only — not profile form save (see saveFeedback). */
  const [message, setMessage] = useState("");
  const [saveFeedback, setSaveFeedback] = useState<ProfileSaveFeedback>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [avatarPublicUrl, setAvatarPublicUrl] = useState<string | null>(null);
  const [avatarStoragePath, setAvatarStoragePath] = useState<string | null>(null);
  const [previewObjectUrl, setPreviewObjectUrl] = useState<string | null>(null);

  const [firstName, setFirstName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [phoneCountryId, setPhoneCountryId] = useState(DEFAULT_PHONE_COUNTRY_ID);
  const [phoneNationalDigits, setPhoneNationalDigits] = useState("");
  const [phoneError, setPhoneError] = useState("");

  const [preferredAirport, setPreferredAirport] = useState("");
  const [travelerNotes, setTravelerNotes] = useState("");

  const [bio, setBio] = useState("");
  const [homeAirport, setHomeAirport] = useState("");
  const [servingAirportsText, setServingAirportsText] = useState("");
  const [waiterPreferredCategories, setWaiterPreferredCategories] = useState<string[]>([]);
  const [isAvailable, setIsAvailable] = useState(true);
  const [profileCompleted, setProfileCompleted] = useState<boolean | null>(null);
  const [emailVerifiedAt, setEmailVerifiedAt] = useState<string | null>(null);
  const [authEmailConfirmedAt, setAuthEmailConfirmedAt] = useState<
    string | null
  >(null);
  const [stripeAccountId, setStripeAccountId] = useState<string | null>(null);
  const [stripeDetailsSubmitted, setStripeDetailsSubmitted] = useState<
    boolean | null
  >(null);
  const [stripePayoutsEnabled, setStripePayoutsEnabled] = useState<
    boolean | null
  >(null);
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(
    null
  );
  const [manualPayoutMethod, setManualPayoutMethod] = useState<
    ManualPayoutMethod | ""
  >("");
  const [manualPayoutHandle, setManualPayoutHandle] = useState("");
  const [acceptedTermsVersion, setAcceptedTermsVersion] = useState<string | null>(
    null
  );
  const [acceptedPrivacyVersion, setAcceptedPrivacyVersion] = useState<
    string | null
  >(null);
  const [acceptedWorkerAgreementVersion, setAcceptedWorkerAgreementVersion] =
    useState<string | null>(null);
  const [acceptedRefundPolicyVersion, setAcceptedRefundPolicyVersion] = useState<
    string | null
  >(null);
  const [acceptedGuidelinesVersion, setAcceptedGuidelinesVersion] = useState<
    string | null
  >(null);
  const [workerIndependentContractorConfirmed, setWorkerIndependentContractorConfirmed] =
    useState(false);
  const [workerTaxResponsibilityConfirmed, setWorkerTaxResponsibilityConfirmed] =
    useState(false);
  /** Shown when Stripe→DB sync fails after load (e.g. ?connect=return). */
  const [stripeConnectSyncError, setStripeConnectSyncError] = useState<
    string | null
  >(null);

  const phoneE164ForCompletion = useMemo(() => {
    const r = normalizePhoneE164(phoneCountryId, phoneNationalDigits);
    return r.ok && r.e164 ? r.e164 : "";
  }, [phoneCountryId, phoneNationalDigits]);

  /** When checked, Home base + Service areas are required (Line Holder). */
  const airportsCategorySelected = useMemo(
    () => waiterPreferredCategories.includes(AIRPORTS_CATEGORY),
    [waiterPreferredCategories]
  );

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (!opts?.silent) setLoading(false);
        return;
      }
      setUserId(user.id);
      setUserEmail(user.email ?? null);
      setAuthEmailConfirmedAt(user.email_confirmed_at ?? null);
      await ensureProfileForUser(
        supabase,
        user.id,
        user.user_metadata as Record<string, unknown> | undefined
      );
      await syncEmailVerifiedFromAuth(supabase, user);
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (data) {
        const p = data as Profile;
        setRole(p.role);
        setFirstName(p.first_name ?? "");
        setDisplayName(p.display_name ?? p.full_name ?? "");
        const parsed = parsePhoneFromStored(p.phone ?? null);
        setPhoneCountryId(parsed.countryId);
        setPhoneNationalDigits(parsed.nationalDigits);
        setPhoneError("");
        setPreferredAirport(p.preferred_airport ?? "");
        setTravelerNotes(p.traveler_notes ?? "");
        setBio(p.bio ?? "");
        setHomeAirport(p.home_airport ?? "");
        setServingAirportsText((p.serving_airports ?? []).join(", "));
        setWaiterPreferredCategories(
          (p as { preferred_categories?: string[] | null }).preferred_categories ??
            [...BOOKING_CATEGORIES]
        );
        setIsAvailable(p.is_available !== false);
        setProfileCompleted(p.profile_completed ?? null);
        setEmailVerifiedAt(p.email_verified_at ?? null);
        setStripeAccountId(p.stripe_account_id ?? null);
        setStripeDetailsSubmitted(
          (p as { stripe_details_submitted?: boolean | null })
            .stripe_details_submitted ?? null
        );
        setStripePayoutsEnabled(
          (p as { stripe_payouts_enabled?: boolean | null })
            .stripe_payouts_enabled ?? null
        );
        setOnboardingCompleted(p.onboarding_completed ?? null);
        const manualPayout = parseManualPayoutPreference(
          (p as { contact_preference?: string | null }).contact_preference ?? null
        );
        setManualPayoutMethod(manualPayout?.method ?? "");
        setManualPayoutHandle(manualPayout?.handle ?? "");
        setAcceptedTermsVersion(
          (p as { accepted_terms_version?: string | null }).accepted_terms_version ??
            null
        );
        setAcceptedPrivacyVersion(
          (p as { accepted_privacy_version?: string | null }).accepted_privacy_version ??
            null
        );
        setAcceptedWorkerAgreementVersion(
          (p as { accepted_worker_agreement_version?: string | null })
            .accepted_worker_agreement_version ?? null
        );
        setAcceptedRefundPolicyVersion(p.accepted_refund_policy_version ?? null);
        setAcceptedGuidelinesVersion(p.accepted_guidelines_version ?? null);
        setWorkerIndependentContractorConfirmed(
          Boolean(
            (p as { independent_contractor_acknowledged_at?: string | null })
              .independent_contractor_acknowledged_at
          )
        );
        setWorkerTaxResponsibilityConfirmed(
          Boolean(
            (p as { tax_responsibility_acknowledged_at?: string | null })
              .tax_responsibility_acknowledged_at
          )
        );
        const path = p.avatar_url ?? null;
        setAvatarStoragePath(path);
        if (path) {
          const { data: pub } = supabase.storage
            .from(AVATAR_STORAGE_BUCKET)
            .getPublicUrl(path);
          setAvatarPublicUrl(
            avatarPublicUrlWithBust(pub.publicUrl, p.updated_at ?? null)
          );
        } else {
          setAvatarPublicUrl(null);
        }

        const accountId = p.stripe_account_id ?? "";
        const detailsSubmitted =
          (p as { stripe_details_submitted?: boolean | null })
            .stripe_details_submitted ?? null;
        const payoutsEnabled =
          (p as { stripe_payouts_enabled?: boolean | null })
            .stripe_payouts_enabled ?? null;
        if (
          p.role === "waiter" &&
          accountId.trim() !== ""
        ) {
          const needsSync =
            detailsSubmitted == null || payoutsEnabled == null;
          const stillIncomplete =
            detailsSubmitted !== true || payoutsEnabled !== true;
          if (stripeSyncForce || needsSync || stillIncomplete) {
            setStripeConnectSyncError(null);
            const r = await refreshStripeConnectStatusAction({
              force: stripeSyncForce,
            });
            if (r.ok) {
              setStripeDetailsSubmitted(r.stripe_details_submitted);
              setStripePayoutsEnabled(r.stripe_payouts_enabled);
            } else {
              console.error("[profile] Stripe Connect sync after load failed", {
                error: r.error,
                stripeSyncForce,
              });
              setStripeConnectSyncError(
                stripeSyncForce
                  ? `We couldn't confirm your payout status after returning from Stripe. ${r.error}`
                  : `Couldn't refresh your Stripe payout status. ${r.error}`
              );
            }
          } else {
            setStripeConnectSyncError(null);
          }
        } else {
          setStripeConnectSyncError(null);
        }
      }
      if (!opts?.silent) setLoading(false);
    },
    [supabase, stripeSyncForce]
  );

  useEffect(() => {
    const run = () => {
      void load();
    };
    queueMicrotask(run);
  }, [load]);

  useEffect(() => {
    if (saveFeedback?.status !== "success") return;
    const id = window.setTimeout(() => {
      setSaveFeedback(null);
    }, 3000);
    return () => window.clearTimeout(id);
  }, [saveFeedback]);

  useEffect(() => {
    return () => {
      if (previewBlobRef.current) {
        URL.revokeObjectURL(previewBlobRef.current);
        previewBlobRef.current = null;
      }
    };
  }, []);

  const clearPreviewBlob = useCallback(() => {
    if (previewBlobRef.current) {
      URL.revokeObjectURL(previewBlobRef.current);
      previewBlobRef.current = null;
    }
    setPreviewObjectUrl(null);
  }, []);

  const closeCropModal = useCallback(() => {
    setCropModal((prev) => {
      if (prev?.src) URL.revokeObjectURL(prev.src);
      return null;
    });
  }, []);

  const runAvatarUpload = useCallback(
    async (file: File) => {
      if (!userId) return;
      setMessage("");
      setAvatarPhase("preparing");

      let processed: Blob;
      try {
        processed = await processAvatarImageToJpeg(file);
      } catch (err) {
        logProfileError("avatar process", err);
        setAvatarPhase("idle");
        setMessage(
          "We couldn't read that image. Try a different JPG, PNG, WebP, or GIF."
        );
        if (fileRef.current) fileRef.current.value = "";
        return;
      }

      const sizeOk = validateProcessedAvatarBlob(processed);
      if (!sizeOk.ok) {
        setAvatarPhase("idle");
        setMessage(sizeOk.message);
        if (fileRef.current) fileRef.current.value = "";
        return;
      }

      clearPreviewBlob();
      const localUrl = URL.createObjectURL(processed);
      previewBlobRef.current = localUrl;
      setPreviewObjectUrl(localUrl);

      setAvatarPhase("uploading");
      const path = userAvatarObjectPath(userId, AVATAR_PROCESSED_MIME);
      const { error: upErr } = await supabase.storage
        .from(AVATAR_STORAGE_BUCKET)
        .upload(path, processed, {
          upsert: true,
          contentType: AVATAR_PROCESSED_MIME,
        });

      if (upErr) {
        setAvatarPhase("idle");
        clearPreviewBlob();
        logProfileError("avatar upload", upErr);
        const raw = upErr.message ?? "";
        setMessage(
          raw.includes("Bucket not found") || raw.includes("not found")
            ? "Photo storage is not set up yet. Ask your admin to create the avatars bucket in Supabase."
            : AVATAR_UPLOAD_FAILED_MSG
        );
        if (fileRef.current) fileRef.current.value = "";
        return;
      }

      const { error: dbErr } = await supabase
        .from("profiles")
        .update({ avatar_url: path })
        .eq("id", userId);

      if (dbErr) {
        setAvatarPhase("idle");
        clearPreviewBlob();
        logProfileError("avatar db update", dbErr);
        setMessage(AVATAR_UPLOAD_FAILED_MSG);
        if (fileRef.current) fileRef.current.value = "";
        return;
      }

      const { data: row } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();
      if (row) {
        await supabase
          .from("profiles")
          .update({
            onboarding_completed: waiterCoreFieldsComplete(row),
          })
          .eq("id", userId);
      }

      clearPreviewBlob();
      setAvatarStoragePath(path);
      const { data } = supabase.storage
        .from(AVATAR_STORAGE_BUCKET)
        .getPublicUrl(path);
      setAvatarPublicUrl(avatarPublicUrlWithBust(data.publicUrl, Date.now()));
      setAvatarPhase("idle");
      if (fileRef.current) fileRef.current.value = "";
      setMessage("__avatar_saved__");
      await load({ silent: true });
      router.refresh();
    },
    [userId, supabase, clearPreviewBlob, load, router]
  );

  function handleAvatarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    const check = validateAvatarForProcessing(file);
    if (!check.ok) {
      setMessage(check.message);
      e.target.value = "";
      return;
    }

    setMessage("");
    setCropModal({ src: URL.createObjectURL(file), file });
    e.target.value = "";
  }

  async function applyCroppedAvatar(pixels: Area) {
    const src = cropModal?.src;
    if (!src) return;
    try {
      const blob = await getCroppedSquareJpegBlob(src, pixels);
      closeCropModal();
      await runAvatarUpload(
        new File([blob], "avatar.jpg", { type: "image/jpeg" })
      );
    } catch (err) {
      logProfileError("avatar crop", err);
      setMessage(AVATAR_UPLOAD_FAILED_MSG);
      closeCropModal();
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !role) return;

    setSaving(true);
    setMessage("");
    setSaveFeedback(null);
    setPhoneError("");

    const fn = firstName.trim();
    const dn = displayName.trim();
    const phoneNorm = normalizePhoneE164(phoneCountryId, phoneNationalDigits);
    if (!phoneNorm.ok) {
      setPhoneError(phoneNorm.message);
      setSaving(false);
      return;
    }
    const ph = phoneNorm.e164;
    if (!isValidE164ForStorage(ph)) {
      setPhoneError("Enter a valid phone number.");
      setSaving(false);
      logProfileError("profile save phone validation", null, {
        phoneNormOk: phoneNorm.ok,
        phoneLen: ph?.length ?? 0,
      });
      return;
    }
    if (!fn) {
      setSaveFeedback({
        status: "error",
        message: "First name is required.",
      });
      setSaving(false);
      return;
    }
    if (role === "waiter" && !bio.trim()) {
      setSaveFeedback({
        status: "error",
        message: "Bio is required.",
      });
      setSaving(false);
      return;
    }
    if (role === "waiter" && airportsCategorySelected) {
      if (!homeAirport.trim()) {
        setSaveFeedback({
          status: "error",
          message:
            "Home base is required when Airports is selected in Preferred request categories.",
        });
        setSaving(false);
        return;
      }
      if (!servingAirportsText.trim()) {
        setSaveFeedback({
          status: "error",
          message:
            "Service areas are required when Airports is selected in Preferred request categories.",
        });
        setSaving(false);
        return;
      }
    }
    if (
      role === "waiter" &&
      (!workerIndependentContractorConfirmed || !workerTaxResponsibilityConfirmed)
    ) {
      setSaveFeedback({
        status: "error",
        message:
          "Please confirm the legal acknowledgments in the Line Holder section before saving.",
      });
      setSaving(false);
      return;
    }

    const result = await saveProfileSettingsAction({
      firstName: fn,
      displayName: dn,
      phoneCountryId,
      phoneNationalDigits,
      role,
      preferredAirport,
      travelerNotes,
      bio,
      homeAirport,
      servingAirportsText,
      waiterPreferredCategories,
      isAvailable,
      avatarStoragePath,
      waiterManualPayoutPreference: buildManualPayoutPreference(
        manualPayoutMethod,
        manualPayoutHandle
      ),
      waiterIndependentContractorConfirmed: workerIndependentContractorConfirmed,
      waiterTaxResponsibilityConfirmed: workerTaxResponsibilityConfirmed,
    });

    if (!result.ok) {
      if ("phoneError" in result && result.phoneError) {
        setPhoneError(result.phoneError);
      } else {
        logProfileError("profile save action", null, {
          kind: "kind" in result ? result.kind : undefined,
        });
        logProfileSaveFailureClient({
          kind: "kind" in result ? String(result.kind) : undefined,
        });
        setSaveFeedback({
          status: "error",
          message: SAVE_FAILED_MSG,
          field: "generic",
        });
      }
      setSaving(false);
      return;
    }

    setSaveFeedback({ status: "success" });
    setSaving(false);
    await load({ silent: true });
    router.refresh();
  }

  if (loading && !heroFallback) {
    return (
      <p className="text-center text-sm text-slate-500">Loading profile…</p>
    );
  }

  if (loading && heroFallback) {
    return (
      <div className="space-y-6">
        <ProfileHeroCard
          photoSrc={heroFallback.avatarUrl}
          initial={heroFallback.initial}
          display={heroFallback.display}
          email={heroFallback.email}
          roleBadge={heroFallback.roleLabel}
          busy
        />
        <p className="text-center text-sm text-slate-500">Loading profile…</p>
      </div>
    );
  }

  const dashboardHref =
    role === "waiter"
      ? "/dashboard/waiter"
      : role === "customer"
        ? "/dashboard/customer"
        : "/dashboard";

  const servingCodesParsed = servingAirportsText
    .split(/[,;\s]+/)
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
  const servingCodesUnique = [...new Set(servingCodesParsed)];

  const avatarInitial = (
    displayName.trim() || firstName.trim() || userEmail?.[0] || "?"
  )
    .toString()
    .charAt(0)
    .toUpperCase();

  const accountIntro =
    role === "customer"
      ? "Your email stays read-only. First name, display name, and phone shape how travelers and Line Holders see you (photo is above)."
      : "Your email stays read-only. First name, display name, and phone shape your Line Holder profile (photo is above).";

  const heroPhotoSrc =
    previewObjectUrl || avatarPublicUrl || heroFallback?.avatarUrl || null;
  const heroHeading =
    displayName.trim() ||
    firstName.trim() ||
    userEmail?.split("@")[0] ||
    heroFallback?.display ||
    "Account";
  const heroEmailLine = userEmail ?? heroFallback?.email ?? null;
  const heroBadge =
    role === "waiter"
      ? "Line Holder"
      : role === "customer"
        ? "Customer"
        : heroFallback?.roleLabel ?? "Account";
  const heroInitialChar = (
    heroHeading.slice(0, 1) ||
    heroFallback?.initial ||
    "?"
  ).toUpperCase();

  const avatarBusy = avatarPhase !== "idle";

  const isNanp = getPhoneCountry(phoneCountryId)?.nanp ?? true;

  const profileSaveError =
    saveFeedback?.status === "error" ? saveFeedback : null;
  const firstNameSaveInvalid = profileSaveError?.field === "firstName";
  const bioSaveInvalid = profileSaveError?.field === "bio";
  const homeAirportSaveInvalid = profileSaveError?.field === "homeAirport";
  const servingAirportsSaveInvalid =
    profileSaveError?.field === "servingAirports";
  const legalAckSaveInvalid = profileSaveError?.field === "legal";

  const showGenericSaveError =
    saveFeedback?.status === "error" &&
    (saveFeedback.field === "generic" || saveFeedback.field === undefined);

  return (
    <>
    <form onSubmit={handleSubmit} className="space-y-8 sm:space-y-10">
      {compactAvatar ? (
        <ProfileHeroCard
          photoSrc={heroPhotoSrc}
          initial={heroInitialChar}
          display={heroHeading}
          email={heroEmailLine}
          roleBadge={heroBadge}
          busy={avatarBusy}
        />
      ) : null}

      <p>
        <Link
          href={dashboardHref}
          className="inline-flex min-h-[44px] items-center text-sm font-medium text-blue-700 transition hover:text-blue-800"
        >
          ← Back to dashboard
        </Link>
      </p>

      {stripeConnectSyncError ? (
        <div
          className="mb-6 rounded-xl border border-red-200 bg-red-50/95 px-4 py-3 text-sm leading-relaxed text-red-950 shadow-sm"
          role="alert"
        >
          <p className="font-medium">Payout status didn&apos;t sync</p>
          <p className="mt-1.5 text-red-900/95">{stripeConnectSyncError}</p>
          <p className="mt-2 text-xs text-red-800/90">
            Try{" "}
            <span className="font-semibold text-red-950">
              Refresh Stripe status now
            </span>{" "}
            in the Payouts section below.
          </p>
        </div>
      ) : null}

      {role === "customer" && (
        <ProfileCompletionStatus
          role="customer"
          firstName={firstName}
          displayName={displayName}
          phone={phoneE164ForCompletion}
          profileCompletedFlag={profileCompleted}
        />
      )}
      {role === "waiter" && (
        <ProfileCompletionStatus
          role="waiter"
          firstName={firstName}
          phone={phoneE164ForCompletion}
          bio={bio}
          avatarPath={avatarStoragePath}
          servingCodes={servingCodesUnique}
          onboardingCompleted={onboardingCompleted}
          emailVerifiedAt={emailVerifiedAt}
          authEmailConfirmedAt={authEmailConfirmedAt}
          stripeAccountId={stripeAccountId}
          stripeDetailsSubmitted={stripeDetailsSubmitted}
          stripePayoutsEnabled={stripePayoutsEnabled}
          contactPreference={buildManualPayoutPreference(
            manualPayoutMethod,
            manualPayoutHandle
          )}
        />
      )}

      <section className={sectionShell} aria-labelledby="section-photo">
        <div className="border-b border-slate-100 pb-5">
          <h2 id="section-photo" className={sectionTitle}>
            Photo
          </h2>
          <p className={sectionDesc}>
            {compactAvatar ? (
              <>
                Your photo is shown in the profile header above — only the upload
                controls are here so it isn&apos;t duplicated. Uploads save when you
                pick a file. Use{" "}
                <span className="font-medium text-slate-800">Save changes</span>{" "}
                below for your name and other profile fields.
              </>
            ) : (
              <>
                Uploads save when you pick a file. Use{" "}
                <span className="font-medium text-slate-800">Save changes</span>{" "}
                below for your name and other profile fields.
              </>
            )}
          </p>
        </div>

        <div className="mt-6">
          <div>
            <span className={labelClass}>Profile photo</span>
            {compactAvatar ? (
              <div className="mt-3 max-w-md space-y-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="sr-only"
                  onChange={handleAvatarFile}
                />
                <button
                  type="button"
                  disabled={avatarBusy}
                  aria-busy={avatarBusy}
                  onClick={() => fileRef.current?.click()}
                  className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-60 sm:w-auto"
                >
                  {avatarPhase === "preparing"
                    ? "Preparing…"
                    : avatarPhase === "uploading"
                      ? "Uploading…"
                      : avatarStoragePath
                        ? "Change photo"
                        : "Upload photo"}
                </button>
                {avatarPhase === "preparing" ? (
                  <p
                    className="text-xs font-medium text-blue-800 sm:text-sm"
                    role="status"
                    aria-live="polite"
                  >
                    Preparing photo…
                  </p>
                ) : avatarPhase === "uploading" ? (
                  <p
                    className="text-xs font-medium text-blue-800 sm:text-sm"
                    role="status"
                    aria-live="polite"
                  >
                    Uploading photo…
                  </p>
                ) : (
                  <p className="text-xs leading-relaxed text-slate-500 sm:text-sm">
                    JPG, PNG, WebP, or GIF (originals up to{" "}
                    {Math.round(AVATAR_MAX_INPUT_BYTES / (1024 * 1024))} MB).
                    We resize to max {AVATAR_MAX_DIMENSION}px and compress before
                    upload.
                  </p>
                )}
              </div>
            ) : (
              <div className="mt-3 flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:gap-6">
                <div className="relative shrink-0">
                  {heroPhotoSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={heroPhotoSrc}
                      alt="Your profile photo"
                      className="h-28 w-28 rounded-full border-2 border-slate-200/90 object-cover shadow-md sm:h-24 sm:w-24"
                    />
                  ) : (
                    <div
                      className="flex h-28 w-28 items-center justify-center rounded-full border-2 border-slate-200 bg-slate-100 text-2xl font-semibold text-slate-600 shadow-inner sm:h-24 sm:w-24"
                      aria-hidden
                    >
                      {avatarInitial}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="sr-only"
                    onChange={handleAvatarFile}
                  />
                  <button
                    type="button"
                    disabled={avatarBusy}
                    aria-busy={avatarBusy}
                    onClick={() => fileRef.current?.click()}
                    className="inline-flex min-h-[44px] items-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
                  >
                    {avatarPhase === "preparing"
                      ? "Preparing…"
                      : avatarPhase === "uploading"
                        ? "Uploading…"
                        : avatarStoragePath
                          ? "Change photo"
                          : "Upload photo"}
                  </button>
                  {avatarPhase === "preparing" ? (
                    <p
                      className="text-xs font-medium text-blue-800 sm:text-sm"
                      role="status"
                      aria-live="polite"
                    >
                      Preparing photo…
                    </p>
                  ) : avatarPhase === "uploading" ? (
                    <p
                      className="text-xs font-medium text-blue-800 sm:text-sm"
                      role="status"
                      aria-live="polite"
                    >
                      Uploading photo…
                    </p>
                  ) : (
                    <p className="text-xs leading-relaxed text-slate-500 sm:text-sm">
                      JPG, PNG, WebP, or GIF (originals up to{" "}
                      {Math.round(AVATAR_MAX_INPUT_BYTES / (1024 * 1024))} MB).
                      We resize to max {AVATAR_MAX_DIMENSION}px and compress before
                      upload.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
          {message ? (
            <div
              className={`mt-4 rounded-xl px-4 py-3 text-sm ${
                message === "__avatar_saved__"
                  ? "border border-emerald-200/80 bg-emerald-50/90 text-emerald-900"
                  : "border border-red-200/80 bg-red-50/90 text-red-800"
              }`}
              role="status"
            >
              {message === "__avatar_saved__" ? "Photo updated" : message}
            </div>
          ) : null}
        </div>
      </section>

      <section className={sectionShell} aria-labelledby="section-account">
        <div className="border-b border-slate-100 pb-5">
          <h2 id="section-account" className={sectionTitle}>
            Account
          </h2>
          <p className={sectionDesc}>{accountIntro}</p>
        </div>

        <div className="mt-6 space-y-6">
          <div>
            <label htmlFor="first_name" className={labelClass}>
              First name
              <RequiredAsterisk />
            </label>
            <input
              id="first_name"
              value={firstName}
              onChange={(e) => {
                setFirstName(e.target.value);
                setSaveFeedback((prev) =>
                  prev?.status === "error" && prev.field === "firstName"
                    ? null
                    : prev
                );
              }}
              autoComplete="given-name"
              className={inputClass}
              placeholder="Legal or preferred first name"
              required
              aria-required
              aria-invalid={firstNameSaveInvalid || undefined}
              aria-errormessage={
                firstNameSaveInvalid
                  ? PROFILE_FIELD_ERROR_IDS.firstName
                  : undefined
              }
            />
            {firstNameSaveInvalid && profileSaveError ? (
              <p
                id={PROFILE_FIELD_ERROR_IDS.firstName}
                className={inlineFieldErrorClass}
                role="alert"
              >
                {profileSaveError.message}
              </p>
            ) : null}
          </div>
          <div>
            <label htmlFor="display_name" className={labelClass}>
              Display name
            </label>
            <p className="mb-1.5 text-xs text-slate-500 sm:text-[13px]">
              Shown on bookings and to Line Holders—separate from your first
              name.
            </p>
            <input
              id="display_name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              autoComplete="nickname"
              className={inputClass}
              placeholder="How you want to appear"
            />
          </div>
          <div>
            <label htmlFor="email_ro" className={labelClass}>
              Email
            </label>
            <p className="mb-1.5 text-xs text-slate-500 sm:text-[13px]">
              Read-only. Contact support if you need to change your sign-in
              email.
            </p>
            <input
              id="email_ro"
              value={userEmail ?? ""}
              disabled
              readOnly
              autoComplete="email"
              className={`${inputClass} bg-slate-50 text-slate-600`}
            />
          </div>
          <div>
            <span className={labelClass} id="phone-label">
              Phone
              <RequiredAsterisk />
            </span>
            <p className="mb-2 text-xs text-slate-500 sm:text-[13px]">
              Saved in international format (E.164) for SMS and bookings.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-3">
              <div className="w-full shrink-0 sm:max-w-[min(100%,14rem)]">
                <label htmlFor="phone_country" className="sr-only">
                  Country code
                </label>
                <select
                  id="phone_country"
                  value={phoneCountryId}
                  onChange={(e) => {
                    setPhoneCountryId(e.target.value);
                    setPhoneError("");
                  }}
                  className={inputClass}
                  aria-labelledby="phone-label"
                >
                  {PHONE_COUNTRIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="min-w-0 flex-1">
                <label htmlFor="phone_national" className="sr-only">
                  Phone number
                </label>
                <input
                  id="phone_national"
                  type="tel"
                  inputMode={isNanp ? "numeric" : "tel"}
                  autoComplete={isNanp ? "tel-national" : "tel"}
                  value={
                    isNanp
                      ? formatUsNationalDisplay(phoneNationalDigits)
                      : phoneNationalDigits
                  }
                  onChange={(e) => {
                    setPhoneError("");
                    const c = getPhoneCountry(phoneCountryId);
                    if (c?.nanp) {
                      setPhoneNationalDigits(
                        e.target.value.replace(/\D/g, "").slice(0, 10)
                      );
                    } else {
                      setPhoneNationalDigits(
                        e.target.value.replace(/\D/g, "").slice(0, 15)
                      );
                    }
                  }}
                  placeholder={isNanp ? "(555) 123-4567" : "National number"}
                  className={inputClass}
                  required
                  aria-required
                  aria-invalid={phoneError ? true : undefined}
                  aria-errormessage={phoneError ? "phone-error" : undefined}
                />
              </div>
            </div>
            {phoneError ? (
              <p
                id="phone-error"
                className="mt-2 text-sm text-red-600"
                role="alert"
              >
                {phoneError}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      {role === "customer" && (
        <section className={sectionShell} aria-labelledby="section-traveler">
          <div className="border-b border-slate-100 pb-5">
            <h2 id="section-traveler" className={sectionTitle}>
              Traveler preferences
            </h2>
            <p className={sectionDesc}>
              Optional defaults for line requests and bookings. You can change
              details per booking when you post a job.
            </p>
          </div>
          <div className="mt-6 space-y-6">
            <div>
              <label htmlFor="preferred_airport" className={labelClass}>
                Preferred airport
              </label>
              <input
                id="preferred_airport"
                value={preferredAirport}
                onChange={(e) => setPreferredAirport(e.target.value)}
                className={inputClass}
                placeholder="e.g. LAX"
              />
            </div>
            <div>
              <label htmlFor="traveler_notes" className={labelClass}>
                Traveler notes
              </label>
              <textarea
                id="traveler_notes"
                value={travelerNotes}
                onChange={(e) => setTravelerNotes(e.target.value)}
                rows={4}
                className={inputClass}
                placeholder="Accessibility, timing, or other context"
              />
            </div>
          </div>
        </section>
      )}

      {role === "waiter" && (
        <section className={sectionShell} aria-labelledby="section-waiter">
          <div className="border-b border-slate-100 pb-5">
            <h2 id="section-waiter" className={sectionTitle}>Line Holder</h2>
            <p className={sectionDesc}>
              Service area, category preferences, and availability for bookings.
              Set up Stripe or manual payouts in{" "}
              <span className="font-medium text-slate-800">
                How do you want to get paid?
              </span>{" "}
              below.
            </p>
          </div>
          <div className="mt-6 space-y-6">
            <div>
              <label htmlFor="bio" className={labelClass}>
                Bio
                <RequiredAsterisk />
              </label>
              <textarea
                id="bio"
                value={bio}
                onChange={(e) => {
                  setBio(e.target.value);
                  setSaveFeedback((prev) =>
                    prev?.status === "error" && prev.field === "bio"
                      ? null
                      : prev
                  );
                }}
                rows={4}
                className={inputClass}
                placeholder="Short intro for travelers"
                required
                aria-required
                aria-invalid={bioSaveInvalid || undefined}
                aria-errormessage={
                  bioSaveInvalid ? PROFILE_FIELD_ERROR_IDS.bio : undefined
                }
              />
              {bioSaveInvalid && profileSaveError ? (
                <p
                  id={PROFILE_FIELD_ERROR_IDS.bio}
                  className={inlineFieldErrorClass}
                  role="alert"
                >
                  {profileSaveError.message}
                </p>
              ) : null}
            </div>
            <fieldset className="min-w-0 border-0 p-0">
              <legend className={labelClass}>Preferred request categories</legend>
              <p
                id="waiter-categories-airports-note"
                className="mb-2 mt-1.5 text-xs text-slate-500"
              >
                Category matching is rolling out. Select defaults you want to receive
                first. Checking <span className="font-medium text-slate-700">Airports</span>{" "}
                makes Home base and Service areas required below.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {BOOKING_CATEGORIES.map((category: BookingCategory) => (
                  <label
                    key={category}
                    className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={waiterPreferredCategories.includes(category)}
                      onChange={(e) =>
                        setWaiterPreferredCategories((prev) =>
                          e.target.checked
                            ? [...new Set([...prev, category])]
                            : prev.filter((c) => c !== category)
                        )
                      }
                    />
                    {category}
                  </label>
                ))}
              </div>
            </fieldset>
            <div>
              <label htmlFor="home_airport" className={labelClass}>
                Home base (city or airport)
                {airportsCategorySelected ? (
                  <RequiredAsterisk />
                ) : (
                  <span className="ml-1 font-normal text-slate-500">(optional)</span>
                )}
              </label>
              <input
                id="home_airport"
                value={homeAirport}
                onChange={(e) => {
                  setHomeAirport(e.target.value);
                  setSaveFeedback((prev) =>
                    prev?.status === "error" && prev.field === "homeAirport"
                      ? null
                      : prev
                  );
                }}
                className={inputClass}
                placeholder="e.g. SFO"
                required={airportsCategorySelected}
                aria-required={airportsCategorySelected}
                aria-describedby="waiter-categories-airports-note"
                aria-invalid={homeAirportSaveInvalid || undefined}
                aria-errormessage={
                  homeAirportSaveInvalid
                    ? PROFILE_FIELD_ERROR_IDS.homeAirport
                    : undefined
                }
              />
              {homeAirportSaveInvalid && profileSaveError ? (
                <p
                  id={PROFILE_FIELD_ERROR_IDS.homeAirport}
                  className={inlineFieldErrorClass}
                  role="alert"
                >
                  {profileSaveError.message}
                </p>
              ) : null}
            </div>
            <div>
              <label htmlFor="serving_airports" className={labelClass}>
                Service areas (airport codes or city tags)
                {airportsCategorySelected ? (
                  <RequiredAsterisk />
                ) : (
                  <span className="ml-1 font-normal text-slate-500">(optional)</span>
                )}
              </label>
              <input
                id="serving_airports"
                value={servingAirportsText}
                onChange={(e) => {
                  setServingAirportsText(e.target.value);
                  setSaveFeedback((prev) =>
                    prev?.status === "error" && prev.field === "servingAirports"
                      ? null
                      : prev
                  );
                }}
                className={inputClass}
                placeholder="Comma-separated codes, e.g. LAX, SFO, SAN"
                required={airportsCategorySelected}
                aria-required={airportsCategorySelected}
                aria-describedby="waiter-categories-airports-note"
                aria-invalid={servingAirportsSaveInvalid || undefined}
                aria-errormessage={
                  servingAirportsSaveInvalid
                    ? PROFILE_FIELD_ERROR_IDS.servingAirports
                    : undefined
                }
              />
              {servingAirportsSaveInvalid && profileSaveError ? (
                <p
                  id={PROFILE_FIELD_ERROR_IDS.servingAirports}
                  className={inlineFieldErrorClass}
                  role="alert"
                >
                  {profileSaveError.message}
                </p>
              ) : null}
            </div>
            <label className="flex cursor-pointer items-center gap-3 text-sm text-slate-800">
              <input
                type="checkbox"
                checked={isAvailable}
                onChange={(e) => setIsAvailable(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
              />
              Available for booking notifications
            </label>
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
              <p className="text-sm font-semibold text-slate-900">Legal acknowledgments</p>
              <p
                id="waiter-legal-ack-intro"
                className="mt-1 text-xs leading-relaxed text-slate-600"
              >
                Line holders are independent contractors using the LineCrew.ai marketplace.
              </p>
              <div className="mt-3 space-y-2">
                <label className="flex items-start gap-2 text-xs leading-relaxed text-slate-700">
                  <input
                    id="worker_independent_contractor_ack"
                    type="checkbox"
                    checked={workerIndependentContractorConfirmed}
                    onChange={(e) => {
                      setWorkerIndependentContractorConfirmed(e.target.checked);
                      setSaveFeedback((prev) =>
                        prev?.status === "error" && prev.field === "legal"
                          ? null
                          : prev
                      );
                    }}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300"
                    aria-required
                    aria-describedby="waiter-legal-ack-intro"
                    aria-invalid={legalAckSaveInvalid || undefined}
                    aria-errormessage={
                      legalAckSaveInvalid
                        ? PROFILE_FIELD_ERROR_IDS.legal
                        : undefined
                    }
                  />
                  <span>I understand I am an independent contractor, not a LineCrew.ai employee.</span>
                </label>
                <label className="flex items-start gap-2 text-xs leading-relaxed text-slate-700">
                  <input
                    id="worker_tax_responsibility_ack"
                    type="checkbox"
                    checked={workerTaxResponsibilityConfirmed}
                    onChange={(e) => {
                      setWorkerTaxResponsibilityConfirmed(e.target.checked);
                      setSaveFeedback((prev) =>
                        prev?.status === "error" && prev.field === "legal"
                          ? null
                          : prev
                      );
                    }}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300"
                    aria-required
                    aria-describedby="waiter-legal-ack-intro"
                    aria-invalid={legalAckSaveInvalid || undefined}
                    aria-errormessage={
                      legalAckSaveInvalid
                        ? PROFILE_FIELD_ERROR_IDS.legal
                        : undefined
                    }
                  />
                  <span>I am responsible for venue/law compliance and taxes.</span>
                </label>
              </div>
              {legalAckSaveInvalid && profileSaveError ? (
                <p
                  id={PROFILE_FIELD_ERROR_IDS.legal}
                  className={`${inlineFieldErrorClass} mt-3`}
                  role="alert"
                >
                  {profileSaveError.message}
                </p>
              ) : null}
            </div>
          </div>
        </section>
      )}

      <section className={sectionShell} aria-labelledby="section-legal">
        <div className="border-b border-slate-100 pb-5">
          <h2 id="section-legal" className={sectionTitle}>
            Legal & Policies
          </h2>
          <p className={sectionDesc}>
            Review policies and your recorded acceptance versions. Links open in a
            new tab.
          </p>
        </div>
        <ul className="mt-6 list-none divide-y divide-slate-100 text-sm">
          <li className="py-4 first:pt-0">
            <Link
              href={LEGAL_PATHS.terms}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-blue-700 transition hover:text-blue-800"
            >
              Terms of Service
            </Link>
            <p className="mt-1 text-xs text-slate-500">
              Accepted version:{" "}
              {acceptedTermsVersion ?? "Not recorded"}
            </p>
          </li>
          <li className="py-4">
            <Link
              href={LEGAL_PATHS.privacy}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-blue-700 transition hover:text-blue-800"
            >
              Privacy Policy
            </Link>
            <p className="mt-1 text-xs text-slate-500">
              Accepted version:{" "}
              {acceptedPrivacyVersion ?? "Not recorded"}
            </p>
          </li>
          <li className="py-4">
            <Link
              href={LEGAL_PATHS.refund}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-blue-700 transition hover:text-blue-800"
            >
              Refund Policy
            </Link>
            <p className="mt-1 text-xs text-slate-500">
              Accepted version:{" "}
              {acceptedRefundPolicyVersion ?? "Not recorded"}
            </p>
          </li>
          <li className="py-4">
            <Link
              href={LEGAL_PATHS.guidelines}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-blue-700 transition hover:text-blue-800"
            >
              Community Guidelines
            </Link>
            <p className="mt-1 text-xs text-slate-500">
              Accepted version:{" "}
              {acceptedGuidelinesVersion ?? "Not recorded"}
            </p>
          </li>
          <li className="py-4 last:pb-0">
            <Link
              href={LEGAL_PATHS.workerAgreement}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-blue-700 transition hover:text-blue-800"
            >
              Line Holder Agreement
            </Link>
            <p className="mt-1 text-xs text-slate-500">
              Accepted version:{" "}
              {role === "waiter"
                ? (acceptedWorkerAgreementVersion ?? "Not recorded")
                : "Not recorded"}
            </p>
          </li>
        </ul>
      </section>

      <section className={sectionShell} aria-labelledby="section-save">
        <div className="border-b border-slate-100 pb-5">
          <h2 id="section-save" className={sectionTitle}>
            Save changes
          </h2>
          <p className={sectionDesc}>
            {role === "customer"
              ? "Saves your account details and traveler preferences. Your photo is in the section above."
              : "Saves your account details and Line Holder settings. Your photo is in the section above."}
          </p>
        </div>
        <div className="mt-6 flex flex-col gap-4 sm:items-end">
          {saveFeedback?.status === "success" ? (
            <p
              className="w-full rounded-xl border border-emerald-200/80 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-900 sm:max-w-md"
              role="status"
            >
              {SAVE_SUCCESS_MSG}
            </p>
          ) : null}
          {showGenericSaveError ? (
            <p
              id={PROFILE_SAVE_ERROR_ID}
              className="w-full rounded-xl border border-red-200/80 bg-red-50/90 px-4 py-3 text-sm text-red-800 sm:max-w-md"
              role="alert"
            >
              {saveFeedback.message}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={saving}
            className="min-h-[48px] w-full rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition hover:bg-blue-700 disabled:opacity-60 sm:w-auto sm:min-w-[11rem]"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </section>
    </form>

    {role === "waiter" && (
      <WaiterPayoutSetup
        stripeAccountId={stripeAccountId}
        stripeDetailsSubmitted={stripeDetailsSubmitted}
        stripePayoutsEnabled={stripePayoutsEnabled}
        initialManualMethod={manualPayoutMethod}
        initialManualHandle={manualPayoutHandle}
        returnTo={stripeConnectReturnTo}
        onStripeRefreshSuccess={() => setStripeConnectSyncError(null)}
        onManualPayoutSaved={() => {
          void load({ silent: true });
        }}
      />
    )}

    {cropModal ? (
      <AvatarCropModal
        imageSrc={cropModal.src}
        onCancel={closeCropModal}
        onSkipCrop={() => {
          const f = cropModal.file;
          closeCropModal();
          void runAvatarUpload(f);
        }}
        onApplyCrop={(pixels) => {
          void applyCroppedAvatar(pixels);
        }}
      />
    ) : null}
    </>
  );
}
