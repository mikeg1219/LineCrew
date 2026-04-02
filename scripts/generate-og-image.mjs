/**
 * Generates public/og-image.png (1200×630) for Open Graph / Twitter cards.
 * Run: npm run og:image
 * Uses sharp when available (logo + tagline); otherwise writes a brand-gradient PNG.
 */
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const outPath = join(root, "public", "og-image.png");
const logoPath = join(root, "public", "linecrew-logo.png");

const W = 1200;
const H = 630;

async function writeGradientFallback(reason) {
  const { writeGradientOg } = await import(
    new URL("./generate-og-image-pure.mjs", import.meta.url).href
  );
  const p = writeGradientOg(outPath);
  console.warn(
    reason,
    "— wrote gradient OG image at",
    p,
    "(install sharp and re-run for logo + tagline)."
  );
}

async function main() {
  let sharp;
  try {
    sharp = (await import("sharp")).default;
  } catch {
    await writeGradientFallback("sharp not available");
    return;
  }

  const gradientSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="#2563eb"/><stop offset="1" stop-color="#0d9488"/>
</linearGradient></defs>
<rect width="100%" height="100%" fill="url(#g)"/>
</svg>`;

  const taglineSvg = `<svg width="${W}" height="140" xmlns="http://www.w3.org/2000/svg">
<text x="600" y="80" text-anchor="middle" fill="white" font-family="system-ui,Segoe UI,sans-serif" font-size="34" font-weight="600">Save your spot. Keep your day moving.</text>
</svg>`;

  try {
    const composites = [];

    try {
      const raw = await readFile(logoPath);
      const logoPng = await sharp(raw)
        .resize({ width: 440, height: 130, fit: "inside" })
        .ensureAlpha()
        .png()
        .toBuffer();
      const { width: lw = 400, height: lh = 100 } = await sharp(logoPng).metadata();
      composites.push({
        input: logoPng,
        left: Math.round((W - lw) / 2),
        top: Math.round(220 - lh / 2),
      });
    } catch {
      const wordmark = Buffer.from(
        `<svg width="${W}" height="200" xmlns="http://www.w3.org/2000/svg">
<text x="600" y="120" text-anchor="middle" fill="white" font-family="system-ui,Segoe UI,sans-serif" font-size="64" font-weight="800">LineCrew.ai</text>
</svg>`
      );
      composites.push({
        input: await sharp(wordmark).png().toBuffer(),
        left: 0,
        top: 0,
      });
    }

    const tagPng = await sharp(Buffer.from(taglineSvg)).png().toBuffer();
    composites.push({ input: tagPng, left: 0, top: H - 150 });

    await sharp(Buffer.from(gradientSvg))
      .resize(W, H)
      .composite(composites)
      .png()
      .toFile(outPath);

    console.log("Wrote", outPath);
  } catch (e) {
    await writeGradientFallback(`sharp failed (${e?.message ?? e})`);
  }
}

main().catch(async (e) => {
  console.error(e);
  await writeGradientFallback("unhandled error");
});
