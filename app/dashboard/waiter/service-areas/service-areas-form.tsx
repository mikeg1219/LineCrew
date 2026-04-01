"use client";

import { saveServiceAreasAction } from "@/app/dashboard/waiter/service-areas/actions";
import { US_AIRPORTS_TOP_20 } from "@/lib/airports";
import { useActionState } from "react";

const initial = null;

export function ServiceAreasForm({
  defaultSelected,
}: {
  defaultSelected: Set<string>;
}) {
  const [state, formAction, pending] = useActionState(
    saveServiceAreasAction,
    initial
  );

  return (
    <form action={formAction} className="mt-8 space-y-3">
      <ul className="max-h-[60vh] space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-white p-4">
        {US_AIRPORTS_TOP_20.map((a) => (
          <li key={a.code}>
            <label className="flex cursor-pointer items-start gap-3 text-sm text-slate-800">
              <input
                type="checkbox"
                name="airport"
                value={a.code}
                defaultChecked={defaultSelected.has(a.code)}
                className="mt-1 size-4 rounded border-slate-300 text-blue-600"
              />
              <span>
                <span className="font-medium">{a.label}</span>
              </span>
            </label>
          </li>
        ))}
      </ul>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save service areas"}
      </button>
    </form>
  );
}
