"use server";

import {
  clipToMaxLength,
  isValidEmail,
  MAX_PROFILE_BIO_CHARS,
} from "@/lib/server-input";
import { createClient } from "@/lib/supabase/server";
import { sendEmailVerificationForNewUser } from "@/lib/email-verification-service";
import { isValidE164ForStorage, normalizePhoneE164 } from "@/lib/phone";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { UserRole } from "@/lib/types";

export type OnboardingAccountState =
  | {
      fieldErrors?: {
        email?: string;
        password?: string;
        confirm_password?: string;
      };
      formError?: string;
    }
  | null;

export async function onboardingAccountAction(
  _prev: OnboardingAccountState,
  formData: FormData
): Promise<OnboardingAccountState> {
  const roleRaw = formData.get("role");
  const role: UserRole =
    roleRaw === "waiter" || roleRaw === "customer" ? roleRaw : "customer";
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm_password") ?? "");

  if (!email || !password || !confirm) {
    return {
      fieldErrors: {
        email: !email ? "Email is required." : undefined,
        password: !password ? "Password is required." : undefined,
        confirm_password: !confirm ? "Confirm password is required." : undefined,
      },
    };
  }
  if (!isValidEmail(email)) {
    return { fieldErrors: { email: "Enter a valid email address." } };
  }
  if (password.length < 8) {
    return {
      fieldErrors: { password: "Password must be at least 8 characters." },
    };
  }
  if (password !== confirm) {
    return {
      fieldErrors: { confirm_password: "Passwords do not match." },
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { role } },
  });
  if (error) {
    if (error.message.toLowerCase().includes("email")) {
      return { fieldErrors: { email: error.message } };
    }
    return { formError: error.message };
  }

  const userId = data.user?.id ?? data.session?.user?.id;
  if (userId) {
    await supabase
      .from("profiles")
      .update({ role, onboarding_step: 1 })
      .eq("id", userId);
    await sendEmailVerificationForNewUser(userId, email, role);
  }

  revalidatePath("/", "layout");
  redirect(
    `/onboarding/verify?pending=1&role=${encodeURIComponent(role)}&email=${encodeURIComponent(email)}`
  );
}

export type OnboardingProfileState = { error: string } | null;

export type OnboardingCustomerProfileState =
  | {
      fieldErrors?: {
        first_name?: string;
        phone?: string;
      };
      formError?: string;
    }
  | null;

export type OnboardingWaiterProfileState =
  | {
      fieldErrors?: {
        avatar_url?: string;
        first_name?: string;
        phone?: string;
        bio?: string;
        service_areas?: string;
      };
      formError?: string;
    }
  | null;

export async function onboardingCustomerProfileAction(
  _prev: OnboardingCustomerProfileState,
  formData: FormData
): Promise<OnboardingCustomerProfileState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { formError: "Please sign in again." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "customer") {
    return { formError: "This step is for customers only." };
  }

  const firstName = String(formData.get("first_name") ?? "").trim();
  const countryId = String(formData.get("phone_country_id") ?? "US").trim();
  const national = String(formData.get("phone_national") ?? "").trim();
  const avatarUrl = String(formData.get("avatar_url") ?? "").trim();
  const skipPhoto = String(formData.get("skip_photo") ?? "") === "1";

  const fieldErrors: { first_name?: string; phone?: string } = {};
  if (!firstName) {
    fieldErrors.first_name = "First name is required.";
  }

  const phoneNorm = normalizePhoneE164(countryId, national);
  if (!phoneNorm.ok) {
    fieldErrors.phone = phoneNorm.message;
  } else if (!phoneNorm.e164 || !isValidE164ForStorage(phoneNorm.e164)) {
    fieldErrors.phone = "Enter a valid phone number.";
  }

  if (fieldErrors.first_name || fieldErrors.phone) {
    return { fieldErrors };
  }

  const now = new Date().toISOString();
  const e164 = phoneNorm.ok && phoneNorm.e164 ? phoneNorm.e164 : null;
  if (!e164) {
    return { fieldErrors: { phone: "Enter a valid phone number." } };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: firstName,
      display_name: firstName,
      full_name: firstName,
      phone: e164,
      avatar_url: skipPhoto || !avatarUrl ? null : avatarUrl,
      onboarding_step: 3,
      onboarding_completed: true,
      onboarding_completed_at: now,
      profile_completed: true,
      updated_at: now,
    })
    .eq("id", user.id)
    .eq("role", "customer");

  if (error) {
    return { formError: "Unable to save right now. Please try again." };
  }

  revalidatePath("/dashboard/customer");
  redirect("/dashboard/customer?welcome=1");
}

