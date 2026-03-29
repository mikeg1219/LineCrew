"use client";

import { ProfileCompletionStatus } from "@/app/profile/profile-completion-status";
import { ensureProfileForUser } from "@/lib/ensure-profile";
import type { Profile, UserRole } from "@/lib/types";
import { waiterCoreFieldsComplete } from "@/lib/waiter-profile-complete";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

const AVATAR_BUCKET = "avatars";

const inputClass =
  "min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-[15px] text-slate-900 shadow-sm outline-none ring-blue-600/15 transition focus:border-blue-600 focus:ring-[3px] sm:min-h-0 sm:text-sm";

const labelClass =
  "mb-1.5 block text-sm font-medium leading-snug text-slate-700";

const sectionShell =
  "rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm ring-1 ring-slate-900/5 sm:p-8";

const sectionTitle = "text-base font-semibold tracking-tight text-slate-900";

const sectionDesc = "mt-1.5 text-sm leading-relaxed text-slate-600";

export function ProfileSettingsForm({
  compactAvatar = false,
}: {
  /** When true, avatar upload is a compact row (use when a hero shows the photo). */
  compactAvatar?: boolean;
} = {}) {
  const supabase = createClient();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [avatarPublicUrl, setAvatarPublicUrl] = useState<string | null>(null);
  const [avatarStoragePath, setAvatarStoragePath] = useState<string | null>(null);

  const [firstName, setFirstName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");

  const [preferredAirport, setPreferredAirport] = useState("");
  const [travelerNotes, setTravelerNotes] = useState("");
  const [contactPreference, setContactPreference] = useState("");

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
        setContactPreference(p.contact_preference ?? "");
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
            .from(AVATAR_BUCKET)
            .getPublicUrl(path);
          setAvatarPublicUrl(pub.publicUrl);
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

  async function handleAvatarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    if (!file.type.startsWith("image/")) {
      setMessage("Please choose an image file.");
      return;
    }
    setUploading(true);
    setMessage("");
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const safeExt = ["jpg", "jpeg", "png", "webp", "gif"].includes(ext)
      ? ext
      : "jpg";
    const path = `${userId}/avatar.${safeExt}`;
    const { error: upErr } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(path, file, { upsert: true, contentType: file.type });

    if (upErr) {
      setUploading(false);
      setMessage(
        upErr.message.includes("Bucket not found") || upErr.message.includes("not found")
          ? "Photo storage is not set up yet. Ask your admin to create the avatars bucket in Supabase."
          : upErr.message
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
      setMessage(dbErr.message);
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

    setAvatarStoragePath(path);
    const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
    setAvatarPublicUrl(data.publicUrl);
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
      base.contact_preference = contactPreference.trim() || null;
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
      setMessage(error.message);
      setSaving(false);
      return;
    }

    setMessage("__saved__");
    setSaving(false);
    await load({ silent: true });
    router.refresh();
  }

  if (loading) {
    return (
      <p className="text-center text-sm text-slate-500">Loading profile…</p>
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

  return (
    <form onSubmit={handleSubmit} className="space-y-8 sm:space-y-10">
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

      <section className={sectionShell}>
        <div className="border-b border-slate-100 pb-5">
          <h2 className={sectionTitle}>Basic info</h2>
          <p className={sectionDesc}>
            How you appear to others and how we reach you.
          </p>
        </div>

        <div className="mt-6 space-y-6">
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
              placeholder="First name"
            />
          </div>
          <div>
            <label htmlFor="display_name" className={labelClass}>
              Display name
            </label>
            <input
              id="display_name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              autoComplete="nickname"
              className={inputClass}
              placeholder="Name shown in the app"
            />
          </div>
          <div>
            <label htmlFor="email_ro" className={labelClass}>
              Email
            </label>
            <input
              id="email_ro"
              value={userEmail ?? ""}
              disabled
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
          <div>
            <span className={labelClass}>Profile photo</span>
            {compactAvatar ? (
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
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
                  onClick={() => fileRef.current?.click()}
                  className="inline-flex min-h-[44px] w-full shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-60 sm:w-auto"
                >
                  {uploading ? "Uploading…" : avatarStoragePath ? "Change photo" : "Upload photo"}
                </button>
                <p className="text-xs leading-relaxed text-slate-500 sm:text-sm">
                  JPG, PNG, WebP, or GIF. Updates the preview above after save.
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:gap-6">
                <div className="relative shrink-0">
                  {avatarPublicUrl ? (
                    <img
                      src={avatarPublicUrl}
                      alt=""
                      className="h-28 w-28 rounded-full border-2 border-slate-200/90 object-cover shadow-md sm:h-24 sm:w-24"
                    />
                  ) : (
                    <div
                      className="flex h-28 w-28 items-center justify-center rounded-full border-2 border-slate-200 bg-slate-100 text-2xl font-semibold text-slate-600 shadow-inner sm:h-24 sm:w-24"
                      aria-hidden
                    >
                      {(displayName.trim() || firstName.trim() || userEmail?.[0] || "?")
                        .toString()
                        .charAt(0)
                        .toUpperCase()}
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
                    onClick={() => fileRef.current?.click()}
                    className="inline-flex min-h-[44px] items-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
                  >
                    {uploading ? "Uploading…" : avatarStoragePath ? "Change photo" : "Upload photo"}
                  </button>
                  <p className="text-xs leading-relaxed text-slate-500 sm:text-sm">
                    JPG, PNG, WebP, or GIF up to 5 MB. Stored securely in your
                    account folder.
                  </p>
                  {avatarStoragePath && (
                    <p className="truncate text-xs text-slate-400" title={avatarStoragePath}>
                      {avatarStoragePath}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {role === "customer" && (
        <section className={sectionShell}>
          <div className="border-b border-slate-100 pb-5">
            <h2 className={sectionTitle}>Traveler</h2>
            <p className={sectionDesc}>
              Preferences for booking and line requests.
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
            <div>
              <label htmlFor="contact_preference" className={labelClass}>
                Contact preference
              </label>
              <select
                id="contact_preference"
                value={contactPreference}
                onChange={(e) => setContactPreference(e.target.value)}
                className={inputClass}
              >
                <option value="">No preference</option>
                <option value="email">Email</option>
                <option value="sms">SMS</option>
                <option value="both">Email and SMS</option>
              </select>
            </div>
          </div>
        </section>
      )}

      {role === "waiter" && (
        <section className={sectionShell}>
          <div className="border-b border-slate-100 pb-5">
            <h2 className={sectionTitle}>Line Holder</h2>
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

      <div className="flex flex-col gap-4 pt-2 sm:items-end">
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
    </form>
  );
}
