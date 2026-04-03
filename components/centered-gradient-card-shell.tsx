import type { ReactNode } from "react";

/**
 * Full-viewport blue→teal gradient with a centered white card.
 * Used by /auth and onboarding steps for consistent alignment.
 */
export function CenteredGradientCardShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-600 via-blue-500 to-teal-500 p-4">
      <div className="linecrew-card-marketing w-full max-w-md p-8 text-slate-900">{children}</div>
    </div>
  );
}
