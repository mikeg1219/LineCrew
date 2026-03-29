import { AVATAR_MAX_DIMENSION } from "@/lib/process-avatar-image";

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", reject);
    img.src = url;
  });
}

/**
 * Renders the cropped square region to a JPEG blob (max edge `AVATAR_MAX_DIMENSION`).
 */
export async function getCroppedSquareJpegBlob(
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number }
): Promise<Blob> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("canvas");
  }
  const out = AVATAR_MAX_DIMENSION;
  canvas.width = out;
  canvas.height = out;
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    out,
    out
  );
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("toBlob"))),
      "image/jpeg",
      0.92
    );
  });
}
