import type { HTMLAttributes } from "react";

const pulse = "animate-pulse bg-slate-200";

type SkeletonTextProps = {
  className?: string;
  lines?: number;
} & HTMLAttributes<HTMLDivElement>;

/**
 * Animated gray bar(s) for text placeholders.
 */
export function SkeletonText({
  className = "",
  lines = 1,
  style,
  ...rest
}: SkeletonTextProps) {
  if (lines <= 1) {
    return (
      <div
        className={`h-4 rounded-md ${pulse} ${className}`}
        style={style}
        {...rest}
      />
    );
  }
  return (
    <div className={`space-y-2 ${className}`} {...rest}>
      {Array.from({ length: lines }, (_, i) => (
        <div
          key={i}
          className={`h-4 rounded-md ${pulse} ${i === lines - 1 ? "w-4/5" : "w-full"}`}
        />
      ))}
    </div>
  );
}

type SkeletonCardProps = HTMLAttributes<HTMLDivElement>;

/**
 * Full-width card placeholder with optional header and body rows.
 */
export function SkeletonCard({ className = "", children, ...rest }: SkeletonCardProps) {
  return (
    <div
      className={`rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm ring-1 ring-slate-900/5 sm:p-6 ${className}`}
      {...rest}
    >
      {children ?? (
        <>
          <SkeletonText className="h-5 w-1/3" />
          <div className="mt-4 space-y-3">
            <SkeletonText lines={3} />
          </div>
        </>
      )}
    </div>
  );
}

type SkeletonAvatarProps = {
  size?: "sm" | "md" | "lg";
  className?: string;
};

const avatarSizes = {
  sm: "size-10",
  md: "size-14",
  lg: "size-20",
};

/**
 * Circular placeholder for avatars or icon slots.
 */
export function SkeletonAvatar({ size = "md", className = "" }: SkeletonAvatarProps) {
  return (
    <div
      className={`shrink-0 rounded-full ${pulse} ${avatarSizes[size]} ${className}`}
      aria-hidden
    />
  );
}
