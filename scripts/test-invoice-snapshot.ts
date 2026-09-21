/**
 * Invoice template regression test.
 *
 *   npm run test:invoice-snapshot              compare against the committed baselines
 *   npm run test:invoice-snapshot -- --update  re-record (only for an intended template change)
 *
 * Renders every fixture through the real template on a dev-only route (no database), then checks:
 *   1. no page overflows its A4 box — the check that protects the pagination estimates,
 *   2. the rendered HTML of the document (exact),
 *   3. a PNG of every page (pixel diff).
 *
 * The overflow check is the important one: the page heights in invoice-pagination.ts are estimates,
 * and a wrong constant would silently print a row, a total or a signature off the bottom of a page.
 */
import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";
import { INVOICE_FIXTURES } from "../lib/invoice-fixtures";

type Png = { width: number; height: number; data: Buffer };
const { PNG } = require("pngjs") as { PNG: { sync: { read(b: Buffer): Png } } };

const UPDATE = process.argv.includes("--update");
const PORT = Number(process.env.SNAPSHOT_PORT ?? 3015);
const BASE = `http://localhost:${PORT}`;
const DIR = path.join(process.cwd(), "tests", "invoice-snapshots");
const CHROME = process.env.CHROME_PATH ?? ["C:/Program Files/Google/Chrome/Application/chrome.exe", "/usr/bin/google-chrome", "/usr/bin/chromium"].find((p) => fs.existsSync(p));
const PIXEL_TOLERANCE = 0.00005; // anti-aliasing noise only

const norm = (t: string) => t.split("\r\n").join("\n");
const first = Object.keys(INVOICE_FIXTURES)[0];

async function up() {
  try { return (await fetch(`${BASE}/internal/invoice-fixtures/${first}`)).ok; } catch { return false; }
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
  const overflows: string[] = [];
  let checks = 0;

  try {
    for (const name of Object.keys(INVOICE_FIXTURES)) {
      const page = await browser.newPage();
      await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 1 });
      await page.goto(`${BASE}/internal/invoice-fixtures/${name}`, { waitUntil: "networkidle0", timeout: 120000 });
      await page.evaluate(() => document.fonts.ready);
      await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });

      // Nothing may sit below the page's content box. Measuring the children's lowest edge is the
      // reliable test: scrollHeight on this flex column reports padding oddly.
      const spill = await page.evaluate(() =>
        Array.from(document.querySelectorAll<HTMLElement>(".inv-page")).map((pg, i) => {
          const top = pg.getBoundingClientRect().top;
          const limit = pg.clientHeight - parseFloat(getComputedStyle(pg).paddingBottom);
          const bottom = Math.max(...Array.from(pg.children).map((el) => el.getBoundingClientRect().bottom - top));
          return bottom > limit ? { page: i + 1, by: Math.round(bottom - limit) } : null;
        }).filter(Boolean),
      );
      for (const s of spill as Array<{ page: number; by: number }>) {
        overflows.push(`${name}: page ${s.page} overflows its A4 box by ${s.by}px`);
      }
      checks++;
      console.log(`  ok  ${name}: every page stays inside its A4 box`);

      const html = norm(await page.$eval(".inv-document", (el) => el.outerHTML));
      const htmlPath = path.join(DIR, `${name}.html`);
      if (UPDATE) fs.writeFileSync(htmlPath, html);
      else if (!fs.existsSync(htmlPath)) failures.push(`${name}: no HTML baseline (run with --update)`);
      else if (norm(fs.readFileSync(htmlPath, "utf8")) !== html) failures.push(`${name}: rendered HTML changed`);
      else { checks++; console.log(`  ok  ${name}: rendered HTML matches the baseline`); }

      const pages = await page.$$(".inv-page");
      const meta = { pages: pages.length };
      const metaPath = path.join(DIR, `${name}.json`);
      if (UPDATE) fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2) + "\n");
      else if (!fs.existsSync(metaPath)) failures.push(`${name}: no page-count baseline (run with --update)`);
      else {
        const expected = JSON.parse(fs.readFileSync(metaPath, "utf8")) as { pages: number };
        if (expected.pages !== meta.pages) failures.push(`${name}: page count ${meta.pages}, expected ${expected.pages}`);
        else { checks++; console.log(`  ok  ${name}: ${meta.pages} page(s), as expected`); }
      }

      for (let i = 0; i < pages.length; i++) {
        const shot = Buffer.from(await pages[i].screenshot({ type: "png" }));
        const file = path.join(DIR, `${name}-p${i + 1}.png`);
        if (UPDATE) { fs.writeFileSync(file, shot); continue; }
        if (!fs.existsSync(file)) { failures.push(`${name}: no PNG baseline for page ${i + 1}`); continue; }
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

  if (overflows.length) {
    console.error("\nPage overflow — the estimates in invoice-pagination.ts are wrong:");
    for (const o of overflows) console.error(`  ${o}`);
  }
  if (failures.length) {
    console.error("\nSnapshot failures:");
    for (const f of failures) console.error(`  ${f}`);
  }
  if (overflows.length || failures.length) process.exit(1);
  console.log(`\n${checks}/${checks} checks passed`);
}

main().catch((e) => { console.error(e); process.exit(1); });
