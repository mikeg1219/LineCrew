/**
 * Profile photos: Supabase Storage bucket name.
 * Create bucket `avatars` in Supabase Dashboard → Storage (public read for getPublicUrl, or use signed URLs if you switch strategy).
 * RLS policies must allow authenticated users to upload to `avatars/{userId}/...`.
 */
export const AVATAR_STORAGE_BUCKET = "avatars";

/** Max upload size for profile images (5 MiB). */
export const AVATAR_MAX_FILE_BYTES = 5 * 1024 * 1024;

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export const AVATAR_ALLOWED_MIME_TYPES = new Set(Object.keys(MIME_TO_EXT));

/**
 * Storage object path (not a full URL). Stored in `profiles.avatar_url`.
 */
export function userAvatarObjectPath(userId: string, mimeType: string): string {
  const ext = MIME_TO_EXT[mimeType] ?? "jpg";
  return `${userId}/avatar.${ext}`;
}

export function validateAvatarFile(
  file: File
): { ok: true } | { ok: false; message: string } {
  if (!AVATAR_ALLOWED_MIME_TYPES.has(file.type)) {
    return {
      ok: false,
      message: "Please use a JPG, PNG, WebP, or GIF image.",
    };
  }
  if (file.size > AVATAR_MAX_FILE_BYTES) {
    return {
      ok: false,
      message: "That file is too large. Use an image under 5 MB.",
    };
  }
  if (file.size === 0) {
    return {
      ok: false,
      message: "That file appears empty. Please choose another image.",
    };
  }
  return { ok: true };
}

/** Bust browser cache when the same storage path is overwritten (upsert). */
export function avatarPublicUrlWithBust(
  publicUrl: string,
  versionKey: string | number | null | undefined
): string {
  if (versionKey == null || versionKey === "") {
    return publicUrl;
  }
  const v = encodeURIComponent(String(versionKey));
  return `${publicUrl}${publicUrl.includes("?") ? "&" : "?"}v=${v}`;
}
