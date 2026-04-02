import type { ReactNode } from "react";

/**
 * Full-viewport blue→teal gradient with a centered white card.
 * Used by /auth and onboarding steps for consistent alignment.
 */
export function CenteredGradientCardShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-blue-500 to-teal-500 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">{children}</div>
    </div>
  );
}