export async function onboardingWaiterProfileAction(
  _prev: OnboardingWaiterProfileState,
  formData: FormData
): Promise<OnboardingWaiterProfileState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { formError: "Please sign in again." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "waiter") {
    return { formError: "This step is for Line Holders only." };
  }

  const firstName = String(formData.get("first_name") ?? "").trim();
  const countryId = String(formData.get("phone_country_id") ?? "US").trim();
  const national = String(formData.get("phone_national") ?? "").trim();
  const avatarUrl = String(formData.get("avatar_url") ?? "").trim();
  const bio = clipToMaxLength(
    String(formData.get("bio") ?? "").trim(),
    MAX_PROFILE_BIO_CHARS
  );
  const serviceAreasRaw = String(formData.get("service_areas") ?? "").trim();
  const serviceAreas = serviceAreasRaw
    .split(/[,;\n]+/)
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);

  const fieldErrors: {
    avatar_url?: string;
    first_name?: string;
    phone?: string;
    bio?: string;
    service_areas?: string;
  } = {};

  if (!avatarUrl) fieldErrors.avatar_url = "Profile photo is required.";
  if (!firstName) fieldErrors.first_name = "First name is required.";

  const phoneNorm = normalizePhoneE164(countryId, national);
  if (!phoneNorm.ok) {
    fieldErrors.phone = phoneNorm.message;
  } else if (!phoneNorm.e164 || !isValidE164ForStorage(phoneNorm.e164)) {
    fieldErrors.phone = "Enter a valid phone number.";
  }

  if (!bio) {
    fieldErrors.bio = "Short bio is required.";
  }

  if (serviceAreas.length === 0) {
    fieldErrors.service_areas = "Select at least one airport.";
  }

  if (
    fieldErrors.avatar_url ||
    fieldErrors.first_name ||
    fieldErrors.phone ||
    fieldErrors.bio ||
    fieldErrors.service_areas
  ) {
    return { fieldErrors };
  }

  const now = new Date().toISOString();
  const e164 = phoneNorm.ok && phoneNorm.e164 ? phoneNorm.e164 : null;
  if (!e164) {
    return { fieldErrors: { phone: "Enter a valid phone number." } };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: firstName,
      display_name: firstName,
      full_name: firstName,
      phone: e164,
      avatar_url: avatarUrl,
      bio,
      serving_airports: [...new Set(serviceAreas)],
      onboarding_step: 3,
      onboarding_completed: true,
      onboarding_completed_at: now,
      profile_completed: true,
      updated_at: now,
    })
    .eq("id", user.id)
    .eq("role", "waiter");

  if (error) {
    return { formError: "Unable to save right now. Please try again." };
  }

  revalidatePath("/dashboard/waiter");
  redirect("/dashboard/waiter?welcome=1");
}

export async function markOnboardingVerifiedAction(role: UserRole): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("profiles")
    .update({
      onboarding_step: 2,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  revalidatePath("/onboarding/verify");
  revalidatePath("/onboarding/profile");
  if (role === "customer") {
    redirect("/onboarding/profile/customer");
  }
  if (role === "waiter") {
    redirect("/onboarding/profile/waiter");
  }
  redirect(`/onboarding/profile?role=${encodeURIComponent(role)}`);
}

export async function onboardingProfileAction(
  _prev: OnboardingProfileState,
  formData: FormData
): Promise<OnboardingProfileState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in again." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  const role = profile?.role as UserRole | null;
  if (role !== "customer" && role !== "waiter") {
    return { error: "Your account role is missing. Restart onboarding." };
  }

  const firstName = String(formData.get("first_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const avatarUrl = String(formData.get("avatar_url") ?? "").trim();
  const bio = clipToMaxLength(
    String(formData.get("bio") ?? "").trim(),
    MAX_PROFILE_BIO_CHARS
  );
  const serviceAreasRaw = String(formData.get("service_areas") ?? "").trim();
  const serviceAreas = serviceAreasRaw
    .split(/[,;\n]+/)
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);

  if (!firstName || !phone) {
    return { error: "First name and phone number are required." };
  }
  if (role === "waiter" && !avatarUrl) {
    return { error: "Profile photo is required for Line Holders." };
  }
  if (role === "waiter" && !bio) {
    return { error: "Short bio is required for Line Holders." };
  }
  if (role === "waiter" && serviceAreas.length === 0) {
    return { error: "Add at least one service area/airport." };
  }

  const now = new Date().toISOString();
  const payload =
    role === "waiter"
      ? {
          first_name: firstName,
          display_name: firstName,
          full_name: firstName,
          phone,
          avatar_url: avatarUrl || null,
          bio,
          serving_airports: serviceAreas,
          onboarding_step: 3,
          onboarding_completed: true,
          onboarding_completed_at: now,
          profile_completed: true,
          updated_at: now,
        }
      : {
          first_name: firstName,
          display_name: firstName,
          full_name: firstName,
          phone,
          avatar_url: avatarUrl || null,
          onboarding_step: 3,
          onboarding_completed: true,
          onboarding_completed_at: now,
          profile_completed: true,
          updated_at: now,
        };

  const { error } = await supabase.from("profiles").update(payload).eq("id", user.id);
  if (error) return { error: "Unable to save profile right now. Please try again." };

  revalidatePath("/dashboard", "layout");
  redirect(role === "waiter" ? "/dashboard/waiter" : "/dashboard/customer");
}
