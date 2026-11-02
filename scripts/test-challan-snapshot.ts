/**
 * Delivery challan template regression test.
 *
 *   npm run test:challan-snapshot              compare against the committed baselines
 *   npm run test:challan-snapshot -- --update  re-record (only for an intended template change)
 *
 * Renders every fixture through the real template on a dev-only route (no database), then checks:
 *   1. no page overflows its A4 box — what protects the line budgets in lib/challan.ts,
 *   2. the page count matches `challanPageCount`, which is what the PDF route checks the file against,
 *   3. a PNG of every page (pixel diff).
 */
import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";
import { CHALLAN_FIXTURES } from "../lib/challan-fixtures";
import { challanPageCount } from "../lib/challan";

type Png = { width: number; height: number; data: Buffer };
const { PNG } = require("pngjs") as { PNG: { sync: { read(b: Buffer): Png } } };

const UPDATE = process.argv.includes("--update");
const PORT = Number(process.env.SNAPSHOT_PORT ?? 3016);
const BASE = `http://localhost:${PORT}`;
const DIR = path.join(process.cwd(), "tests", "challan-snapshots");
const CHROME = process.env.CHROME_PATH ?? ["C:/Program Files/Google/Chrome/Application/chrome.exe", "/usr/bin/google-chrome", "/usr/bin/chromium"].find((p) => fs.existsSync(p));
const PIXEL_TOLERANCE = 0.00005;
const first = Object.keys(CHALLAN_FIXTURES)[0];

async function up() {
  try { return (await fetch(`${BASE}/internal/challan-fixtures/${first}`)).ok; } catch { return false; }
}

async function startServer(): Promise<ChildProcess | null> {
  if (await up()) return null;
  const child = spawn(process.execPath, [path.join("node_modules", "next", "dist", "bin", "next"), "dev", "-p", String(PORT)], { stdio: "ignore" });
  for (let i = 0; i < 120; i++) {
    if (await up()) return child;
    await new Promise((r) => setTimeout(r, 1000));
  }
  child.kill();
  throw new Error("dev server did not start");
}

function pixelDiff(a: Buffer, b: Buffer): number {
  const x = PNG.sync.read(a), y = PNG.sync.read(b);
  if (x.width !== y.width || x.height !== y.height) return 1;
  let bad = 0;
  for (let i = 0; i < x.data.length; i += 4) {
    if (Math.abs(x.data[i] - y.data[i]) + Math.abs(x.data[i + 1] - y.data[i + 1]) + Math.abs(x.data[i + 2] - y.data[i + 2]) > 24) bad++;
  }
  return bad / (x.width * x.height);
}

async function main() {
  if (!CHROME) throw new Error("Chrome not found; set CHROME_PATH");
  fs.mkdirSync(DIR, { recursive: true });
  const server = await startServer();
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-sandbox"] });
  const failures: string[] = [];
  let checks = 0;

  try {
    for (const [name, fixture] of Object.entries(CHALLAN_FIXTURES)) {
      const page = await browser.newPage();
      await page.setViewport({ width: 1000, height: 1123, deviceScaleFactor: 1 });
      await page.goto(`${BASE}/internal/challan-fixtures/${name}`, { waitUntil: "networkidle0", timeout: 120000 });
      await page.evaluate(() => document.fonts.ready);
      await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });

      const spill = await page.evaluate(() => {
        const A4_PX = (297 / 25.4) * 96;
        return Array.from(document.querySelectorAll<HTMLElement>(".inv-page")).map((pg, i) => {
          const top = pg.getBoundingClientRect().top;
          const limit = Math.min(pg.clientHeight, A4_PX) - parseFloat(getComputedStyle(pg).paddingBottom);
          const bottom = Math.max(...Array.from(pg.children).map((el) => el.getBoundingClientRect().bottom - top));
          return bottom > limit + 1 ? { page: i + 1, by: Math.round(bottom - limit) } : null;
        }).filter(Boolean);
      });
      if (spill.length) for (const s of spill as Array<{ page: number; by: number }>) failures.push(`${name}: page ${s.page} overflows its A4 box by ${s.by}px`);
      else { checks++; console.log(`  ok  ${name}: every page stays inside its A4 box`); }

      const pages = await page.$$(".inv-page");
      const expected = challanPageCount(fixture);
      if (pages.length !== expected) failures.push(`${name}: rendered ${pages.length} page(s), challanPageCount says ${expected}`);
      else { checks++; console.log(`  ok  ${name}: ${pages.length} page(s), matching challanPageCount`); }

      for (let i = 0; i < pages.length; i++) {
        const shot = Buffer.from(await pages[i].screenshot({ type: "png" }));
        const file = path.join(DIR, `${name}-p${i + 1}.png`);
        if (UPDATE) { fs.writeFileSync(file, shot); continue; }
        if (!fs.existsSync(file)) { failures.push(`${name}: no PNG baseline for page ${i + 1} (run with --update)`); continue; }
        const diff = pixelDiff(fs.readFileSync(file), shot);
        if (diff > PIXEL_TOLERANCE) {
          fs.writeFileSync(path.join(DIR, `${name}-p${i + 1}.actual.png`), shot);
          failures.push(`${name}: page ${i + 1} differs by ${(diff * 100).toFixed(4)}% of pixels`);
        } else { checks++; console.log(`  ok  ${name}: page ${i + 1} pixels within tolerance`); }
      }
      await page.close();
    }
  } finally {
    await browser.close();
    server?.kill();
  }

  if (failures.length) {
    console.error(`\n${failures.length} failure(s):`);
    for (const f of failures) console.error(`  ${f}`);
    process.exit(1);
  }
  console.log(`\n${checks} checks passed${UPDATE ? " (baselines re-recorded)" : ""}.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
