"use client";

import { useQrScanner } from "@/app/dashboard/handoff/use-qr-scanner";
import { useState } from "react";

export function QrScannerPlaceholder({
  onParsed,
}: {
  onParsed: (token: string) => void;
}) {
  const [raw, setRaw] = useState("");
  const [hint, setHint] = useState<string | null>(null);
  const { supported, isScanning, error, start, stop, videoRef } = useQrScanner((value) => {
    onParsed(value);
    setHint("QR detected from camera and parsed.");
  });

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Scanner (camera placeholder)
      </p>
      <p className="mt-1 text-xs text-slate-600">
        Progressive scanner: uses camera + QR detection when available; manual paste fallback is always available.
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => (isScanning ? stop() : start())}
          className="rounded-lg border border-cyan-300 bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-900"
        >
          {isScanning ? "Stop camera scan" : "Start camera scan"}
        </button>
        <span className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-medium text-slate-600">
          {supported ? "Camera scan supported" : "Camera scan unsupported"}
        </span>
      </div>
      {isScanning && (
        <video
          ref={videoRef}
          className="mt-2 h-40 w-full rounded-lg border border-slate-300 bg-black object-cover"
          muted
          playsInline
        />
      )}
      <input
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        placeholder="linecrew://handoff?token=ABC123..."
        className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
      />
      <button
        type="button"
        onClick={() => {
          const text = raw.trim();
          if (!text) {
            setHint("Paste scanner payload first.");
            return;
          }
          let token = text;
          try {
            if (text.includes("token=")) {
              const u = new URL(text);
              token = u.searchParams.get("token") ?? text;
            }
          } catch {
            // keep raw token fallback
          }
          if (!token) {
            setHint("Could not parse token from payload.");
            return;
          }
          onParsed(token);
          setHint("Token parsed. Tap verify to complete handoff.");
        }}
        className="mt-2 rounded-lg border border-cyan-300 bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-900"
      >
        Parse scanned value
      </button>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      {hint && <p className="mt-2 text-xs text-slate-600">{hint}</p>}
    </div>
  );
}
