"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

const POLL_MS = 14_000;
const REALTIME_GRACE_MS = 4_000;

export function BookingTrackingLive({ jobId }: { jobId: string }) {
  const router = useRouter();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const realtimeOkRef = useRef(false);
  const graceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    function clearPoll() {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }

    function startPolling() {
      if (pollRef.current || cancelled) return;
      pollRef.current = setInterval(() => {
        router.refresh();
      }, POLL_MS);
    }

    const channel = supabase
      .channel(`customer-job-live-${jobId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "jobs",
          filter: `id=eq.${jobId}`,
        },
        () => {
          router.refresh();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "overage_requests",
          filter: `job_id=eq.${jobId}`,
        },
        () => {
          router.refresh();
        }
      )
      .subscribe((status) => {
        if (cancelled) return;
        if (status === "SUBSCRIBED") {
          realtimeOkRef.current = true;
          if (graceRef.current) {
            clearTimeout(graceRef.current);
            graceRef.current = null;
          }
          return;
        }
        if (
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT" ||
          status === "CLOSED"
        ) {
          startPolling();
        }
      });

    graceRef.current = setTimeout(() => {
      if (cancelled) return;
      if (!realtimeOkRef.current) {
        startPolling();
      }
    }, REALTIME_GRACE_MS);

    return () => {
      cancelled = true;
      if (graceRef.current) clearTimeout(graceRef.current);
      clearPoll();
      void supabase.removeChannel(channel);
    };
  }, [jobId, router]);

  return null;
}
