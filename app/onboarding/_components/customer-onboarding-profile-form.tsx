"use client";

import {
  onboardingCustomerProfileAction,
  type OnboardingCustomerProfileState,
} from "@/app/onboarding/actions";
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
import { useActionState, useState } from "react";

const inputClass =
  "w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none ring-blue-600/20 transition focus:border-blue-600 focus:ring-4";

export function CustomerOnboardingProfileForm({
  userId,
  initialAvatarUrl,
}: {
  userId: string;
  initialAvatarUrl: string | null;
}) {
  const [state, formAction, pending] = useActionState(
    onboardingCustomerProfileAction,
    null as OnboardingCustomerProfileState
  );
  const [uploadMsg, setUploadMsg] = useState("");
  const [avatarPath, setAvatarPath] = useState("");
  const [avatarPreview, setAvatarPreview] = useState(initialAvatarUrl);
  const [phoneCountryId, setPhoneCountryId] = useState("US");
  const [nationalDigits, setNationalDigits] = useState("");
  const [skipPhoto, setSkipPhoto] = useState(false);

  const nanp = getPhoneCountry(phoneCountryId)?.nanp ?? true;

  function onPhoneInput(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    if (nanp) {
      setNationalDigits(raw.replace(/\D/g, "").slice(0, 10));
    } else {
      setNationalDigits(raw.replace(/\D/g, "").slice(0, 15));
    }
  }

  const displayPhone = nanp ? formatUsNationalDisplay(nationalDigits) : nationalDigits;

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
    setSkipPhoto(false);
    setUploadMsg("Photo added.");
  }

  return (
    <form action={formAction} className="mx-auto flex max-w-md flex-col space-y-5">
      <input type="hidden" name="role" value="customer" />
      <input type="hidden" name="phone_national" value={nationalDigits} />
      <input type="hidden" name="avatar_url" value={skipPhoto ? "" : avatarPath} />
      <input type="hidden" name="skip_photo" value={skipPhoto ? "1" : "0"} />

      <div>
        <label htmlFor="first_name" className="mb-1.5 block text-sm font-medium text-slate-800">
          First name <span className="text-red-600">*</span>
        </label>
        <input
          id="first_name"
          name="first_name"
          required
          className={inputClass}
          aria-invalid={Boolean(state?.fieldErrors?.first_name)}
        />
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
            name="phone_country_id"
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
            id="phone_national"
            type="tel"
            inputMode={nanp ? "numeric" : "tel"}
            autoComplete="tel-national"
            value={displayPhone}
            onChange={onPhoneInput}
            className={`${inputClass} min-w-0 flex-1`}
            placeholder={nanp ? "(555) 123-4567" : "Phone number"}
            aria-invalid={Boolean(state?.fieldErrors?.phone)}
          />
        </div>
        {state?.fieldErrors?.phone ? (
          <p className="mt-1 text-xs text-red-600">{state.fieldErrors.phone}</p>
        ) : null}
      </div>

      <div>
        <p className="mb-1.5 text-sm font-medium text-slate-800">Profile photo (optional)</p>
        <p className="mb-2 text-sm text-slate-600">
          Add a photo so Line Holders can find you
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
        <button
          type="button"
          onClick={() => {
            setSkipPhoto(true);
            setAvatarPath("");
            setAvatarPreview(null);
            setUploadMsg("You can add a photo later in Profile.");
          }}
          className="mt-2 text-sm font-medium text-blue-700 hover:text-blue-800"
        >
          Skip for now →
        </button>
      </div>

      {state?.formError ? (
        <p className="text-sm text-red-600" role="alert">
          {state.formError}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {pending ? "Saving..." : "Complete setup →"}
      </button>

      <p className="text-center text-sm text-slate-600">
        <Link
          href="/onboarding/verify"
          className="font-medium text-blue-700 hover:text-blue-800"
        >
          Back
        </Link>
      </p>
    </form>
  );
}
