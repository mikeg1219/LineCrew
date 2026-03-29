"use client";

import { ProfileCompletionStatus } from "@/app/profile/profile-completion-status";
import { ensureProfileForUser } from "@/lib/ensure-profile";
import type { Profile, UserRole } from "@/lib/types";
import { waiterCoreFieldsComplete } from "@/lib/waiter-profile-complete";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  AVATAR_MAX_FILE_BYTES,
  AVATAR_STORAGE_BUCKET,
  avatarPublicUrlWithBust,
  userAvatarObjectPath,
  validateAvatarFile,
} from "@/lib/avatar-storage";

export type ProfileHeroFallback = {
  display: string;
  email: string | null;
  roleLabel: string;
  initial: string;
  avatarUrl: string | null;
};

const AVATAR_BUCKET = "avatars";

function logProfileError(context: string, err: unknown) {
  if (process.env.NODE_ENV === "development") {
    console.error(`[profile] ${context}`, err);
  }
}

const SAVE_FAILED_MSG =
  "We couldn't save your profile changes. Please try again.";
const AVATAR_UPLOAD_FAILED_MSG =
  "We couldn't upload your photo. Please try again.";

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
}: {
  /** When true, avatar upload is a compact row (use when a hero shows the photo). */
  compactAvatar?: boolean;
  /** Server snapshot for hero before client profile load (dashboard profile page). */
  heroFallback?: ProfileHeroFallback;
} = {}) {
  const supabase = createClient();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const previewBlobRef = useRef<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [avatarPublicUrl, setAvatarPublicUrl] = useState<string | null>(null);
  const [avatarStoragePath, setAvatarStoragePath] = useState<string | null>(null);
  const [previewObjectUrl, setPreviewObjectUrl] = useState<string | null>(null);

  const [firstName, setFirstName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");

  const [preferredAirport, setPreferredAirport] = useState("");
  const [travelerNotes, setTravelerNotes] = useState("");

  const [bio, setBio] = useState("");
  const [homeAirport, setHomeAirport] = useState("");
  const [servingAirportsText, setServingAirportsText] = useState("");
  const [isAvailable, setIsAvailable] = useState(true);
  const [profileCompleted, setProfileCompleted] = useState<boolean | null>(null);
  const [emailVerifiedAt, setEmailVerifiedAt] = useState<string | null>(null);
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(
    null
  );

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (!opts?.silent) setLoading(false);
        return;
      }
      setUserId(user.id);
      setUserEmail(user.email ?? null);
      await ensureProfileForUser(
        supabase,
        user.id,
        user.user_metadata as Record<string, unknown> | undefined
      );
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
        setPhone(p.phone ?? "");
        setPreferredAirport(p.preferred_airport ?? "");
        setTravelerNotes(p.traveler_notes ?? "");
        setBio(p.bio ?? "");
        setHomeAirport(p.home_airport ?? "");
        setServingAirportsText((p.serving_airports ?? []).join(", "));
        setIsAvailable(p.is_available !== false);
        setProfileCompleted(p.profile_completed ?? null);
        setEmailVerifiedAt(p.email_verified_at ?? null);
        setOnboardingCompleted(p.onboarding_completed ?? null);
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
      }
      if (!opts?.silent) setLoading(false);
    },
    [supabase]
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    return () => {
      if (previewBlobRef.current) {
        URL.revokeObjectURL(previewBlobRef.current);
        previewBlobRef.current = null;
      }
    };
  }, []);

  function clearPreviewBlob() {
    if (previewBlobRef.current) {
      URL.revokeObjectURL(previewBlobRef.current);
      previewBlobRef.current = null;
    }
    setPreviewObjectUrl(null);
  }

  async function handleAvatarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    const check = validateAvatarFile(file);
    if (!check.ok) {
      setMessage(check.message);
      e.target.value = "";
      return;
    }

    clearPreviewBlob();
    const localUrl = URL.createObjectURL(file);
    previewBlobRef.current = localUrl;
    setPreviewObjectUrl(localUrl);
    setUploading(true);
    setMessage("");
    const path = userAvatarObjectPath(userId, file.type);
    const { error: upErr } = await supabase.storage
      .from(AVATAR_STORAGE_BUCKET)
      .upload(path, file, { upsert: true, contentType: file.type });

    if (upErr) {
      setUploading(false);
      clearPreviewBlob();
      logProfileError("avatar upload", upErr);
      const raw = upErr.message ?? "";
      setMessage(
        raw.includes("Bucket not found") || raw.includes("not found")
          ? "Photo storage is not set up yet. Ask your admin to create the avatars bucket in Supabase."
          : AVATAR_UPLOAD_FAILED_MSG
      );
      e.target.value = "";
      return;
    }

    const { error: dbErr } = await supabase
      .from("profiles")
      .update({ avatar_url: path })
      .eq("id", userId);

    if (dbErr) {
      setUploading(false);
      clearPreviewBlob();
      logProfileError("avatar db update", dbErr);
      setMessage(AVATAR_UPLOAD_FAILED_MSG);
      e.target.value = "";
      return;
    }

    const { data: row } = await supabase
      .from("profiles")
      .select("first_name, avatar_url, phone, bio, serving_airports")
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
    setUploading(false);
    e.target.value = "";
    setMessage("__avatar_saved__");
    await load({ silent: true });
    router.refresh();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !role) return;

    setSaving(true);
    setMessage("");

    const fn = firstName.trim();
    const dn = displayName.trim();
    const ph = phone.trim();
    const profile_completed = Boolean(fn && dn && ph);

    const base: Record<string, unknown> = {
      first_name: fn || null,
      display_name: dn || null,
      full_name: dn || null,
      phone: ph || null,
      profile_completed,
    };

    if (role === "customer") {
      base.preferred_airport = preferredAirport.trim() || null;
      base.traveler_notes = travelerNotes.trim() || null;
    }

    if (role === "waiter") {
      const parts = servingAirportsText
        .split(/[,;\s]+/)
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean);
      const unique = [...new Set(parts)];
      base.bio = bio.trim() || null;
      base.home_airport = homeAirport.trim() || null;
      base.serving_airports = unique;
      base.is_available = isAvailable;
      base.onboarding_completed = Boolean(
        fn &&
          ph &&
          bio.trim() &&
          unique.length > 0 &&
          avatarStoragePath
      );
    }

    const { error } = await supabase.from("profiles").update(base).eq("id", user.id);

    if (error) {
      logProfileError("profile save", error);
      setMessage(SAVE_FAILED_MSG);
      setSaving(false);
      return;
    }

    setMessage("__saved__");
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
      ? "Your email stays read-only. First name, display name, phone, and photo shape how travelers and Line Holders see you."
      : "Your email stays read-only. First name, display name, phone, and photo shape your Line Holder profile.";

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

  return (
    <form onSubmit={handleSubmit} className="space-y-8 sm:space-y-10">
      {compactAvatar ? (
        <ProfileHeroCard
          photoSrc={heroPhotoSrc}
          initial={heroInitialChar}
          display={heroHeading}
          email={heroEmailLine}
          roleBadge={heroBadge}
          busy={uploading}
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

      {role === "customer" && (
        <ProfileCompletionStatus
          role="customer"
          firstName={firstName}
          displayName={displayName}
          phone={phone}
          profileCompletedFlag={profileCompleted}
        />
      )}
      {role === "waiter" && (
        <ProfileCompletionStatus
          role="waiter"
          firstName={firstName}
          phone={phone}
          bio={bio}
          avatarPath={avatarStoragePath}
          servingCodes={servingCodesUnique}
          onboardingCompleted={onboardingCompleted}
          emailVerifiedAt={emailVerifiedAt}
        />
      )}

      <section className={sectionShell} aria-labelledby="section-account">
        <div className="border-b border-slate-100 pb-5">
          <h2 id="section-account" className={sectionTitle}>
            Account
          </h2>
          <p className={sectionDesc}>{accountIntro}</p>
        </div>

        <div className="mt-6 space-y-6">
          <div>
            <span className={labelClass}>Profile photo</span>
            {compactAvatar ? (
              <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
                <div className="flex shrink-0 items-start gap-4">
                  <div className="relative shrink-0">
                    {heroPhotoSrc ? (
                      <img
                        src={heroPhotoSrc}
                        alt="Your profile photo"
                        className="h-20 w-20 rounded-full border-2 border-slate-200/90 object-cover shadow-md ring-2 ring-white sm:h-[72px] sm:w-[72px]"
                      />
                    ) : (
                      <div
                        className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-slate-200 bg-slate-100 text-xl font-semibold text-slate-600 shadow-inner sm:h-[72px] sm:w-[72px] sm:text-2xl"
                        aria-hidden
                      >
                        {avatarInitial}
                      </div>
                    )}
                  </div>
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
                    disabled={uploading}
                    aria-busy={uploading}
                    onClick={() => fileRef.current?.click()}
                    className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-60 sm:w-auto"
                  >
                    {uploading
                      ? "Uploading…"
                      : avatarStoragePath
                        ? "Change photo"
                        : "Upload photo"}
                  </button>
                  {uploading ? (
                    <p
                      className="text-xs font-medium text-blue-800 sm:text-sm"
                      role="status"
                      aria-live="polite"
                    >
                      Finishing upload—preview updates when this completes.
                    </p>
                  ) : (
                    <p className="text-xs leading-relaxed text-slate-500 sm:text-sm">
                      JPG, PNG, WebP, or GIF, max{" "}
                      {Math.round(AVATAR_MAX_FILE_BYTES / (1024 * 1024))} MB.
                      You&apos;ll see your selection right away; when upload
                      finishes, your photo is saved. Use Save changes for your
                      name and other profile fields.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="mt-3 flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:gap-6">
                <div className="relative shrink-0">
                  {heroPhotoSrc ? (
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
                    disabled={uploading}
                    aria-busy={uploading}
                    onClick={() => fileRef.current?.click()}
                    className="inline-flex min-h-[44px] items-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
                  >
                    {uploading
                      ? "Uploading…"
                      : avatarStoragePath
                        ? "Change photo"
                        : "Upload photo"}
                  </button>
                  {uploading ? (
                    <p
                      className="text-xs font-medium text-blue-800 sm:text-sm"
                      role="status"
                      aria-live="polite"
                    >
                      Finishing upload—preview updates when this completes.
                    </p>
                  ) : (
                    <p className="text-xs leading-relaxed text-slate-500 sm:text-sm">
                      JPG, PNG, WebP, or GIF, max{" "}
                      {Math.round(AVATAR_MAX_FILE_BYTES / (1024 * 1024))} MB.
                      Instant preview while uploading; when upload finishes, your
                      photo is saved. Use Save changes for name and other fields.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div>
            <label htmlFor="first_name" className={labelClass}>
              First name
            </label>
            <input
              id="first_name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              autoComplete="given-name"
              className={inputClass}
              placeholder="Legal or preferred first name"
            />
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
            <label htmlFor="phone" className={labelClass}>
              Phone
            </label>
            <input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
              className={inputClass}
              placeholder="+1 …"
            />
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
              Airport coverage and availability for bookings.
            </p>
          </div>
          <div className="mt-6 space-y-6">
            <div>
              <label htmlFor="bio" className={labelClass}>
                Bio
              </label>
              <textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
                className={inputClass}
                placeholder="Short intro for travelers"
              />
            </div>
            <div>
              <label htmlFor="home_airport" className={labelClass}>
                Home airport
              </label>
              <input
                id="home_airport"
                value={homeAirport}
                onChange={(e) => setHomeAirport(e.target.value)}
                className={inputClass}
                placeholder="e.g. SFO"
              />
            </div>
            <div>
              <label htmlFor="serving_airports" className={labelClass}>
                Airports served
              </label>
              <input
                id="serving_airports"
                value={servingAirportsText}
                onChange={(e) => setServingAirportsText(e.target.value)}
                className={inputClass}
                placeholder="Comma-separated codes, e.g. LAX, SFO, SAN"
              />
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
          </div>
        </section>
      )}

      <section className={sectionShell} aria-labelledby="section-save">
        <div className="border-b border-slate-100 pb-5">
          <h2 id="section-save" className={sectionTitle}>
            Save changes
          </h2>
          <p className={sectionDesc}>
            {role === "customer"
              ? "Saves your account details and traveler preferences. Photos save separately when you upload."
              : "Saves your account details and Line Holder settings. Photos save separately when you upload."}
          </p>
        </div>
        <div className="mt-6 flex flex-col gap-4 sm:items-end">
          {message && (
            <p
              className={`w-full rounded-xl px-4 py-3 text-sm sm:max-w-md ${
                message === "__saved__" || message === "__avatar_saved__"
                  ? "border border-emerald-200/80 bg-emerald-50/90 text-emerald-900"
                  : "border border-red-200/80 bg-red-50/90 text-red-800"
              }`}
              role="status"
            >
              {message === "__saved__"
                ? "Profile saved."
                : message === "__avatar_saved__"
                  ? "Photo updated."
                  : message}
            </p>
          )}

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
  );
}
