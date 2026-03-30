/**
 * Display/name helpers when `profiles.first_name` may be absent (older DB schemas).
 * Writes to `first_name` in profile actions still require that column if you use it — add via migration.
 */
export type ProfileNameFields = {
  first_name?: string | null;
  full_name?: string | null;
  display_name?: string | null;
};

/** True if at least one human-readable name field is present. */
export function profileHasResolvableName(p: ProfileNameFields): boolean {
  return Boolean(
    (p.first_name ?? "").trim() ||
      (p.full_name ?? "").trim() ||
      (p.display_name ?? "").trim()
  );
}

/** Single line for header / cards: prefers first name, then display/full, then email local part. */
export function profileResolvedLabel(
  p: ProfileNameFields | null | undefined,
  emailFallback?: string | null
): string {
  const t = (s: string | null | undefined) => (s ?? "").trim();
  if (!p) {
    return t(emailFallback?.split("@")[0]) || "Account";
  }
  if (t(p.first_name)) return t(p.first_name)!;
  if (t(p.display_name)) return t(p.display_name)!;
  if (t(p.full_name)) return t(p.full_name)!;
  return t(emailFallback?.split("@")[0]) || "Account";
}

/** First word for “Welcome back, …” when only full_name/display_name exist. */
export function profileWelcomeFirstName(
  p: ProfileNameFields | null | undefined,
  emailFallback?: string | null
): string {
  const full = profileResolvedLabel(p, emailFallback);
  const word = full.split(/\s+/)[0];
  return word || "there";
}
