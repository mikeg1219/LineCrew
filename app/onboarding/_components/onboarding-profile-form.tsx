"use client";

import {
  onboardingProfileAction,
  type OnboardingProfileState,
} from "@/app/onboarding/actions";
import {
  AVATAR_STORAGE_BUCKET,
  avatarPublicUrlWithBust,
  userAvatarObjectPath,
  validateAvatarForProcessing,
} from "@/lib/avatar-storage";
import { createClient } from "@/lib/supabase/client";
import type { UserRole } from "@/lib/types";
import Link from "next/link";
import { useActionState, useState } from "react";

const inputClass =
  "w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none ring-blue-600/20 transition focus:border-blue-600 focus:ring-4";

export function OnboardingProfileForm({
  role,
  userId,
  initialAvatarUrl,
}: {
  role: UserRole;
  userId: string;
  initialAvatarUrl: string | null;
}) {
  const [state, formAction, pending] = useActionState(
    onboardingProfileAction,
    null as OnboardingProfileState
  );
  const [uploadMsg, setUploadMsg] = useState("");
  const [avatarPath, setAvatarPath] = useState("");
  const [avatarPreview, setAvatarPreview] = useState(initialAvatarUrl);

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

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-800">First name</label>
        <input name="first_name" required className={inputClass} />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-800">Phone number</label>
        <input name="phone" type="tel" required className={inputClass} />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-800">
          Profile photo {role === "waiter" ? "(required)" : "(optional)"}
        </label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => onAvatarChange(e.target.files?.[0])}
          className={inputClass}
        />
        {avatarPreview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarPreview}
            alt="Avatar preview"
            className="mt-3 h-16 w-16 rounded-full border border-slate-200 object-cover"
          />
        ) : null}
        {uploadMsg ? <p className="mt-2 text-xs text-slate-600">{uploadMsg}</p> : null}
        <input type="hidden" name="avatar_url" value={avatarPath} />
      </div>

      {role === "waiter" ? (
        <>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-800">Short bio</label>
            <textarea
              name="bio"
              required
              rows={3}
              className={`${inputClass} resize-y`}
              placeholder="Tell customers about your reliability and queue experience."
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-800">
              Service areas / airports
            </label>
            <input
              name="service_areas"
              required
              className={inputClass}
              placeholder="TPA, MCO, MIA"
            />
          </div>
        </>
      ) : null}

      {state?.error ? (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {pending ? "Saving profile..." : "Complete setup"}
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
