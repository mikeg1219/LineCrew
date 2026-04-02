/**
 * Writes a 1200×630 PNG (brand gradient) without sharp.
 * Used as fallback when sharp is unavailable; full asset uses generate-og-image.mjs + sharp.
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const __dirname = dirname(fileURLToPath(import.meta.url));
const defaultOut = join(__dirname, "..", "public", "og-image.png");

const W = 1200;
const H = 630;

/** PNG CRC-32 (IEEE) */
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
    }
  }
  return (~c) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

const rowSize = 1 + W * 3;
const raw = Buffer.alloc(H * rowSize);
for (let y = 0; y < H; y++) {
  const off = y * rowSize;
  raw[off] = 0;
  const t = H <= 1 ? 0 : y / (H - 1);
  const r = Math.round(37 + (13 - 37) * t);
  const g = Math.round(99 + (148 - 99) * t);
  const bCol = Math.round(235 + (136 - 235) * t);
  for (let x = 0; x < W; x++) {
    const i = off + 1 + x * 3;
    raw[i] = r;
    raw[i + 1] = g;
    raw[i + 2] = bCol;
  }
}

const compressed = deflateSync(raw);
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8;
ihdr[9] = 2;
ihdr[10] = 0;
ihdr[11] = 0;
ihdr[12] = 0;

const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const png = Buffer.concat([
  signature,
  chunk("IHDR", ihdr),
  chunk("IDAT", compressed),
  chunk("IEND", Buffer.alloc(0)),
]);

export function writeGradientOg(outPath = defaultOut) {
  writeFileSync(outPath, png);
  return outPath;
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("generate-og-image-pure.mjs")) {
  const p = writeGradientOg();
  console.log("Wrote", p, "(gradient only; npm run og:image for logo + tagline)");
}
