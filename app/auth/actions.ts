"use server";

import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";

async function redirectToRoleDashboard(supabase: SupabaseClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/dashboard");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role === "customer" || profile?.role === "waiter") {
    redirect(`/dashboard/${profile.role}`);
  }

  redirect("/dashboard");
}

export type AuthActionState =
  | { error: string; mode: "signin" | "signup" }
  | { message: string; mode: "signup" }
  | null;

export async function authAction(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const mode = formData.get("mode");
  const authMode: "signin" | "signup" =
    mode === "signup" ? "signup" : "signin";
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return {
      error: "Email and password are required.",
      mode: authMode,
    };
  }

  const supabase = await createClient();

  if (mode === "signup") {
    const roleRaw = formData.get("role");
    const role: UserRole =
      roleRaw === "waiter" || roleRaw === "customer" ? roleRaw : "customer";

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { role },
      },
    });

    if (error) {
      return { error: error.message, mode: authMode };
    }

    revalidatePath("/", "layout");

    if (data.session) {
      await redirectToRoleDashboard(supabase);
      return null;
    }

    return {
      message:
        "Check your email to confirm your account before signing in.",
      mode: "signup",
    };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message, mode: authMode };
  }

  revalidatePath("/", "layout");
  await redirectToRoleDashboard(supabase);
  return null;
}
