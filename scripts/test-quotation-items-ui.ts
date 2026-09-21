/**
 * Browser test for the quotation line-items table (keyboard, numeric cells, delete confirmation, undo).
 * Uses a dev-only harness route with no database access: npm run test:quotation-items-ui
 */
import { spawn, type ChildProcess } from "node:child_process";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import puppeteer, { type Page } from "puppeteer-core";

const PORT = Number(process.env.ITEMS_UI_PORT ?? 3013);
const URL_ = `http://localhost:${PORT}/internal/quotation-items-harness`;
const CHROME = process.env.CHROME_PATH ?? ["C:/Program Files/Google/Chrome/Application/chrome.exe", "/usr/bin/google-chrome", "/usr/bin/chromium"].find((p) => fs.existsSync(p));

async function up() { try { return (await fetch(URL_)).ok; } catch { return false; } }
async function startServer(): Promise<ChildProcess | null> {
  if (await up()) return null;
  const child = spawn(process.execPath, [path.join("node_modules", "next", "dist", "bin", "next"), "dev", "-p", String(PORT)], { stdio: "ignore" });
  for (let i = 0; i < 90; i++) { if (await up()) return child; await new Promise((r) => setTimeout(r, 1000)); }
  child.kill();
  throw new Error("dev server did not start");
}

let passed = 0;
async function check(label: string, fn: () => Promise<void>) { await fn(); passed++; console.log(`  ok  ${label}`); }
const val = (page: Page, sel: string) => page.$eval(sel, (e) => (e as HTMLInputElement).value);
const rows = (page: Page) => page.$$eval('[role="row"].it-row', (r) => r.length);
const frame = (page: Page) => page.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))));
const active = (page: Page) => page.evaluate(() => document.activeElement?.getAttribute("data-cell")?.split(":")[1] ?? "");

async function main() {
  if (!CHROME) throw new Error("Chrome not found; set CHROME_PATH");
  const server = await startServer();
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-sandbox"] });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1100, height: 800 });
    await page.goto(URL_, { waitUntil: "networkidle0", timeout: 120000 });
    await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
    await page.waitForFunction(() => Object.keys(document.querySelector("[data-cell]") ?? {}).some((k) => k.startsWith("__reactProps")), { timeout: 60000 });

    await check("numeric cell rejects letters and formats Indian grouping on blur", async () => {
      await page.click('[aria-label="Item 1 rate"]');
      await frame(page);
      await page.keyboard.type("1x2,0000");
      assert.equal(await val(page, '[aria-label="Item 1 rate"]'), "120000");
      await page.keyboard.press("Tab");
      assert.equal(await val(page, '[aria-label="Item 1 rate"]'), "1,20,000");
      assert.match(await page.$eval('[aria-label="Item 1 amount"]', (e) => e.textContent ?? ""), /2,40,000\.00/);
    });

    await check("Escape cancels a text edit and a numeric edit", async () => {
      await page.click('[aria-label="Item 1 name"]');
      await frame(page);
      await page.keyboard.type("XYZ");
      await page.keyboard.press("Escape");
      assert.equal(await val(page, '[aria-label="Item 1 name"]'), "Pipe");
      await page.click('[aria-label="Item 1 quantity"]');
      await frame(page);
      await page.keyboard.type("999");
      await page.keyboard.press("Escape");
      assert.equal(await val(page, '[aria-label="Item 1 quantity"]'), "2");
    });

    await check("Enter walks cells, and on the last cell of the last row adds a row focused on its description", async () => {
      await page.click('[aria-label="Item 1 name"]');
      await page.keyboard.press("Enter"); assert.equal(await active(page), "unit");
      await page.keyboard.press("Enter"); assert.equal(await active(page), "quantity");
      await page.keyboard.press("Enter"); assert.equal(await active(page), "rate");
      await page.keyboard.press("Enter");
      await page.waitForSelector('[aria-label="Item 2 name"]');
      assert.equal(await rows(page), 2);
      await page.waitForFunction(() => document.activeElement?.getAttribute("aria-label") === "Item 2 name", { timeout: 4000 }).catch(async () => { throw new Error(`focus did not move to the new row; active=${await page.evaluate(() => document.activeElement?.tagName + ":" + (document.activeElement?.getAttribute("aria-label") ?? ""))}`); });
    });

    await check("duplicate and move-down keep order; blank row deletes without confirmation", async () => {
      await page.click('[aria-label="Duplicate item 1"]');
      assert.equal(await rows(page), 3);
      assert.equal(await val(page, '[aria-label="Item 2 name"]'), "Pipe");
      await page.click('[aria-label="Move item 1 down"]');
      await page.click('[aria-label="Delete item 3"]');
      assert.equal(await page.$('[role="alertdialog"]'), null);
      assert.equal(await rows(page), 2);
    });

    await check("deleting a populated row asks first; Escape keeps it; confirm removes it; Ctrl+Z restores it", async () => {
      await page.click('[aria-label="Delete item 1"]');
      await page.waitForSelector('[role="alertdialog"]');
      await page.keyboard.press("Escape");
      assert.equal(await page.$('[role="alertdialog"]'), null);
      assert.equal(await rows(page), 2);
      await page.click('[aria-label="Delete item 1"]');
      await page.waitForSelector('[role="alertdialog"]');
      await page.evaluate(() => (document.querySelector(".q-dialog-actions .danger") as HTMLElement).click());
      await page.waitForFunction(() => document.querySelectorAll('[role="row"].it-row').length === 1);
      await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
      await page.keyboard.down("Control"); await page.keyboard.press("z"); await page.keyboard.up("Control");
      await page.waitForFunction(() => document.querySelectorAll('[role="row"].it-row').length === 2);
    });

    await check("invalid row shows an inline error message", async () => {
      await page.click('[aria-label="Item 1 quantity"]');
      await frame(page);
      await page.keyboard.type("0");
      await page.keyboard.press("Tab");
      const alert = await page.$eval(".it-error", (e) => e.textContent ?? "");
      assert.match(alert, /Quantity must be greater than 0/);
    });

    await check("narrow screen lays the row out without horizontal overflow", async () => {
      await page.setViewport({ width: 375, height: 800 });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
      assert.equal(overflow, false);
    });
  } finally {
    await browser.close();
    server?.kill();
  }
  console.log(`\n${passed} checks passed`);
}

main().catch((e) => { console.error(e); process.exit(1); });
