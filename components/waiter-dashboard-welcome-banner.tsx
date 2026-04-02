"use client";

import { useSyncExternalStore, useCallback, useState } from "react";

const STORAGE_KEY = "linecrew:waiter-welcome-banner-dismissed";

type Props = {
  /** Show only when onboarding_step is defined and less than 3 */
  show: boolean;
};

function getSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function getServerSnapshot(): boolean {
  return false;
}

function subscribe(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  return () => window.removeEventListener("storage", onStoreChange);
}

export function WaiterDashboardWelcomeBanner({ show }: Props) {
  const [localDismissed, setLocalDismissed] = useState(false);
  const storedDismissed = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  const notifyDismiss = useCallback(() => {
    setLocalDismissed(true);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* private mode */
    }
  }, []);

  const dismissed = storedDismissed || localDismissed;

  if (!show || dismissed) {
    return null;
  }

  return (
    <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-blue-200/90 bg-blue-50/95 px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4">
      <p className="text-sm font-medium leading-relaxed text-blue-950">
        Welcome to LineCrew! Complete the steps below to start earning.
      </p>
      <button
        type="button"
        onClick={notifyDismiss}
        className="inline-flex shrink-0 items-center justify-center rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-900 shadow-sm transition hover:bg-blue-100/80"
      >
        Dismiss
      </button>
    </div>
  );
}
