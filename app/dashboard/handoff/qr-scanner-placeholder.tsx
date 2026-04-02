"use client";

import { FormSubmitButton } from "@/components/form-submit-button";
import { Html5Qrcode } from "html5-qrcode";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

export type QRScannerLiveProps = {
  onParsed: (text: string) => void;
  onError?: (error: string) => void;
};

/**
 * Camera QR scanner using html5-qrcode. Stops the stream on unmount or when
 * switching to manual code entry.
 */
export function QRScannerLive({ onParsed, onError }: QRScannerLiveProps) {
  const reactId = useId();
  const regionId = `qr-live-${reactId.replace(/:/g, "")}`;

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const completedRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onParsedRef = useRef(onParsed);
  const onErrorRef = useRef(onError);

  const [permissionDenied, setPermissionDenied] = useState(false);
  const [useCodeInstead, setUseCodeInstead] = useState(false);
  const [longWaitHint, setLongWaitHint] = useState(false);
  const [successFlash, setSuccessFlash] = useState(false);
  const [finished, setFinished] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [manualVerifyBusy, setManualVerifyBusy] = useState(false);

  const skipCamera = permissionDenied || useCodeInstead || finished;

  useEffect(() => {
    onParsedRef.current = onParsed;
    onErrorRef.current = onError;
  }, [onParsed, onError]);

  const stopScanner = useCallback(async () => {
    if (timeoutRef.current != null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    const s = scannerRef.current;
    scannerRef.current = null;
    if (!s) return;
    try {
      await s.stop();
    } catch {
      /* already stopped */
    }
    try {
      await s.clear();
    } catch {
      /* clear fails if never started */
    }
  }, []);

  useEffect(() => {
    if (!successFlash) return;
    const t = window.setTimeout(() => setSuccessFlash(false), 2500);
    return () => clearTimeout(t);
  }, [successFlash]);

  useEffect(() => {
    if (skipCamera) return;
    if (typeof window === "undefined") return;

    let cancelled = false;
    const html5 = new Html5Qrcode(regionId, { verbose: false });
    scannerRef.current = html5;

    html5
      .start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const edge = Math.floor(
              Math.min(viewfinderWidth, viewfinderHeight) * 0.68
            );
            return { width: edge, height: edge };
          },
        },
        (decodedText) => {
          if (cancelled || completedRef.current) return;
          completedRef.current = true;
          const text = decodedText.trim();
          void (async () => {
            await stopScanner();
            if (cancelled) return;
            setFinished(true);
            onParsedRef.current(text);
            setSuccessFlash(true);
          })();
        },
        () => {
          /* per-frame: no QR in view */
        }
      )
      .then(() => {
        if (cancelled) return;
        timeoutRef.current = setTimeout(() => {
          setLongWaitHint(true);
        }, 30_000);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        try {
          void html5.clear();
        } catch {
          /* ignore */
        }
        setPermissionDenied(true);
        const msg = e instanceof Error ? e.message : String(e);
        onErrorRef.current?.(msg);
      });

    return () => {
      cancelled = true;
      void stopScanner();
    };
  }, [regionId, skipCamera, stopScanner]);

  const handleUseCodeInstead = () => {
    void stopScanner();
    setUseCodeInstead(true);
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = manualCode.trim();
    if (!v) return;
    setManualVerifyBusy(true);
    try {
      await stopScanner();
      setFinished(true);
      onParsed(v);
      setSuccessFlash(true);
    } finally {
      setManualVerifyBusy(false);
    }
  };

  const showManualBlock =
    permissionDenied || longWaitHint || useCodeInstead;

  return (
    <div className="space-y-3">
      {successFlash && (
        <div
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-sm font-semibold text-emerald-900"
          role="status"
        >
          ✓ Code scanned
        </div>
      )}

      {!skipCamera && (
        <div className="relative mx-auto max-w-md overflow-hidden rounded-2xl bg-black">
          <div id={regionId} className="min-h-[min(55vw,280px)] w-full" />

          <div className="pointer-events-none absolute inset-0 flex flex-col">
            <div className="min-h-[12%] flex-1 bg-black/60 sm:min-h-14" />
            <div className="flex w-full shrink-0 justify-center">
              <div className="flex flex-1 bg-black/60" />
              <div className="relative aspect-square w-[min(72vw,280px)] shrink-0">
                <div
                  className="absolute inset-0 rounded-2xl border-2 border-white/95 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]"
                  aria-hidden
                />
                <span className="absolute left-0 top-0 size-5 rounded-tl-2xl border-l-[3px] border-t-[3px] border-emerald-400" />
                <span className="absolute right-0 top-0 size-5 rounded-tr-2xl border-r-[3px] border-t-[3px] border-emerald-400" />
                <span className="absolute bottom-0 left-0 size-5 rounded-bl-2xl border-b-[3px] border-l-[3px] border-emerald-400" />
                <span className="absolute bottom-0 right-0 size-5 rounded-br-2xl border-b-[3px] border-r-[3px] border-emerald-400" />
              </div>
              <div className="flex flex-1 bg-black/60" />
            </div>
            <div className="min-h-[12%] flex-1 bg-black/60 sm:min-h-14" />
          </div>
        </div>
      )}

      {permissionDenied && !finished && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-6 text-center">
          <span className="relative flex h-14 w-14 items-center justify-center">
            <svg
              aria-hidden
              className="h-12 w-12 text-slate-400"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
              />
            </svg>
            <span className="absolute -right-0.5 -top-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white">
              ×
            </span>
          </span>
          <p className="text-sm font-semibold text-slate-900">
            Camera access denied
          </p>
          <p className="max-w-sm text-xs leading-relaxed text-slate-600">
            Enable camera in browser settings or enter code below
          </p>
        </div>
      )}

      {!permissionDenied && !finished && (
        <p className="text-center text-xs font-medium text-slate-600">
          Point camera at QR code
        </p>
      )}

      <div className="flex justify-center">
        <button
          type="button"
          onClick={handleUseCodeInstead}
          disabled={finished || useCodeInstead}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Use code instead
        </button>
      </div>

      {longWaitHint && !permissionDenied && !finished && (
        <p className="text-center text-xs text-amber-800">
          Having trouble? Enter the code manually below
        </p>
      )}

      {showManualBlock && !finished && (
        <form
          onSubmit={handleManualSubmit}
          className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/80 p-3"
        >
          <label className="sr-only" htmlFor={`${regionId}-manual`}>
            Handoff code
          </label>
          <input
            id={`${regionId}-manual`}
            type="text"
            inputMode="text"
            autoComplete="one-time-code"
            placeholder="Enter handoff code"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400"
          />
          <FormSubmitButton
            pending={manualVerifyBusy}
            loadingLabel="Verifying…"
            disabled={manualVerifyBusy}
            className="w-full rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-cyan-700 disabled:opacity-70"
          >
            Verify code
          </FormSubmitButton>
        </form>
      )}
    </div>
  );
}
