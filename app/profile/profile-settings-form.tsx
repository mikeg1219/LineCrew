"use client";

import { ensureProfileForUser } from "@/lib/ensure-profile";
import type { Profile, UserRole } from "@/lib/types";
import { waiterCoreFieldsComplete } from "@/lib/waiter-profile-complete";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

const AVATAR_BUCKET = "avatars";

const inputClass =
  "w-full rounded-lg border border-slate-200 px-3 py-2.5 text-[15px] text-slate-900 shadow-sm outline-none ring-blue-600/20 transition focus:border-blue-600 focus:ring-4 sm:text-sm";

const labelClass = "mb-2 block text-sm font-medium text-slate-800";

export function ProfileSettingsForm() {
  const supabase = createClient();
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

  const load = useCallback(async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
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
      const path = p.avatar_url ?? null;
      setAvatarStoragePath(path);
      if (path) {
        const { data } = supabase.storage
          .from(AVATAR_BUCKET)
          .getPublicUrl(path);
        setAvatarPublicUrl(data.publicUrl);
      } else {
        setAvatarPublicUrl(null);
      }
    }
    setLoading(false);
  }, [supabase]);

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

    setMessage(error ? error.message : "__saved__");
    setSaving(false);
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

  return (
    <form onSubmit={handleSubmit} className="space-y-10">
      <p className="text-sm">
        <Link
          href={dashboardHref}
          className="font-medium text-blue-700 transition hover:text-blue-800"
        >
          ← Back to dashboard
        </Link>
      </p>

      <section className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-lg sm:p-8">
        <h2 className="text-lg font-semibold text-slate-900">Basic info</h2>
        <p className="mt-1 text-sm text-slate-600">
          How you appear to others and how we reach you.
        </p>

        <div className="mt-6 space-y-5">
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
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <div className="relative shrink-0">
                {avatarPublicUrl ? (
                  <img
                    src={avatarPublicUrl}
                    alt=""
                    className="h-24 w-24 rounded-full border-2 border-slate-200 object-cover"
                  />
                ) : (
                  <div
                    className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-slate-200 bg-slate-100 text-2xl font-semibold text-slate-600"
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
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
                >
                  {uploading ? "Uploading…" : avatarStoragePath ? "Change photo" : "Upload photo"}
                </button>
                <p className="text-xs leading-relaxed text-slate-500">
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
          </div>
        </div>
      </section>

      {role === "customer" && (
        <section className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-lg sm:p-8">
          <h2 className="text-lg font-semibold text-slate-900">Traveler</h2>
          <p className="mt-1 text-sm text-slate-600">
            Preferences for booking and line requests.
          </p>
          <div className="mt-6 space-y-5">
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
                Notes
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
        <section className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-lg sm:p-8">
          <h2 className="text-lg font-semibold text-slate-900">Waiter</h2>
          <p className="mt-1 text-sm text-slate-600">
            Airport coverage and availability for jobs.
          </p>
          <div className="mt-6 space-y-5">
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
              Available for job notifications
            </label>
          </div>
        </section>
      )}

      {message && (
        <p
          className={`text-sm ${
            message === "__saved__" || message === "__avatar_saved__"
              ? "text-emerald-700"
              : "text-red-600"
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
        className="min-h-[44px] w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60 sm:w-auto sm:px-8 sm:py-2.5"
      >
        {saving ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
