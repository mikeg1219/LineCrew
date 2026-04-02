"use server";

import { parseJobIdFromFormData } from "@/lib/server-input";
import { executeBookingScopedContactOutbound } from "@/lib/contact-service";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type BookingContactFormState = {
  error?: string;
  success?: string;
} | null;

function revalidateBookingPaths(jobId: string) {
  revalidatePath(`/dashboard/customer/jobs/${jobId}`);
  revalidatePath(`/dashboard/waiter/jobs/${jobId}`);
}

export async function contactLineHolderForBooking(
  _prev: BookingContactFormState,
  formData: FormData
): Promise<BookingContactFormState> {
  const jobId = String(formData.get("jobId") ?? "");
  const note = String(formData.get("note") ?? "");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "customer") {
    return { error: "Only travelers can use this action." };
  }

  const result = await executeBookingScopedContactOutbound({
    jobId,
    direction: "customer_to_waiter",
    senderUserId: user.id,
    note,
  });

  if (!result.ok) {
    return { error: result.error };
  }

  revalidateBookingPaths(jobId);

  if (result.mode === "sent") {
    return {
      success:
        "One-way notification sent from LineCrew. Numbers are not shown in the app.",
    };
  }
  return {
    success:
      "Recorded. SMS was not sent (Twilio env or delivery). No numbers are exposed here.",
  };
}

export async function contactCustomerForBooking(
  _prev: BookingContactFormState,
  formData: FormData
): Promise<BookingContactFormState> {
  const jobId = parseJobIdFromFormData(formData);
  const note = String(formData.get("note") ?? "").trim();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in." };
  }
  if (!jobId) {
    return { error: "Invalid booking." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "waiter") {
    return { error: "Only Line Holders can use this action." };
  }

  const result = await executeBookingScopedContactOutbound({
    jobId,
    direction: "waiter_to_customer",
    senderUserId: user.id,
    note,
  });

  if (!result.ok) {
    return { error: result.error };
  }

  revalidateBookingPaths(jobId);

  if (result.mode === "sent") {
    return {
      success:
        "One-way notification sent from LineCrew. Numbers are not shown in the app.",
    };
  }
  return {
    success:
      "Recorded. SMS was not sent (Twilio env or delivery). No numbers are exposed here.",
  };
}
