/**
 * Quotation template regression test.
 *
 *   npm run test:quotation-snapshot            compare against the committed baselines
 *   npm run test:quotation-snapshot -- --update   re-record baselines (only when a template change is intended)
 *
 * Renders three fixtures through the real template on a dev-only route (no database), then compares:
 *   1. the rendered HTML of the document (exact),
 *   2. a PNG of every A4 page (pixel diff),
 *   3. the PDF page count.
 * Baselines live in tests/quotation-snapshots/. The template must stay identical: when this fails, revert the change.
 */
import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";
import { QUOTATION_FIXTURES } from "../lib/quotation-fixtures";

type Png = { width: number; height: number; data: Buffer };
const { PNG } = require("pngjs") as { PNG: { sync: { read(b: Buffer): Png } } };

const UPDATE = process.argv.includes("--update");
const PORT = Number(process.env.SNAPSHOT_PORT ?? 3012);
const BASE = `http://localhost:${PORT}`;
const DIR = path.join(process.cwd(), "tests", "quotation-snapshots");
const CHROME = process.env.CHROME_PATH ?? ["C:/Program Files/Google/Chrome/Application/chrome.exe", "/usr/bin/google-chrome", "/usr/bin/chromium"].find((p) => fs.existsSync(p));
const PIXEL_TOLERANCE = 0.00005; // fraction of pixels allowed to differ (~40 px per page): anti-aliasing noise only

async function up() {
  try { return (await fetch(`${BASE}/internal/quotation-fixtures/single-item`)).ok; } catch { return false; }
}

async function startServer(): Promise<ChildProcess | null> {
  if (await up()) return null;
  const child = spawn(process.execPath, [path.join("node_modules", "next", "dist", "bin", "next"), "dev", "-p", String(PORT)], { stdio: "ignore" });
  for (let i = 0; i < 90; i++) {
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
    for (const name of Object.keys(QUOTATION_FIXTURES)) {
      const page = await browser.newPage();
      await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 1 });
      await page.goto(`${BASE}/internal/quotation-fixtures/${name}`, { waitUntil: "networkidle0", timeout: 120000 });
      await page.evaluate(() => document.fonts.ready);
      await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });

      const html = await page.evaluate(() => (document.querySelector(".q-document") as HTMLElement).outerHTML);
      const pages = await page.$$(".q-page");
      const pngs: Buffer[] = [];
      for (const p of pages) pngs.push(Buffer.from(await p.screenshot({ type: "png" })));
      const pdf = Buffer.from(await page.pdf({ preferCSSPageSize: true, printBackground: true }));
      const pdfPages = (pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length;
      await page.close();

      const meta = { pages: pages.length, pdfPages };
      const files = { html: path.join(DIR, `${name}.html`), meta: path.join(DIR, `${name}.json`) };

      if (UPDATE) {
        fs.writeFileSync(files.html, html);
        fs.writeFileSync(files.meta, JSON.stringify(meta, null, 2) + "\n");
        pngs.forEach((b, i) => fs.writeFileSync(path.join(DIR, `${name}-p${i + 1}.png`), b));
        console.log(`  recorded ${name}: ${pages.length} pages, pdf ${pdfPages} pages`);
        continue;
      }

      const expect = (label: string, ok: boolean, detail = "") => {
        checks++;
        if (ok) console.log(`  ok  ${name}: ${label}`);
        else { failures.push(`${name}: ${label} ${detail}`); console.log(`  FAIL ${name}: ${label} ${detail}`); }
      };
      if (!fs.existsSync(files.html)) { expect("baseline exists (run with --update once)", false); continue; }
      expect("HTML identical", fs.readFileSync(files.html, "utf8").replace(/
/g, "
") === html.replace(/
/g, "
"));
      expect("page counts identical", JSON.stringify(JSON.parse(fs.readFileSync(files.meta, "utf8"))) === JSON.stringify(meta));
      pngs.forEach((b, i) => {
        const base = path.join(DIR, `${name}-p${i + 1}.png`);
        if (!fs.existsSync(base)) return expect(`page ${i + 1} baseline exists`, false);
        const d = pixelDiff(fs.readFileSync(base), b);
        expect(`page ${i + 1} pixels within tolerance`, d <= PIXEL_TOLERANCE, `(${(d * 100).toFixed(3)}% differ)`);
        if (d > PIXEL_TOLERANCE) fs.writeFileSync(path.join(DIR, `${name}-p${i + 1}.actual.png`), b);
      });
    }
  } finally {
    await browser.close();
    server?.kill();
  }
  if (UPDATE) return console.log("\nbaselines updated");
  console.log(`\n${checks - failures.length}/${checks} checks passed`);
  if (failures.length) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
