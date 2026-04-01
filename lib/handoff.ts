export const HANDOFF_QR_TTL_SECONDS = 180;
export const HANDOFF_PROXIMITY_METERS = 30;

export function generateHandoffQrToken(jobId: string): string {
  const rand = Math.random().toString(36).slice(2, 10).toUpperCase();
  return `${jobId.slice(0, 8)}-${rand}`;
}

export function generateHandoffCode(): string {
  return `${Math.floor(1000 + Math.random() * 9000)}`;
}

export function computeDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function parseLatLon(raw: FormDataEntryValue | null): number | null {
  if (typeof raw !== "string") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}
