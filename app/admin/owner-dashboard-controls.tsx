"use client";

import { useMemo, useState } from "react";

type FeeOverrides = {
  airports: number;
  dmv: number;
  events: number;
  orlando: number;
  atlanta: number;
};

type AiRec = {
  id: string;
  title: string;
  explanation: string;
  confidence: "low" | "medium" | "high";
  multiplier: number;
  feePct: number;
  incentive: number;
  impactFulfillment: string;
  impactRevenue: string;
};

const defaultOverrides: FeeOverrides = {
  airports: 20,
  dmv: 18,
  events: 24,
  orlando: 22,
  atlanta: 20,
};

const recommendationsSeed: AiRec[] = [
  {
    id: "mco-peak",
    title: "Orlando Airport peak hour surge",
    explanation: "High demand and low supply in Orlando Airport from 6-8 PM.",
    confidence: "high",
    multiplier: 1.4,
    feePct: 22,
    incentive: 4,
    impactFulfillment: "+14%",
    impactRevenue: "+$210/day",
  },
  {
    id: "atl-balance",
    title: "Atlanta demand balancing",
    explanation: "Moderate demand growth and stable supply in Atlanta terminals.",
    confidence: "medium",
    multiplier: 1.15,
    feePct: 21,
    incentive: 2,
    impactFulfillment: "+6%",
    impactRevenue: "+$98/day",
  },
];

export function OwnerDashboardControls() {
  const [globalFee, setGlobalFee] = useState(20);
  const [peakBoost, setPeakBoost] = useState(5);
  const [overrides, setOverrides] = useState<FeeOverrides>(defaultOverrides);
  const [recs, setRecs] = useState<AiRec[]>(recommendationsSeed);

  const preview = useMemo(() => {
    const baseOrder = 30;
    const feeDollars = (baseOrder * globalFee) / 100;
    const workerPayout = baseOrder - feeDollars;
    return {
      baseOrder,
      feeDollars,
      workerPayout,
    };
  }, [globalFee]);

  const applyRecommendation = (rec: AiRec) => {
    setGlobalFee(rec.feePct);
    setPeakBoost(Math.round((rec.multiplier - 1) * 100));
    setRecs((prev) => prev.filter((r) => r.id !== rec.id));
  };

  return (
    <section className="grid gap-6 xl:grid-cols-2">
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
        <h2 className="text-base font-semibold text-slate-900">
          Platform Fee Management
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Configure default commission and override by category/location.
        </p>

        <div className="mt-4 space-y-4">
          <FeeControl
            label="Global default fee"
            value={globalFee}
            onChange={setGlobalFee}
          />

          <div className="rounded-xl border border-slate-200 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Category overrides
            </p>
            <div className="mt-2 grid gap-3 sm:grid-cols-3">
              <FeeInput
                label="Airports"
                value={overrides.airports}
                onChange={(v) => setOverrides((p) => ({ ...p, airports: v }))}
              />
              <FeeInput
                label="DMV"
                value={overrides.dmv}
                onChange={(v) => setOverrides((p) => ({ ...p, dmv: v }))}
              />
              <FeeInput
                label="Events"
                value={overrides.events}
                onChange={(v) => setOverrides((p) => ({ ...p, events: v }))}
              />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Location overrides
            </p>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <FeeInput
                label="Orlando"
                value={overrides.orlando}
                onChange={(v) => setOverrides((p) => ({ ...p, orlando: v }))}
              />
              <FeeInput
                label="Atlanta"
                value={overrides.atlanta}
                onChange={(v) => setOverrides((p) => ({ ...p, atlanta: v }))}
              />
            </div>
          </div>

          <FeeControl
            label="Peak-hours adjustment"
            value={peakBoost}
            onChange={setPeakBoost}
            max={25}
          />

          <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
            <p className="font-medium text-slate-900">Real-time preview ($30 order)</p>
            <p>Platform fee: ${preview.feeDollars.toFixed(2)}</p>
            <p>Line Holder payout: ${preview.workerPayout.toFixed(2)}</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
        <h2 className="text-base font-semibold text-slate-900">AI Pricing Insights</h2>
        <p className="mt-1 text-sm text-slate-600">
          Recommendations based on demand, supply, fulfillment rate, time, and location.
        </p>
        <div className="mt-4 space-y-3">
          {recs.length === 0 && (
            <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
              No pending recommendations. You are up to date.
            </p>
          )}
          {recs.map((rec) => (
            <div key={rec.id} className="rounded-xl border border-slate-200 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-slate-900">{rec.title}</p>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    rec.confidence === "high"
                      ? "bg-emerald-100 text-emerald-800"
                      : rec.confidence === "medium"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {rec.confidence} confidence
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-600">{rec.explanation}</p>
              <div className="mt-2 grid gap-1 text-sm text-slate-700 sm:grid-cols-2">
                <p>Suggested multiplier: {rec.multiplier.toFixed(2)}x</p>
                <p>Suggested fee: {rec.feePct}%</p>
                <p>Worker incentive: +${rec.incentive}</p>
                <p>Fulfillment impact: {rec.impactFulfillment}</p>
                <p className="sm:col-span-2">Revenue impact: {rec.impactRevenue}</p>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => applyRecommendation(rec)}
                  className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                >
                  Apply recommendation
                </button>
                <button
                  onClick={() => setGlobalFee(rec.feePct)}
                  className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Modify values
                </button>
                <button
                  onClick={() => setRecs((prev) => prev.filter((r) => r.id !== rec.id))}
                  className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                >
                  Dismiss
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeeControl({
  label,
  value,
  onChange,
  max = 35,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  max?: number;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <p className="text-sm font-medium text-slate-800">{label}</p>
        <input
          type="number"
          min={0}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-16 rounded-md border border-slate-300 px-2 py-1 text-right text-sm"
        />
      </div>
      <input
        type="range"
        min={0}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
    </div>
  );
}

function FeeInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="text-xs text-slate-600">
      {label}
      <input
        type="number"
        min={0}
        max={35}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-800"
      />
    </label>
  );
}
