/**
 * Drives the new-quotation wizard in a real browser.
 *
 * The thing worth protecting is what reaches the item table: the right number of rows, in order,
 * with the answers written into the wording — and never a leftover placeholder.
 */
import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import puppeteer, { type Page } from "puppeteer-core";

const PORT = Number(process.env.WIZARD_PORT ?? 3041);
const BASE = `http://localhost:${PORT}`;
const CHROME = process.env.CHROME_PATH ?? ["C:/Program Files/Google/Chrome/Application/chrome.exe", "/usr/bin/google-chrome"].find((p) => fs.existsSync(p));

let failures = 0;
async function check(name: string, fn: () => Promise<void>) {
  try { await fn(); console.log(`  ok  ${name}`); } catch (e) {
    failures++;
    console.log(`  FAIL ${name}`);
    console.log(`       ${e instanceof Error ? e.message : String(e)}`);
  }
}

async function up() {
  try { return (await fetch(`${BASE}/internal/quotation-preset-harness`)).ok; } catch { return false; }
}
async function startServer(): Promise<ChildProcess | null> {
  if (await up()) return null;
  const child = spawn(process.execPath, [path.join("node_modules", "next", "dist", "bin", "next"), "dev", "-p", String(PORT)], { stdio: "ignore" });
  for (let i = 0; i < 120; i++) { if (await up()) return child; await new Promise((r) => setTimeout(r, 1000)); }
  child.kill();
  throw new Error("dev server did not start");
}

/** Clicks the choice whose label matches, on whichever screen the wizard is showing. */
async function choose(page: Page, label: string) {
  await page.waitForSelector(".pw-choice");
  const clicked = await page.evaluate((want: string) => {
    const button = Array.from(document.querySelectorAll<HTMLButtonElement>(".pw-choice"))
      .find((b) => b.innerText.trim().startsWith(want));
    if (!button) return false;
    button.click();
    return true;
  }, label);
  assert.ok(clicked, `no choice named "${label}" on this screen`);
}

const rowText = (page: Page) =>
  page.$$eval('[data-cell$=":description"]', (els) => els.map((e) => (e as HTMLTextAreaElement).value.trim()));

async function main() {
  if (!CHROME) throw new Error("Chrome not found; set CHROME_PATH");
  const server = await startServer();
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-sandbox"] });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 900, height: 1000, deviceScaleFactor: 1 });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push((e as Error).message));
    await page.goto(`${BASE}/internal/quotation-preset-harness`, { waitUntil: "networkidle0", timeout: 120000 });

    await check("the first screen offers each job and a blank quotation", async () => {
      await page.waitForSelector(".pw-choice");
      const labels = await page.$$eval(".pw-choice", (els) => els.map((e) => (e as HTMLElement).innerText.split("\n")[0].trim()));
      assert.ok(labels.includes("Rainwater harvesting"), `got ${labels.join(" | ")}`);
      assert.ok(labels.includes("Borewell construction"), `got ${labels.join(" | ")}`);
      assert.ok(labels.some((l) => l.includes("Blank")), `got ${labels.join(" | ")}`);
    });

    await check("a borewell quotation asks its six questions and writes them in", async () => {
      await choose(page, "Borewell construction");
      await choose(page, "250 mm");   // bore diameter
      await choose(page, "225 mm");   // casing diameter
      await choose(page, '3" (75 mm)'); // delivery pipe
      await choose(page, "6 sq. mm"); // cable
      await choose(page, "5");        // pump HP
      await choose(page, "20");       // pump stage

      await page.waitForSelector('[data-cell$=":description"]');
      const rows = await rowText(page);
      assert.equal(rows.length, 15, `expected 15 items, got ${rows.length}`);
      assert.equal(rows[0], "Drilling of 250 mm dia borewell with rotary rig, including machine and labour charges");
      assert.ok(rows[1].includes("225 mm dia uPVC casing pipe"), rows[1]);
      assert.ok(rows[3].includes('3" (75 mm) HDPE delivery pipe'), rows[3]);
      assert.ok(rows[6].includes("6 sq. mm 3-core copper"), rows[6]);
      assert.equal(rows[8], "Supply, installation and commissioning of 5 HP, 20 stage stainless steel submersible pump set");
    });

    await check("no placeholder survives into the item table", async () => {
      const rows = await rowText(page);
      const leaked = rows.filter((r) => r.includes("{") || r.includes("}"));
      assert.equal(leaked.length, 0, `these lines still carry braces: ${leaked.join(" | ")}`);
    });

    await check("a custom answer is used exactly as typed", async () => {
      await page.goto(`${BASE}/internal/quotation-preset-harness`, { waitUntil: "networkidle0" });
      await choose(page, "Rainwater harvesting");
      await page.waitForSelector(".pw-custom input");
      await page.type(".pw-custom input", "355 mm");
      await page.click(".pw-use");
      await choose(page, "200 mm");
      await choose(page, "3 m");
      await page.waitForSelector('[data-cell$=":description"]');
      const rows = await rowText(page);
      assert.equal(rows.length, 8, `expected 8 items, got ${rows.length}`);
      assert.equal(rows[0], "Drilling of 355 mm dia recharge bore, including machine and labour charges");
      assert.ok(rows[7].includes("size 3 m as per site requirement"), rows[7]);
    });

    await check("a blank quotation still starts empty", async () => {
      await page.goto(`${BASE}/internal/quotation-preset-harness`, { waitUntil: "networkidle0" });
      await choose(page, "Blank quotation");
      await page.waitForSelector('[data-qs-target="items"]');
      const rows = await rowText(page);
      assert.equal(rows.length, 0, `expected no items, got ${rows.length}`);
    });

    await check("the wizard ran without a single page error", async () => {
      assert.deepEqual(errors, []);
    });
  } finally {
    await browser.close();
    server?.kill();
  }
  console.log(failures ? `\n${failures} check(s) failed` : "\n6 checks passed");
  process.exit(failures ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
