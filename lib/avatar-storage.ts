/**
 * Profile photos: Supabase Storage bucket name.
 * Create bucket `avatars` in Supabase Dashboard → Storage (public read for getPublicUrl, or use signed URLs if you switch strategy).
 * RLS policies must allow authenticated users to upload to `avatars/{userId}/...`.
 */
export const AVATAR_STORAGE_BUCKET = "avatars";

/** Max size of processed JPEG sent to Storage (5 MiB). */
export const AVATAR_MAX_FILE_BYTES = 5 * 1024 * 1024;

/** Max original file size before client processing (larger images are resized). */
export const AVATAR_MAX_INPUT_BYTES = 25 * 1024 * 1024;

/** After processing, avatars are uploaded as JPEG at this MIME. */
export const AVATAR_PROCESSED_MIME = "image/jpeg" as const;

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

/** Validate type and original size before canvas processing. */
export function validateAvatarForProcessing(
  file: File
): { ok: true } | { ok: false; message: string } {
  if (!AVATAR_ALLOWED_MIME_TYPES.has(file.type)) {
    return {
      ok: false,
      message: "Please use a JPG, PNG, WebP, or GIF image.",
    };
  }
  if (file.size === 0) {
    return {
      ok: false,
      message: "That file appears empty. Please choose another image.",
    };
  }
  if (file.size > AVATAR_MAX_INPUT_BYTES) {
    return {
      ok: false,
      message: "That file is too large. Use an image under 25 MB.",
    };
  }
  return { ok: true };
}

/** After resize/compress, ensure blob is acceptable for upload. */
export function validateProcessedAvatarBlob(
  blob: Blob
): { ok: true } | { ok: false; message: string } {
  if (blob.size === 0) {
    return {
      ok: false,
      message: "We couldn't prepare that image. Try a different file.",
    };
  }
  if (blob.size > AVATAR_MAX_FILE_BYTES) {
    return {
      ok: false,
      message:
        "We couldn't reduce that photo enough. Try a smaller or simpler image.",
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
