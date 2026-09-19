/**
 * One-off asset tuning (re-runnable): npx tsx scripts/tune-images.ts <path-to-hero-source.png>
 *
 *  - Hero: re-encoded to a high-quality WebP (the source PNG is 2.6 MB), written to public/hero/.
 *  - Client logos: transparent padding trimmed so each logo fills its tile; small rasters are enlarged
 *    with a high-quality resampler so browsers do not blur them, WITHOUT claiming extra detail. Vector
 *    logos and already large rasters are left untouched. Originals are read from git history if needed.
 *
 * Nothing here invents pixels: a small logo stays as sharp as its source allows. A better original
 * file from the client is always preferable (see public/clients/README.txt).
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const clients = path.join(root, "public", "clients");

async function hero(source: string) {
  const out = path.join(root, "public", "hero", "stbs-drilling-rig-site.webp");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const info = await sharp(source).webp({ quality: 84, effort: 6, smartSubsample: true }).toFile(out);
  console.log(`hero  ${path.relative(root, out)}  ${info.width}x${info.height}  ${Math.round(info.size / 1024)} KB  (source ${Math.round(fs.statSync(source).size / 1024)} KB)`);
}

async function trimmed(file: string) {
  const p = path.join(clients, file);
  const before = await sharp(p).metadata();
  const buf = await sharp(p).trim({ threshold: 8 }).png({ compressionLevel: 9, adaptiveFiltering: true }).toBuffer({ resolveWithObject: true });
  // Keep a hairline of breathing room so anti-aliased edges are never clipped.
  const padded = await sharp(buf.data).extend({ top: 2, bottom: 2, left: 2, right: 2, background: { r: 0, g: 0, b: 0, alpha: 0 } }).png({ compressionLevel: 9 }).toBuffer({ resolveWithObject: true });
  fs.writeFileSync(p, padded.data);
  console.log(`trim  ${file}  ${before.width}x${before.height} -> ${padded.info.width}x${padded.info.height}`);
}

async function enlarge(file: string, factor: number) {
  const p = path.join(clients, file);
  const meta = await sharp(p).metadata();
  const w = Math.round((meta.width ?? 0) * factor);
  const out = await sharp(p).resize({ width: w, kernel: "lanczos3" }).sharpen({ sigma: 0.5, m1: 0.6, m2: 0.6 }).png({ compressionLevel: 9 }).toBuffer({ resolveWithObject: true });
  fs.writeFileSync(p, out.data);
  console.log(`up    ${file}  ${meta.width}x${meta.height} -> ${out.info.width}x${out.info.height} (lanczos3, light sharpen)`);
}

async function main() {
  const source = process.argv[2];
  if (source) await hero(source);
  await trimmed("ashoka-university.png");
  await enlarge("bigbasket.png", 2);
}

main().catch((e) => { console.error(e); process.exit(1); });
