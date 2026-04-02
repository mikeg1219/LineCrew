"use client";

import {
  onboardingWaiterProfileAction,
  type OnboardingWaiterProfileState,
} from "@/app/onboarding/actions";
import { AirportCombobox } from "@/app/dashboard/customer/post-job/airport-combobox";
import {
  AVATAR_STORAGE_BUCKET,
  avatarPublicUrlWithBust,
  userAvatarObjectPath,
  validateAvatarForProcessing,
} from "@/lib/avatar-storage";
import {
  formatUsNationalDisplay,
  getPhoneCountry,
  PHONE_COUNTRIES,
} from "@/lib/phone";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { FormSubmitButton } from "@/components/form-submit-button";
import { useActionState, useMemo, useState } from "react";

const inputClass =
  "w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none ring-blue-600/20 transition focus:border-blue-600 focus:ring-4";

export function WaiterOnboardingProfileForm({
  userId,
  initialAvatarUrl,
}: {
  userId: string;
  initialAvatarUrl: string | null;
}) {
  const [state, formAction, pending] = useActionState(
    onboardingWaiterProfileAction,
    null as OnboardingWaiterProfileState
  );
  const [uploadMsg, setUploadMsg] = useState("");
  const [avatarPath, setAvatarPath] = useState("");
  const [avatarPreview, setAvatarPreview] = useState(initialAvatarUrl);
  const [phoneCountryId, setPhoneCountryId] = useState("US");
  const [nationalDigits, setNationalDigits] = useState("");
  const [bio, setBio] = useState("");
  const [selectedAirports, setSelectedAirports] = useState<string[]>([]);

  const nanp = getPhoneCountry(phoneCountryId)?.nanp ?? true;
  const displayPhone = nanp ? formatUsNationalDisplay(nationalDigits) : nationalDigits;
  const bioLeft = Math.max(0, 200 - bio.length);
  const airportsSerialized = useMemo(
    () => selectedAirports.join(","),
    [selectedAirports]
  );

  function onPhoneInput(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    if (nanp) {
      setNationalDigits(raw.replace(/\D/g, "").slice(0, 10));
    } else {
      setNationalDigits(raw.replace(/\D/g, "").slice(0, 15));
    }
  }

  async function onAvatarChange(file: File | undefined) {
    if (!file) return;
    const check = validateAvatarForProcessing(file);
    if (!check.ok) {
      setUploadMsg(check.message);
      return;
    }
    const supabase = createClient();
    const path = userAvatarObjectPath(userId, file.type || "image/jpeg");
    const { error } = await supabase.storage
      .from(AVATAR_STORAGE_BUCKET)
      .upload(path, file, { upsert: true, contentType: file.type || "image/jpeg" });
    if (error) {
      setUploadMsg("Photo upload failed. Please try a different image.");
      return;
    }
    const { data } = supabase.storage.from(AVATAR_STORAGE_BUCKET).getPublicUrl(path);
    setAvatarPath(path);
    setAvatarPreview(avatarPublicUrlWithBust(data.publicUrl, Date.now()));
    setUploadMsg("Photo uploaded.");
  }

  function addAirport(code: string | null) {
    if (!code) return;
    setSelectedAirports((prev) =>
      prev.includes(code) ? prev : [...prev, code]
    );
  }

  function removeAirport(code: string) {
    setSelectedAirports((prev) => prev.filter((c) => c !== code));
  }

  return (
    <form action={formAction} className="mx-auto flex max-w-md flex-col space-y-5">
      <input type="hidden" name="phone_country_id" value={phoneCountryId} />
      <input type="hidden" name="phone_national" value={nationalDigits} />
      <input type="hidden" name="avatar_url" value={avatarPath} />
      <input type="hidden" name="service_areas" value={airportsSerialized} />

      <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
        Line Holders earn $15-40 per booking
      </p>

      <div>
        <p className="mb-1.5 text-sm font-medium text-slate-800">
          Profile photo <span className="text-red-600">*</span>
        </p>
        <p className="mb-2 text-sm text-slate-600">
          Customers need to identify you in line
        </p>
        <label className="inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50">
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => onAvatarChange(e.target.files?.[0])}
          />
          Upload photo
        </label>
        {avatarPreview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarPreview}
            alt=""
            className="mt-3 h-16 w-16 rounded-full border border-slate-200 object-cover"
          />
        ) : null}
        {uploadMsg ? <p className="mt-2 text-xs text-slate-600">{uploadMsg}</p> : null}
        {state?.fieldErrors?.avatar_url ? (
          <p className="mt-1 text-xs text-red-600">{state.fieldErrors.avatar_url}</p>
        ) : null}
      </div>

      <div>
        <label htmlFor="first_name" className="mb-1.5 block text-sm font-medium text-slate-800">
          First name <span className="text-red-600">*</span>
        </label>
        <input id="first_name" name="first_name" required className={inputClass} />
        {state?.fieldErrors?.first_name ? (
          <p className="mt-1 text-xs text-red-600">{state.fieldErrors.first_name}</p>
        ) : null}
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-800">
          Phone number <span className="text-red-600">*</span>
        </label>
        <div className="flex gap-2">
          <select
            value={phoneCountryId}
            onChange={(e) => {
              setPhoneCountryId(e.target.value);
              setNationalDigits("");
            }}
            className="min-w-0 shrink rounded-lg border border-slate-200 bg-white px-2 py-2.5 text-sm text-slate-900"
            aria-label="Country code"
          >
            {PHONE_COUNTRIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
          <input
            type="tel"
            inputMode={nanp ? "numeric" : "tel"}
            autoComplete="tel-national"
            value={displayPhone}
            onChange={onPhoneInput}
            className={`${inputClass} min-w-0 flex-1`}
            placeholder={nanp ? "(555) 123-4567" : "Phone number"}
          />
        </div>
        {state?.fieldErrors?.phone ? (
          <p className="mt-1 text-xs text-red-600">{state.fieldErrors.phone}</p>
        ) : null}
      </div>

      <div>
        <label htmlFor="bio" className="mb-1.5 block text-sm font-medium text-slate-800">
          Short bio <span className="text-red-600">*</span>
        </label>
        <textarea
          id="bio"
          name="bio"
          required
          maxLength={200}
          rows={3}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          className={`${inputClass} resize-y`}
          placeholder="Ex: Reliable line holder in Atlanta area. Available mornings and weekends."
        />
        <p className="mt-1 text-xs text-slate-500">{bioLeft} characters left</p>
        {state?.fieldErrors?.bio ? (
          <p className="mt-1 text-xs text-red-600">{state.fieldErrors.bio}</p>
        ) : null}
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-800">
          Which airports will you work at? <span className="text-red-600">*</span>
        </label>
        <AirportCombobox name="ignored_airport_single" onAirportChange={addAirport} />
        {selectedAirports.length > 0 ? (
          <ul className="mt-2 flex flex-wrap gap-2">
            {selectedAirports.map((code) => (
              <li key={code}>
                <button
                  type="button"
                  onClick={() => removeAirport(code)}
                  className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                >
                  {code} ×
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {state?.fieldErrors?.service_areas ? (
          <p className="mt-1 text-xs text-red-600">{state.fieldErrors.service_areas}</p>
        ) : null}
      </div>

      {state?.formError ? (
        <p className="text-sm text-red-600" role="alert">
          {state.formError}
        </p>
      ) : null}

      <FormSubmitButton
        pending={pending}
        loadingLabel="Saving…"
        className="w-full rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
      >
        Start earning →
      </FormSubmitButton>

      <p className="text-center text-sm text-slate-600">
        <Link href="/onboarding/verify" className="font-medium text-blue-700 hover:text-blue-800">
          Back
        </Link>
      </p>
    </form>
  );
}
