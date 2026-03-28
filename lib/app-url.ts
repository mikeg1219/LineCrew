/** Public base URL for Stripe redirects (no trailing slash). No hardcoded localhost in production. */
function stripTrailingSlash(url: string): string {
  return url.replace(/\/$/, "");
}

export function appBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) {
    return stripTrailingSlash(explicit);
  }

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    return `https://${stripTrailingSlash(vercel)}`;
  }

  if (process.env.NODE_ENV !== "production") {
    return "http://localhost:3000";
  }

  throw new Error(
    "Set NEXT_PUBLIC_APP_URL to your public site URL (e.g. https://yourdomain.com)."
  );
}
