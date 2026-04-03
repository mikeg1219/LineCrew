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
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
import { FormSubmitButton } from "@/components/form-submit-button";
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

/** Inline field errors (aria-errormessage targets). */
const PROFILE_FIELD_ERROR_IDS = {
  firstName: "profile-error-first-name",
  bio: "profile-error-bio",
  homeAirport: "profile-error-home-airport",
  servingAirports: "profile-error-serving-airports",
  legal: "profile-error-legal",
} as const;

const inlineFieldErrorClass = "mt-2 text-sm text-red-600";
const SAVE_SUCCESS_PROFILE = "Profile saved ✓";
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

function formatLegalDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return null;
  }
}

/** Which control a save error applies to (for aria-invalid / aria-errormessage). */
type ProfileSaveFieldError =
  | "firstName"
  | "bio"
  | "homeAirport"
  | "servingAirports"
  | "legal"
  | "session"
  | "database"
  | "generic";

type ProfileSaveFeedback =
  | null
  | {
      status: "error";
      message: string;
      field?: ProfileSaveFieldError;
    };

const inputClass = "linecrew-input shadow-sm sm:min-h-0";

const labelClass =
  "mb-1.5 block text-sm font-medium leading-snug text-slate-700";

const sectionShell = "linecrew-card p-6 sm:p-8";

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
      className="linecrew-card relative mb-10 overflow-hidden bg-gradient-to-br from-white via-slate-50/90 to-blue-50/40 p-6 sm:p-10"
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
  const searchParams = useSearchParams();
  /** Match Stripe Connect allowlist — return here after onboarding. */
  const stripeConnectReturnTo =
    pathname === "/profile" ? "/profile" : "/dashboard/profile";
  const fileRef = useRef<HTMLInputElement>(null);
  const previewBlobRef = useRef<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingTab, setSavingTab] = useState<null | "info" | "settings">(null);
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
  const [role, setRole] = useState<UserRole | null>(() =>
    heroFallback?.roleLabel === "Line Holder"
      ? "waiter"
      : heroFallback?.roleLabel === "Customer"
        ? "customer"
        : null
  );
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
  const [acceptedTermsAt, setAcceptedTermsAt] = useState<string | null>(null);
  const [acceptedPrivacyAt, setAcceptedPrivacyAt] = useState<string | null>(
    null
  );
  const [acceptedRefundAt, setAcceptedRefundAt] = useState<string | null>(null);
  const [acceptedGuidelinesAt, setAcceptedGuidelinesAt] = useState<
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
  /** Per-tab green banner (info / settings / payment), auto-dismiss 3s */
  const [tabSuccess, setTabSuccess] = useState<
    null | "info" | "settings" | "payment"
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

  const activeTab = useMemo(() => {
    const raw = searchParams.get("tab");
    if (role === "waiter") {
      if (
        raw === "legal" ||
        raw === "payment" ||
        raw === "settings" ||
        raw === "info"
      ) {
        return raw;
      }
      return "info";
    }
    if (role === "customer") {
      if (raw === "legal" || raw === "settings" || raw === "info") {
        return raw;
      }
      return "info";
    }
    if (raw === "legal" || raw === "info") return raw;
    return "info";
  }, [searchParams, role]);

  const profileTabs = useMemo(() => {
    if (role === "waiter") {
      return [
        { id: "info" as const, label: "Your info" },
        { id: "settings" as const, label: "Line Holder settings" },
        { id: "payment" as const, label: "Get paid" },
        { id: "legal" as const, label: "Legal & policies" },
      ];
    }
    if (role === "customer") {
      return [
        { id: "info" as const, label: "Your info" },
        { id: "settings" as const, label: "Travel preferences" },
        { id: "legal" as const, label: "Legal & policies" },
      ];
    }
    return [];
  }, [role]);

  const navigateToTab = useCallback(
    (next: string) => {
      setSaveFeedback(null);
      const p = new URLSearchParams(searchParams.toString());
      p.set("tab", next);
      router.replace(`${pathname}?${p.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  useEffect(() => {
    if (role !== "waiter") return;
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    if (sp.get("connect") !== "return") return;
    sp.delete("connect");
    sp.set("tab", "payment");
    router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
  }, [role, pathname, router]);

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
        setAcceptedTermsAt(p.accepted_terms_at ?? null);
        setAcceptedPrivacyAt(p.accepted_privacy_at ?? null);
        setAcceptedRefundAt(p.accepted_refund_policy_at ?? null);
        setAcceptedGuidelinesAt(p.accepted_guidelines_at ?? null);
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
    if (!tabSuccess) return;
    const id = window.setTimeout(() => setTabSuccess(null), 3000);
    return () => window.clearTimeout(id);
  }, [tabSuccess]);

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

  function validatePhoneForSave(): boolean {
    const phoneNorm = normalizePhoneE164(phoneCountryId, phoneNationalDigits);
    if (!phoneNorm.ok) {
      setPhoneError(phoneNorm.message);
      return false;
    }
    const ph = phoneNorm.e164;
    if (!isValidE164ForStorage(ph)) {
      setPhoneError("Enter a valid phone number.");
      logProfileError("profile save phone validation", null, {
        phoneNormOk: phoneNorm.ok,
        phoneLen: ph?.length ?? 0,
      });
      return false;
    }
    setPhoneError("");
    return true;
  }

  async function persistProfileFromState(): Promise<boolean> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !role) return false;

    const fn = firstName.trim();
    const dn = displayName.trim();
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
        return false;
      }
      if ("kind" in result && result.kind === "session") {
        logProfileSaveFailureClient({ kind: "session" });
        setSaveFeedback({
          status: "error",
          message: result.message,
          field: "session",
        });
        return false;
      }
      if ("kind" in result && result.kind === "database") {
        logProfileSaveFailureClient({ kind: "database" });
        setSaveFeedback({
          status: "error",
          message: result.message,
          field: "database",
        });
        return false;
      }
      logProfileError("profile save action", null, {
        kind: "kind" in result ? result.kind : undefined,
      });
      logProfileSaveFailureClient({
        kind: "kind" in result ? String(result.kind) : undefined,
      });
      setSaveFeedback({
        status: "error",
        message: "Could not save — please try again.",
        field: "generic",
      });
      return false;
    }

    setPhoneError("");
    setSaveFeedback(null);
    await load({ silent: true });
    router.refresh();
    return true;
  }

  async function handleSaveInfo(e: React.FormEvent) {
    e.preventDefault();
    if (!role) return;
    setMessage("");
    setSaveFeedback(null);
    setSavingTab("info");
    const fn = firstName.trim();
    if (!fn) {
      setSaveFeedback({
        status: "error",
        message: "First name is required.",
        field: "firstName",
      });
      setSavingTab(null);
      return;
    }
    if (!validatePhoneForSave()) {
      setSavingTab(null);
      return;
    }
    const ok = await persistProfileFromState();
    setSavingTab(null);
    if (ok) {
      setTabSuccess("info");
      setSaveFeedback(null);
    }
  }

  async function handleSaveWaiterSettings(e: React.FormEvent) {
    e.preventDefault();
    if (role !== "waiter") return;
    setMessage("");
    setSaveFeedback(null);
    setSavingTab("settings");
    const fn = firstName.trim();
    if (!fn) {
      setSaveFeedback({
        status: "error",
        message: "First name is required. Save Your info first.",
        field: "firstName",
      });
      setSavingTab(null);
      navigateToTab("info");
      return;
    }
    if (!validatePhoneForSave()) {
      setSavingTab(null);
      navigateToTab("info");
      return;
    }
    if (!bio.trim()) {
      setSaveFeedback({
        status: "error",
        message: "Bio is required.",
        field: "bio",
      });
      setSavingTab(null);
      return;
    }
    if (airportsCategorySelected) {
      if (!homeAirport.trim()) {
        setSaveFeedback({
          status: "error",
          message:
            "Home base is required when Airports is selected in Preferred request categories.",
          field: "homeAirport",
        });
        setSavingTab(null);
        return;
      }
      if (!servingAirportsText.trim()) {
        setSaveFeedback({
          status: "error",
          message:
            "Service areas are required when Airports is selected in Preferred request categories.",
          field: "servingAirports",
        });
        setSavingTab(null);
        return;
      }
    }
    if (
      !workerIndependentContractorConfirmed ||
      !workerTaxResponsibilityConfirmed
    ) {
      setSaveFeedback({
        status: "error",
        message:
          "Please confirm the legal acknowledgments before saving.",
        field: "legal",
      });
      setSavingTab(null);
      return;
    }
    const ok = await persistProfileFromState();
    setSavingTab(null);
    if (ok) {
      setTabSuccess("settings");
      setSaveFeedback(null);
    }
  }

  async function handleSaveCustomerTravel(e: React.FormEvent) {
    e.preventDefault();
    if (role !== "customer") return;
    setMessage("");
    setSaveFeedback(null);
    setSavingTab("settings");
    const fn = firstName.trim();
    if (!fn) {
      setSaveFeedback({
        status: "error",
        message: "First name is required.",
        field: "firstName",
      });
      setSavingTab(null);
      navigateToTab("info");
      return;
    }
    if (!validatePhoneForSave()) {
      setSavingTab(null);
      navigateToTab("info");
      return;
    }
    const ok = await persistProfileFromState();
    setSavingTab(null);
    if (ok) {
      setTabSuccess("settings");
      setSaveFeedback(null);
    }
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

  const showServerSaveError =
    saveFeedback?.status === "error" &&
    (saveFeedback.field === "generic" ||
      saveFeedback.field === "session" ||
      saveFeedback.field === "database" ||
      saveFeedback.field === undefined);

  return (
    <>
    <div className="space-y-8 sm:space-y-10">
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
            in the Get paid tab below.
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

      {loading && !role ? (
        <div
          className="mb-6 h-12 w-full max-w-md animate-pulse rounded-lg bg-slate-200"
          aria-hidden
        />
      ) : profileTabs.length > 0 ? (
        <nav
          className="flex snap-x snap-mandatory gap-1 overflow-x-auto border-b border-slate-200 pb-px [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-2"
          role="tablist"
          aria-label="Profile sections"
        >
          {profileTabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`profile-tab-${t.id}`}
              aria-selected={activeTab === t.id}
              tabIndex={activeTab === t.id ? 0 : -1}
              onClick={() => navigateToTab(t.id)}
              className={`snap-start shrink-0 whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition sm:min-h-0 sm:px-4 sm:py-2.5 ${
                activeTab === t.id
                  ? "border-blue-600 font-semibold text-blue-600"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      ) : null}

      {activeTab === "info" ? (
      <form
        onSubmit={handleSaveInfo}
        className="space-y-6 sm:space-y-8"
      >
      <section className={sectionShell} aria-labelledby="section-your-info">
        <div className="border-b border-slate-100 pb-5">
          <h2 id="section-your-info" className={sectionTitle}>
            Your info
          </h2>
          <p className={sectionDesc}>
            {compactAvatar ? (
              <>
                Your photo is shown in the profile header above — only the upload
                controls are here. Uploads save when you pick a file. Use{" "}
                <span className="font-medium text-slate-800">Save info</span>{" "}
                for your name and phone.
              </>
            ) : (
              <>
                Uploads save when you pick a file. Use{" "}
                <span className="font-medium text-slate-800">Save info</span>{" "}
                for your name and phone.
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

        <div className="mt-8 border-t border-slate-100 pt-8">
          <p className="text-sm leading-relaxed text-slate-600">{accountIntro}</p>
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
        </div>

        {tabSuccess === "info" ? (
          <p
            className="mt-6 rounded-xl border border-emerald-200/80 bg-emerald-50/90 px-4 py-3 text-sm font-medium text-emerald-900"
            role="status"
          >
            {SAVE_SUCCESS_PROFILE}
          </p>
        ) : null}
        {showServerSaveError ? (
          <p className="mt-4 text-sm text-red-600" role="alert">
            {saveFeedback.message}
          </p>
        ) : null}

        <div className="mt-6 flex justify-end">
          <FormSubmitButton
            pending={savingTab === "info"}
            loadingLabel="Saving…"
            disabled={savingTab === "info"}
            className="min-h-[48px] w-full rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition hover:bg-blue-700 disabled:opacity-60 sm:w-auto sm:min-w-[11rem]"
          >
            Save info
          </FormSubmitButton>
        </div>
      </section>
      </form>
      ) : null}

      {role === "customer" && activeTab === "settings" ? (
        <form
          onSubmit={handleSaveCustomerTravel}
          className="space-y-6 sm:space-y-8"
        >
        <section className={sectionShell} aria-labelledby="section-traveler">
          <div className="border-b border-slate-100 pb-5">
            <h2 id="section-traveler" className={sectionTitle}>
              Travel preferences
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
          {tabSuccess === "settings" ? (
            <p
              className="mt-6 rounded-xl border border-emerald-200/80 bg-emerald-50/90 px-4 py-3 text-sm font-medium text-emerald-900"
              role="status"
            >
              {SAVE_SUCCESS_PROFILE}
            </p>
          ) : null}
          {showServerSaveError ? (
            <p className="mt-4 text-sm text-red-600" role="alert">
              {saveFeedback.message}
            </p>
          ) : null}
          <div className="mt-6 flex justify-end">
            <FormSubmitButton
              pending={savingTab === "settings"}
              loadingLabel="Saving…"
              disabled={savingTab === "settings"}
              className="min-h-[48px] w-full rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition hover:bg-blue-700 disabled:opacity-60 sm:w-auto sm:min-w-[11rem]"
            >
              Save settings
            </FormSubmitButton>
          </div>
        </section>
        </form>
      ) : null}

      {role === "waiter" && activeTab === "settings" ? (
        <form
          onSubmit={handleSaveWaiterSettings}
          className="space-y-6 sm:space-y-8"
        >
        <section className={sectionShell} aria-labelledby="section-waiter">
          <div className="border-b border-slate-100 pb-5">
            <h2 id="section-waiter" className={sectionTitle}>
              Line Holder settings
            </h2>
            <p className={sectionDesc}>
              Service areas, categories, availability, and required acknowledgments.
              Payout setup is under{" "}
              <button
                type="button"
                onClick={() => navigateToTab("payment")}
                className="font-medium text-blue-700 underline decoration-blue-600/30 underline-offset-2 hover:text-blue-800"
              >
                Get paid
              </button>
              .
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
          {tabSuccess === "settings" ? (
            <p
              className="mt-6 rounded-xl border border-emerald-200/80 bg-emerald-50/90 px-4 py-3 text-sm font-medium text-emerald-900"
              role="status"
            >
              {SAVE_SUCCESS_PROFILE}
            </p>
          ) : null}
          {showServerSaveError ? (
            <p className="mt-4 text-sm text-red-600" role="alert">
              {saveFeedback.message}
            </p>
          ) : null}
          <div className="mt-6 flex justify-end">
            <FormSubmitButton
              pending={savingTab === "settings"}
              loadingLabel="Saving…"
              disabled={savingTab === "settings"}
              className="min-h-[48px] w-full rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition hover:bg-blue-700 disabled:opacity-60 sm:w-auto sm:min-w-[11rem]"
            >
              Save settings
            </FormSubmitButton>
          </div>
        </section>
        </form>
      ) : null}

      {activeTab === "legal" ? (
      <section className={sectionShell} aria-labelledby="section-legal">
        <div className="border-b border-slate-100 pb-5">
          <h2 id="section-legal" className={sectionTitle}>
            Legal & policies
          </h2>
          <p className={sectionDesc}>
            Your recorded acceptance versions and policy links. Each link opens in a
            new tab.
          </p>
        </div>
        <ul className="mt-6 list-none divide-y divide-slate-100 text-sm">
          <li className="flex flex-col gap-2 py-4 first:pt-0 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="font-medium text-slate-900">Terms of Service</p>
              <p className="mt-1 text-xs text-slate-600">
                Accepted: version {acceptedTermsVersion ?? "—"}
              </p>
              {acceptedTermsAt ? (
                <p className="mt-1 text-xs text-slate-500">
                  {formatLegalDate(acceptedTermsAt)}
                </p>
              ) : null}
            </div>
            <Link
              href={LEGAL_PATHS.terms}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 text-sm font-semibold text-blue-700 transition hover:text-blue-800"
            >
              View →
            </Link>
          </li>
          <li className="flex flex-col gap-2 py-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="font-medium text-slate-900">Privacy Policy</p>
              <p className="mt-1 text-xs text-slate-600">
                Accepted: version {acceptedPrivacyVersion ?? "—"}
              </p>
              {acceptedPrivacyAt ? (
                <p className="mt-1 text-xs text-slate-500">
                  {formatLegalDate(acceptedPrivacyAt)}
                </p>
              ) : null}
            </div>
            <Link
              href={LEGAL_PATHS.privacy}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 text-sm font-semibold text-blue-700 transition hover:text-blue-800"
            >
              View →
            </Link>
          </li>
          <li className="flex flex-col gap-2 py-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="font-medium text-slate-900">Refund Policy</p>
              <p className="mt-1 text-xs text-slate-600">
                Accepted: version {acceptedRefundPolicyVersion ?? "—"}
              </p>
              {acceptedRefundAt ? (
                <p className="mt-1 text-xs text-slate-500">
                  {formatLegalDate(acceptedRefundAt)}
                </p>
              ) : null}
            </div>
            <Link
              href={LEGAL_PATHS.refund}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 text-sm font-semibold text-blue-700 transition hover:text-blue-800"
            >
              View →
            </Link>
          </li>
          <li className="flex flex-col gap-2 py-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="font-medium text-slate-900">Community Guidelines</p>
              <p className="mt-1 text-xs text-slate-600">
                Accepted: version {acceptedGuidelinesVersion ?? "—"}
              </p>
              {acceptedGuidelinesAt ? (
                <p className="mt-1 text-xs text-slate-500">
                  {formatLegalDate(acceptedGuidelinesAt)}
                </p>
              ) : null}
            </div>
            <Link
              href={LEGAL_PATHS.guidelines}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 text-sm font-semibold text-blue-700 transition hover:text-blue-800"
            >
              View →
            </Link>
          </li>
          <li className="flex flex-col gap-2 py-4 last:pb-0 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="font-medium text-slate-900">Line Holder Agreement</p>
              <p className="mt-1 text-xs text-slate-600">
                Accepted: version{" "}
                {role === "waiter"
                  ? (acceptedWorkerAgreementVersion ?? "—")
                  : "—"}
              </p>
            </div>
            <Link
              href={LEGAL_PATHS.workerAgreement}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 text-sm font-semibold text-blue-700 transition hover:text-blue-800"
            >
              View →
            </Link>
          </li>
        </ul>
      </section>
      ) : null}

      {role === "waiter" && activeTab === "payment" ? (
        <div className="space-y-6">
          {tabSuccess === "payment" ? (
            <p
              className="rounded-xl border border-emerald-200/80 bg-emerald-50/90 px-4 py-3 text-sm font-medium text-emerald-900"
              role="status"
            >
              {SAVE_SUCCESS_PROFILE}
            </p>
          ) : null}
          <WaiterPayoutSetup
            layoutVariant="profileTab"
            stripeAccountId={stripeAccountId}
            stripeDetailsSubmitted={stripeDetailsSubmitted}
            stripePayoutsEnabled={stripePayoutsEnabled}
            initialManualMethod={manualPayoutMethod}
            initialManualHandle={manualPayoutHandle}
            returnTo={stripeConnectReturnTo}
            onStripeRefreshSuccess={() => {
              setStripeConnectSyncError(null);
            }}
            onManualPayoutSaved={() => {
              void load({ silent: true });
              setTabSuccess("payment");
            }}
          />
        </div>
      ) : null}

    </div>

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
