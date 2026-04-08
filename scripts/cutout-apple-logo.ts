/**
 * Remove blue / blue-grey background from apple mascot PNG (transparent edges).
 * Reads: public/branding/apple-logo-raw.png
 * Writes: public/branding/apple-logo-mark.png (trimmed; use this in UI to avoid stale cache)
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const root = path.join(process.cwd(), "public", "branding");
const inputPath = path.join(root, "apple-logo-raw.png");
const outputPath = path.join(root, "apple-logo-mark.png");
const outputIconPath = path.join(root, "apple-logo-icon.png");

function dist(r: number, g: number, b: number, br: number, bg: number, bb: number): number {
  return Math.hypot(r - br, g - bg, b - bb);
}

function collectEdgeRgb(
  data: Buffer,
  w: number,
  h: number,
): { br: number; bg: number; bb: number; count: number } {
  let sr = 0;
  let sg = 0;
  let sb = 0;
  let n = 0;
  const push = (x: number, y: number) => {
    const i = (y * w + x) * 4;
    sr += data[i];
    sg += data[i + 1];
    sb += data[i + 2];
    n += 1;
  };
  for (let x = 0; x < w; x++) {
    push(x, 0);
    push(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    push(0, y);
    push(w - 1, y);
  }
  return { br: sr / n, bg: sg / n, bb: sb / n, count: n };
}

async function main() {
  if (!fs.existsSync(inputPath)) {
    console.error("Missing:", inputPath);
    process.exit(1);
  }

  const { data, info } = await sharp(inputPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  if (info.channels !== 4) {
    console.error("Expected RGBA");
    process.exit(1);
  }

  const { br, bg, bb } = collectEdgeRgb(data, w, h);

  const out = Buffer.from(data);
  const hard = 52;
  const soft = 105;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const r = out[i];
      const g = out[i + 1];
      const b = out[i + 2];
      const d = dist(r, g, b, br, bg, bb);
      const blueBias = 2 * b - r - g;
      const coolSky = b > r + 6 && b > g + 4 && b > 75;
      const matchEdge = d < hard;
      const blueField = coolSky && (d < hard + 38 || blueBias > 18);
      let a = out[i + 3];
      if (matchEdge || blueField) {
        a = 0;
      } else if (d < soft || (coolSky && d < soft + 25)) {
        const t0 = hard;
        const t1 = soft;
        const dd = Math.min(d, t1);
        a = Math.min(a, Math.round((255 * (dd - t0)) / (t1 - t0)));
      }
      out[i + 3] = a;
    }
  }

  const pngBuf = await sharp(out, { raw: { width: w, height: h, channels: 4 } })
    .png()
    .toBuffer();

  await sharp(pngBuf).trim({ threshold: 28 }).png().toFile(outputPath);

  // Create icon-only crop (focus red apple body, exclude decorative stars/orbits).
  const iconRaw = await sharp(outputPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const iw = iconRaw.info.width;
  const ih = iconRaw.info.height;
  const idata = iconRaw.data;
  let minX = iw;
  let minY = ih;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < ih; y++) {
    for (let x = 0; x < iw; x++) {
      const i = (y * iw + x) * 4;
      const r = idata[i];
      const g = idata[i + 1];
      const b = idata[i + 2];
      const a = idata[i + 3];
      const isAppleRed = a > 30 && r > 95 && r > g * 1.12 && r > b * 1.12;
      if (!isAppleRed) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX > minX && maxY > minY) {
    const padX = Math.round((maxX - minX) * 0.22);
    const padY = Math.round((maxY - minY) * 0.24);
    const left = Math.max(0, minX - padX);
    const top = Math.max(0, minY - padY);
    const width = Math.min(iw - left, maxX - minX + 1 + padX * 2);
    const height = Math.min(ih - top, maxY - minY + 1 + padY * 2);
    await sharp(outputPath).extract({ left, top, width, height }).png().toFile(outputIconPath);
  } else {
    await fs.promises.copyFile(outputPath, outputIconPath);
  }
  const legacyPath = path.join(root, "apple-logo.png");
  await fs.promises.copyFile(outputPath, legacyPath);
  console.log("Wrote", outputPath, outputIconPath, "and", legacyPath);
}

void main();
