"use client";

import { useFormStatus } from "react-dom";

function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

type FormSubmitButtonProps = {
  children: React.ReactNode;
  className?: string;
  /** Merges with useFormStatus().pending (e.g. useActionState isPending). */
  pending?: boolean;
  /** Shown next to spinner while submitting; defaults to `children`. */
  loadingLabel?: React.ReactNode;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "type">;

/**
 * Submit button with spinner while the parent &lt;form&gt; is submitting.
 * Must be rendered inside a &lt;form&gt;.
 */
export function FormSubmitButton({
  children,
  className = "",
  pending: pendingOverride,
  loadingLabel,
  disabled,
  ...rest
}: FormSubmitButtonProps) {
  const { pending: formPending } = useFormStatus();
  const pending = Boolean(pendingOverride) || formPending;
  const label = pending ? (loadingLabel ?? children) : children;

  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className={`inline-flex items-center justify-center gap-2 ${className}`}
      {...rest}
    >
      {pending ? (
        <>
          <Spinner className="size-4 shrink-0 opacity-90" />
          <span className="min-w-0">{label}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
