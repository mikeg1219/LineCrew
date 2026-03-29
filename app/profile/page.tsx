import { ProfileSettingsForm } from "@/app/profile/profile-settings-form";

export default function ProfilePage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Account
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          Profile settings
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Update your name, contact details, and role-specific preferences.
        </p>
      </div>
      <ProfileSettingsForm />
    </div>
  );
}
