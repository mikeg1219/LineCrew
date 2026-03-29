import { AVATAR_MAX_FILE_BYTES } from "@/lib/avatar-storage";

/** Max width/height for profile avatars (aspect ratio preserved). */
export const AVATAR_MAX_DIMENSION = 512;

/**
 * Resize and compress to JPEG in the browser (canvas).
 * Retries with lower quality if output still exceeds `AVATAR_MAX_FILE_BYTES`.
 */
export function processAvatarImageToJpeg(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      void (async () => {
        try {
          const w = img.naturalWidth || img.width;
          const h = img.naturalHeight || img.height;
          if (w < 1 || h < 1) {
            reject(new Error("invalid dimensions"));
            return;
          }
          const scale = Math.min(
            1,
            AVATAR_MAX_DIMENSION / w,
            AVATAR_MAX_DIMENSION / h
          );
          const tw = Math.max(1, Math.round(w * scale));
          const th = Math.max(1, Math.round(h * scale));
          const canvas = document.createElement("canvas");
          canvas.width = tw;
          canvas.height = th;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("context"));
            return;
          }
          ctx.drawImage(img, 0, 0, tw, th);

          let quality = 0.85;
          let blob: Blob | null = null;
          for (let attempt = 0; attempt < 5; attempt++) {
            blob = await new Promise<Blob | null>((res) =>
              canvas.toBlob((b) => res(b), "image/jpeg", quality)
            );
            if (!blob) {
              reject(new Error("toBlob"));
              return;
            }
            if (blob.size <= AVATAR_MAX_FILE_BYTES) {
              resolve(blob);
              return;
            }
            quality = Math.max(0.35, quality - 0.12);
          }
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("toBlob"));
          }
        } catch (e) {
          reject(e);
        }
      })();
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("load"));
    };
    img.src = url;
  });
}
