/**
 * Invoice editor UI test.
 *
 *   npm run test:invoice-editor-ui
 *
 * Drives the real editor in a real browser against a dev-only harness with no database, which is the
 * only way to check the parts that only exist once the component is running: that typing moves the
 * totals, that a column switched off in settings really disappears, that validation speaks up, and
 * that saving hands back what was typed.
 */
import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import puppeteer, { type Page } from "puppeteer-core";

const PORT = Number(process.env.HARNESS_PORT ?? 3016);
const BASE = `http://localhost:${PORT}`;
const HARNESS = `${BASE}/internal/invoice-editor-harness`;
const CHROME = process.env.CHROME_PATH ?? ["C:/Program Files/Google/Chrome/Application/chrome.exe", "/usr/bin/google-chrome", "/usr/bin/chromium"].find((p) => fs.existsSync(p));

let passed = 0;
const check = async (label: string, fn: () => Promise<void>) => { await fn(); passed++; console.log(`  ok  ${label}`); };

async function up() {
  try { return (await fetch(HARNESS)).ok; } catch { return false; }
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

async function selectAll(page: Page) {
  await page.keyboard.down("Control");
  await page.keyboard.press("KeyA");
  await page.keyboard.up("Control");
}

/** Replaces a field's contents. Select-all by keyboard, so React sees every change. */
async function fill(page: Page, selector: string, value: string) {
  await page.waitForSelector(selector);
  await page.focus(selector);
  await selectAll(page);
  await page.keyboard.type(value);
}

/** The same, for an element already found. */
async function fillHandle(handle: { focus: () => Promise<void> }, page: Page, value: string) {
  await handle.focus();
  await selectAll(page);
  await page.keyboard.type(value);
}

const rowInput = (n: number, label: string) => `ul.a-divide > li:nth-child(${n}) input[placeholder="${label}"]`;
const text = (page: Page, selector: string) => page.$eval(selector, (el) => (el as HTMLElement).innerText.trim());
const totalsText = (page: Page) => page.$$eval("dl.a-num dd", (els) => els.map((e) => (e as HTMLElement).innerText.trim()));

async function addItem(page: Page, description: string, unit: string, qty: string, rate: string, index: number) {
  await page.evaluate(() => {
    const button = Array.from(document.querySelectorAll("button")).find((b) => b.innerText.includes("Add item"));
    (button as HTMLButtonElement).click();
  });
  await page.waitForSelector(rowInput(index, "Item name"));
  await fill(page, rowInput(index, "Item name"), description);
  await fill(page, `ul.a-divide > li:nth-child(${index}) input[placeholder="Nos"]`, unit);
  const numbers = await page.$$(`ul.a-divide > li:nth-child(${index}) input[type="number"]`);
  await fillHandle(numbers[0], page, qty);
  await fillHandle(numbers[1], page, rate);
}

async function main() {
  if (!CHROME) throw new Error("Chrome not found; set CHROME_PATH");
  const server = await startServer();
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-sandbox"] });

  try {
    const page = await browser.newPage();
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));
    await page.setViewport({ width: 1280, height: 1000 });
    await page.goto(HARNESS, { waitUntil: "networkidle0", timeout: 120000 });

    await check("the editor renders with no items and says so", async () => {
      assert.ok((await page.content()).includes("No items yet"));
    });

    await check("an incomplete invoice lists exactly what is missing", async () => {
      const body = await text(page, "main");
      assert.ok(body.includes("the client's name"), "the client's name should be listed");
      assert.ok(body.includes("at least one complete item"), "a complete item should be listed");
    });

    await check("adding an item and typing a quantity and rate moves the line and the totals", async () => {
      await addItem(page, "Drilling of 8 inch borewell", "Meter", "10", "1250", 1);
      await page.waitForFunction(() => document.body.innerText.includes("₹12,500.00"));
      const totals = await totalsText(page);
      assert.ok(totals.includes("₹12,500.00"), `subtotal should be 12,500 — saw ${totals.join(", ")}`);
    });

    await check("GST is charged at the rate shown, split into CGST and SGST", async () => {
      const body = await text(page, "main");
      // The draft carries the owner's defaults: GST on at 18%, split in half within Haryana.
      assert.ok(body.includes("CGST"), "CGST should be shown");
      assert.ok(body.includes("SGST"), "SGST should be shown");
      await page.waitForFunction(() => document.body.innerText.includes("₹1,125.00"));
      await page.waitForFunction(() => document.body.innerText.includes("₹14,750.00"));
    });

    await check("naming a client outside Haryana switches the split to IGST", async () => {
      await fill(page, 'input[placeholder="Haryana"]', "Delhi");
      await page.waitForFunction(() => {
        const select = Array.from(document.querySelectorAll("select")).find((s) => s.value === "IGST" || s.value === "CGST_SGST");
        return select?.value === "IGST";
      }, { timeout: 10000 });
      await page.waitForFunction(() => document.body.innerText.includes("IGST"));
    });

    await check("a second item adds to the subtotal", async () => {
      await addItem(page, "Gravel packing", "Cu.m", "6", "3200", 2);
      await page.waitForFunction(() => document.body.innerText.includes("₹31,700.00"));
    });

    await check("removing an item takes its value back off", async () => {
      await page.evaluate(() => {
        const button = document.querySelector('button[aria-label="Remove item"]') as HTMLButtonElement;
        button.click();
      });
      await page.waitForFunction(() => !document.body.innerText.includes("₹31,700.00"));
      await page.waitForFunction(() => document.body.innerText.includes("₹19,200.00"));
    });

    await check("a percentage discount comes off before the tax", async () => {
      // Find the discount dropdown by its options rather than its position on the page.
      const selects = await page.$$("select");
      for (const s of selects) {
        const hasPercent = await s.evaluate((el) => Array.from((el as HTMLSelectElement).options).some((o) => o.value === "PERCENT"));
        if (hasPercent) { await s.select("PERCENT"); break; }
      }
      await page.waitForFunction(() => document.body.innerText.includes("Value"));
      const valueField = await page.evaluateHandle(() =>
        Array.from(document.querySelectorAll("label")).find((l) => l.textContent?.trim().startsWith("Value"))?.querySelector("input"));
      await fillHandle(valueField.asElement() as unknown as { focus: () => Promise<void> }, page, "10");
      // 19,200 less 10% is a discount of 1,920, leaving 17,280. IGST at 18% is 3,110.40, so the raw
      // total is 20,390.40 and the round-off switch settles it at 20,390.
      await page.waitForFunction(() => document.body.innerText.includes("₹1,920.00"));
      await page.waitForFunction(() => document.body.innerText.includes("₹20,390.00"));
    });

    await check("filling in the client clears the last thing blocking issue", async () => {
      await fill(page, "section:nth-of-type(1) input", "Sample Industrial Works Pvt. Ltd.");
      await page.waitForFunction(() => !document.body.innerText.includes("Before this can be issued"));
    });

    await check("saving hands back exactly what was typed", async () => {
      await page.evaluate(() => {
        const button = Array.from(document.querySelectorAll("button")).find((b) => b.innerText.includes("Save invoice"));
        (button as HTMLButtonElement).click();
      });
      await page.waitForFunction(() => (document.querySelector('[data-testid="saved-payload"]') as HTMLElement).innerText.length > 0);
      const saved = JSON.parse(await text(page, '[data-testid="saved-payload"]'));
      assert.equal(saved.client, "Sample Industrial Works Pvt. Ltd.");
      assert.equal(saved.items.length, 1);
      assert.equal(saved.items[0].description, "Gravel packing");
      assert.equal(saved.items[0].quantity, 6);
      assert.equal(saved.items[0].rate, 3200);
      assert.equal(saved.gstMode, "IGST", "the split chosen from the client's state must be what is saved");
    });

    await check("a column switched off in settings is not asked for", async () => {
      const off = await browser.newPage();
      await off.goto(`${HARNESS}?hsn=off`, { waitUntil: "networkidle0", timeout: 120000 });
      await off.evaluate(() => {
        const button = Array.from(document.querySelectorAll("button")).find((b) => b.innerText.includes("Add item"));
        (button as HTMLButtonElement).click();
      });
      await off.waitForSelector('input[placeholder="Item name"]');
      assert.equal(await off.$('input[placeholder="8413"]'), null, "the HSN field must be gone when the column is off");
      const on = await browser.newPage();
      await on.goto(HARNESS, { waitUntil: "networkidle0", timeout: 120000 });
      await on.evaluate(() => {
        const button = Array.from(document.querySelectorAll("button")).find((b) => b.innerText.includes("Add item"));
        (button as HTMLButtonElement).click();
      });
      await on.waitForSelector('input[placeholder="Item name"]');
      assert.ok(await on.$eval("main", (el) => (el as HTMLElement).innerText.includes("HSN/SAC")), "the HSN field must be there when the column is on");
      await off.close();
      await on.close();
    });

    await check("the editor ran without a single page error", async () => {
      assert.deepEqual(errors, []);
    });
  } finally {
    await browser.close();
    server?.kill();
  }

  console.log(`\n${passed} checks passed`);
}

main().catch((e) => { console.error(e); process.exit(1); });
