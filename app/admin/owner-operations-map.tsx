"use client";

import { useMemo, useState } from "react";

export type OwnerMapMarker = {
  key: string;
  airport: string;
  label: string;
  count: number;
  type: "active" | "available" | "unfulfilled";
  top: string;
  left: string;
};

export function OwnerOperationsMap({
  markers,
  unknownAirportCount,
}: {
  markers: OwnerMapMarker[];
  unknownAirportCount: number;
}) {
  const [showActive, setShowActive] = useState(true);
  const [showAvailable, setShowAvailable] = useState(true);
  const [showUnfulfilled, setShowUnfulfilled] = useState(true);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const visible = useMemo(
    () =>
      markers.filter((m) => {
        if (m.type === "active" && !showActive) return false;
        if (m.type === "available" && !showAvailable) return false;
        if (m.type === "unfulfilled" && !showUnfulfilled) return false;
        return true;
      }),
    [markers, showActive, showAvailable, showUnfulfilled]
  );

  const selected = visible.find((m) => m.key === selectedKey) ?? null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <ToggleChip
          label="Active jobs"
          enabled={showActive}
          onToggle={() => setShowActive((v) => !v)}
          dotClass="bg-emerald-400"
        />
        <ToggleChip
          label="Available holders"
          enabled={showAvailable}
          onToggle={() => setShowAvailable((v) => !v)}
          dotClass="bg-cyan-300"
        />
        <ToggleChip
          label="Unfulfilled"
          enabled={showUnfulfilled}
          onToggle={() => setShowUnfulfilled((v) => !v)}
          dotClass="bg-rose-400"
        />
      </div>

      <div className="relative h-72 rounded-xl bg-slate-900/95 p-4 text-slate-100">
        {visible.map((point) => (
          <button
            key={point.key}
            type="button"
            className="absolute"
            style={{ top: point.top, left: point.left }}
            title={point.label}
            onClick={() => setSelectedKey(point.key)}
          >
            <span
              className={`block size-3 rounded-full ring-2 ring-white/70 ${
                point.type === "active"
                  ? "bg-emerald-400"
                  : point.type === "available"
                    ? "bg-cyan-300"
                    : "bg-rose-400"
              } ${selectedKey === point.key ? "scale-125" : ""}`}
            />
          </button>
        ))}

        <div className="absolute right-3 top-3 rounded-md bg-slate-800/80 px-2 py-1 text-[11px] text-slate-200">
          {visible.length} visible markers
          {unknownAirportCount > 0 ? ` · ${unknownAirportCount} unmapped airport codes` : ""}
        </div>
        <div className="absolute bottom-3 left-3 flex flex-wrap gap-3 text-xs">
          <LegendDot color="bg-emerald-400" label="Active jobs" />
          <LegendDot color="bg-cyan-300" label="Available line holders" />
          <LegendDot color="bg-rose-400" label="Unfulfilled requests" />
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
        {selected ? (
          <p>
            <span className="font-semibold text-slate-900">{selected.airport}</span>:{" "}
            {selected.type} count <span className="font-semibold">{selected.count}</span>
          </p>
        ) : (
          <p>Click a marker to see airport details.</p>
        )}
      </div>
    </div>
  );
}

function ToggleChip({
  label,
  enabled,
  onToggle,
  dotClass,
}: {
  label: string;
  enabled: boolean;
  onToggle: () => void;
  dotClass: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
        enabled
          ? "border-slate-300 bg-white text-slate-800"
          : "border-slate-200 bg-slate-100 text-slate-500"
      }`}
    >
      <span className={`size-2 rounded-full ${dotClass}`} />
      {label}
    </button>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`size-2 rounded-full ${color}`} />
      {label}
    </span>
  );
}
