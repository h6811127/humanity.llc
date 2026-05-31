/**
 * Remove outer white padding from glitch-print-chromatic-artifact.png so the
 * red-bordered white card sits on the hoodie (matches printify white-card art).
 *
 *   node worker/scripts/process-glitch-chromatic-artifact-png.mjs
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const INPUT = path.join(repoRoot, "site/assets/glitch-print-chromatic-artifact.png");
const OUTPUT = INPUT;

function isRedish(r, g, b) {
  return r > 140 && r > g + 35 && r > b + 35;
}

function isWhiteish(r, g, b) {
  return r > 235 && g > 235 && b > 235;
}

function isGarmentSample(r, g, b) {
  if (isWhiteish(r, g, b) || isRedish(r, g, b)) return false;
  const spread = Math.max(r, g, b) - Math.min(r, g, b);
  return spread < 40 && r > 80 && r < 230;
}

/**
 * @param {Buffer} data
 * @param {number} width
 * @param {number} height
 * @param {number} channels
 * @param {Uint8Array} outerWhite
 * @param {{ r: number, g: number, b: number }} fallback
 */
function inpaintOuterWhite(data, width, height, channels, outerWhite, fallback) {
  const filled = new Uint8Array(width * height);
  const queue = [];
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

  const copyRgb = (to, from) => {
    data[to] = data[from];
    data[to + 1] = data[from + 1];
    data[to + 2] = data[from + 2];
    data[to + 3] = 255;
  };

  const setFallback = (oi) => {
    data[oi] = fallback.r;
    data[oi + 1] = fallback.g;
    data[oi + 2] = fallback.b;
    data[oi + 3] = 255;
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (!outerWhite[i]) continue;
      const oi = i * channels;
      for (const [dx, dy] of dirs) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const j = ny * width + nx;
        if (outerWhite[j]) continue;
        const o = j * channels;
        const r = data[o];
        const g = data[o + 1];
        const b = data[o + 2];
        if (isWhiteish(r, g, b)) continue;
        filled[i] = 1;
        copyRgb(oi, o);
        queue.push(x, y);
        break;
      }
    }
  }

  while (queue.length) {
    const y = queue.shift();
    const x = queue.shift();
    const oi = (y * width + x) * channels;
    const pr = data[oi];
    const pg = data[oi + 1];
    const pb = data[oi + 2];
    const parentUsable = !isWhiteish(pr, pg, pb);
    for (const [dx, dy] of dirs) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const j = ny * width + nx;
      if (!outerWhite[j] || filled[j]) continue;
      filled[j] = 1;
      const oj = j * channels;
      if (parentUsable) {
        copyRgb(oj, oi);
      } else {
        setFallback(oj);
      }
      queue.push(nx, ny);
    }
  }

  for (let i = 0; i < width * height; i++) {
    if (!outerWhite[i] || filled[i]) continue;
    setFallback(i * channels);
  }
}

async function main() {
  const { data, info } = await sharp(INPUT).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  let redCount = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * channels;
      const r = data[o];
      const g = data[o + 1];
      const b = data[o + 2];
      if (!isRedish(r, g, b)) continue;
      redCount++;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  if (redCount < 100) {
    throw new Error("Could not find red card frame in artifact image");
  }

  const pad = 3;
  const cardMinX = Math.max(0, minX - pad);
  const cardMinY = Math.max(0, minY - pad);
  const cardMaxX = Math.min(width - 1, maxX + pad);
  const cardMaxY = Math.min(height - 1, maxY + pad);

  let rSum = 0;
  let gSum = 0;
  let bSum = 0;
  let sampleCount = 0;
  const outerWhite = new Uint8Array(width * height);
  let outerCount = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const insideCard = x >= cardMinX && x <= cardMaxX && y >= cardMinY && y <= cardMaxY;
      const o = (y * width + x) * channels;
      const r = data[o];
      const g = data[o + 1];
      const b = data[o + 2];
      if (!insideCard && isGarmentSample(r, g, b)) {
        rSum += r;
        gSum += g;
        bSum += b;
        sampleCount++;
      }
      if (insideCard) continue;
      if (!isWhiteish(r, g, b)) continue;
      outerWhite[y * width + x] = 1;
      outerCount++;
    }
  }

  const fallback = {
    r: sampleCount > 0 ? Math.round(rSum / sampleCount) : 168,
    g: sampleCount > 0 ? Math.round(gSum / sampleCount) : 168,
    b: sampleCount > 0 ? Math.round(bSum / sampleCount) : 168,
  };

  inpaintOuterWhite(data, width, height, channels, outerWhite, fallback);

  const out = await sharp(data, { raw: { width, height, channels } }).png().toBuffer();
  writeFileSync(OUTPUT, out);
  console.log(
    `Wrote ${OUTPUT} (${width}x${height}); card bbox ${cardMinX},${cardMinY}-${cardMaxX},${cardMaxY}; ` +
      `inpainted ${outerCount} outer-white pixels (fallback rgb(${fallback.r},${fallback.g},${fallback.b}))`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
