"use server";

import { setBookingDraftCookie } from "@/lib/booking-draft-cookie";
import { parseAndValidatePostJobFormData } from "@/lib/post-job-draft";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export type PostJobState = { error: string } | null;

export async function postJobAction(
  _prev: PostJobState,
  formData: FormData
): Promise<PostJobState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to post a booking." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "customer") {
    return { error: "Only customers can post bookings." };
  }

  const parsed = parseAndValidatePostJobFormData(formData);
  if (!parsed.ok) {
    return { error: parsed.error };
  }

  await setBookingDraftCookie(parsed.draft);
  redirect("/dashboard/customer/booking-review");
  return null;
}
