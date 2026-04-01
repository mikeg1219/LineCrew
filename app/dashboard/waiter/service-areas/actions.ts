"use server";

import { AIRPORT_CODES } from "@/lib/airports";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export type ServiceAreasFormState = { error: string } | null;

export async function saveServiceAreasAction(
  _prev: ServiceAreasFormState,
  formData: FormData
): Promise<ServiceAreasFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in required." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "waiter") {
    return { error: "Only Line Holders can edit service areas." };
  }

  const raw = formData.getAll("airport");
  const codes = raw
    .map((v) => String(v).trim().toUpperCase())
    .filter((c) => AIRPORT_CODES.has(c));

  if (codes.length === 0) {
    return { error: "Select at least one service area." };
  }

  const unique = [...new Set(codes)];

  const { error } = await supabase
    .from("profiles")
    .update({ serving_airports: unique })
    .eq("id", user.id);

  if (error) return { error: error.message };

  redirect("/dashboard/waiter");
  return null;
}
