/**
 * Invoice end-to-end test: the half that unit tests cannot reach.
 *
 *   E2E_CONFIRM=1 npm run test:invoice-e2e
 *
 * Logs in as a real admin and drives the real screens: raise an invoice from a quotation, issue it
 * (which takes a number for good), record a payment, raise a credit note, and download the PDF.
 * Nothing here is mocked — it exercises the server actions, the database writes and the PDF renderer.
 *
 * THIS WRITES REAL ROWS AND CONSUMES REAL INVOICE NUMBERS, so it refuses to run against the
 * production database. Point DATABASE_URL at a Neon branch (a throwaway copy) first:
 *
 *   1. Neon console -> Branches -> New branch, from production
 *   2. Put its connection string in DATABASE_URL (and DATABASE_URL_UNPOOLED)
 *   3. E2E_CONFIRM=1 npm run test:invoice-e2e
 *
 * It sets a known password on the admin user so it can log in. That is safe on a branch and is the
 * reason it must never touch production.
 */
import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import puppeteer, { type Page } from "puppeteer-core";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";

/** The production endpoint. If DATABASE_URL still points here, nothing runs. */
const PRODUCTION_ENDPOINT = "ep-summer-glitter-at5jtn3a";
const TEST_PASSWORD = "e2e-test-password-not-for-production";
const PORT = Number(process.env.E2E_PORT ?? 3017);
const BASE = `http://localhost:${PORT}`;
const CHROME = process.env.CHROME_PATH ?? ["C:/Program Files/Google/Chrome/Application/chrome.exe", "/usr/bin/google-chrome", "/usr/bin/chromium"].find((p) => fs.existsSync(p));

let passed = 0;
const check = async (label: string, fn: () => Promise<void>) => { await fn(); passed++; console.log(`  ok  ${label}`); };

function guard() {
  const url = process.env.DATABASE_URL ?? "";
  if (!url) throw new Error("DATABASE_URL is not set.");
  if (url.includes(PRODUCTION_ENDPOINT) || process.env.NEON_BRANCH === "production") {
    throw new Error(
      "REFUSING TO RUN: DATABASE_URL still points at production.\n" +
      "This test issues invoices, which consumes numbers from a GST series that must not have gaps.\n" +
      "Create a Neon branch and point DATABASE_URL at it first.",
    );
  }
  if (process.env.E2E_CONFIRM !== "1") {
    throw new Error("Set E2E_CONFIRM=1 to confirm you are pointed at a throwaway database.");
  }
}

async function up() {
  try { return (await fetch(`${BASE}/admin/login`)).ok; } catch { return false; }
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

/** Gives the first active admin a known password, so the test can log in as a real user. */
async function prepareLogin(): Promise<string> {
  const user = await prisma.user.findFirst({ where: { deletedAt: null, email: { not: null } }, orderBy: { createdAt: "asc" } });
  if (!user?.email) throw new Error("No user with an email address in this database to log in as.");
  await prisma.user.update({ where: { id: user.id }, data: { password: await bcrypt.hash(TEST_PASSWORD, 10) } });
  return user.email;
}

const clickText = async (page: Page, text: string) => {
  await page.waitForFunction(
    (t: string) => Array.from(document.querySelectorAll("button, a")).some((el) => (el as HTMLElement).innerText.trim().includes(t)),
    { timeout: 30000 }, text,
  );
  await page.evaluate((t: string) => {
    const el = Array.from(document.querySelectorAll("button, a")).find((e) => (e as HTMLElement).innerText.trim().includes(t));
    (el as HTMLElement).click();
  }, text);
};

const bodyText = (page: Page) => page.evaluate(() => document.body.innerText);

async function main() {
  guard();
  if (!CHROME) throw new Error("Chrome not found; set CHROME_PATH");

  const email = await prepareLogin();
  console.log(`  ..  logged in as ${email} on a non-production database`);

  const server = await startServer();
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-sandbox"] });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 1000 });

    await check("an admin can log in", async () => {
      await page.goto(`${BASE}/admin/login`, { waitUntil: "networkidle0", timeout: 120000 });
      await page.type('input[name="email"], input[type="email"]', email);
      await page.type('input[name="password"], input[type="password"]', TEST_PASSWORD);
      await Promise.all([
        page.waitForNavigation({ waitUntil: "networkidle0", timeout: 60000 }).catch(() => undefined),
        page.click('button[type="submit"]'),
      ]);
      await page.goto(`${BASE}/admin/invoices`, { waitUntil: "networkidle0", timeout: 60000 });
      assert.ok((await bodyText(page)).includes("Invoices"), "the invoice list should be reachable once logged in");
    });

    let invoiceUrl = "";

    await check("an invoice can be raised from a quotation", async () => {
      await page.goto(`${BASE}/admin/quotations`, { waitUntil: "networkidle0", timeout: 60000 });
      await clickText(page, "View");
      await page.waitForFunction(() => location.pathname.startsWith("/admin/quotations/"), { timeout: 30000 });
      const before = await bodyText(page);
      assert.ok(before.includes("Raise invoice") || before.includes("View invoice"), "the quotation should offer to raise an invoice");
      if (before.includes("Raise invoice")) {
        await clickText(page, "Raise invoice");
      } else {
        await clickText(page, "View invoice");
      }
      await page.waitForFunction(() => location.pathname.startsWith("/admin/invoices/"), { timeout: 60000 });
      invoiceUrl = page.url();
      const text = await bodyText(page);
      assert.ok(text.includes("Draft invoice") || text.includes("Invoice "), "it should land on the invoice");
    });

    await check("the draft carries the quotation's client and items", async () => {
      const text = await bodyText(page);
      assert.ok(text.includes("Raised against quotation"), "the invoice should name the quotation it came from");
      assert.ok(/Total/.test(text), "the money panel should be shown");
    });

    await check("issuing takes the next number and the invoice becomes Issued", async () => {
      const text = await bodyText(page);
      if (text.includes("Issue and take the next number")) {
        await clickText(page, "Issue and take the next number");
        await page.waitForFunction(() => !document.body.innerText.includes("Issue and take the next number"), { timeout: 60000 });
      }
      const after = await bodyText(page);
      assert.ok(/Invoice \d+/.test(after), `the invoice should now show a number — saw: ${after.slice(0, 200)}`);
      assert.ok(after.includes("Issued") || after.includes("Part paid") || after.includes("Paid"), "status should have moved off Draft");
    });

    await check("a payment can be recorded and the balance follows it", async () => {
      await page.goto(invoiceUrl, { waitUntil: "networkidle0", timeout: 60000 });
      const text = await bodyText(page);
      if (!text.includes("Record a payment")) return; // already settled
      const amount = await page.$('input[name="amount"]');
      await amount!.focus();
      await page.keyboard.down("Control"); await page.keyboard.press("KeyA"); await page.keyboard.up("Control");
      await page.keyboard.type("100");
      await clickText(page, "Record");
      await page.waitForFunction(() => document.body.innerText.includes("Payments"), { timeout: 60000 });
      assert.ok((await bodyText(page)).includes("Part paid"), "a partial payment should show Part paid");
    });

    await check("a credit note can be raised, with its own number", async () => {
      await page.goto(invoiceUrl, { waitUntil: "networkidle0", timeout: 60000 });
      assert.ok((await bodyText(page)).includes("Credit notes"), "the credit note panel should be there once issued");
      const amount = await page.$('input[name="amount"][max]');
      if (!amount) return;
      const reason = await page.$('input[name="reason"]');
      await amount.focus();
      await page.keyboard.down("Control"); await page.keyboard.press("KeyA"); await page.keyboard.up("Control");
      await page.keyboard.type("50");
      await reason!.focus();
      await page.keyboard.type("E2E test credit");
      await clickText(page, "Raise credit note");
      await page.waitForFunction(() => document.body.innerText.includes("Credited"), { timeout: 60000 });
      assert.ok((await bodyText(page)).includes("Credit note 1"), "the first credit note should be numbered 1");
    });

    await check("the PDF renders and comes back as a real PDF", async () => {
      const id = invoiceUrl.split("/admin/invoices/")[1].split(/[/?#]/)[0];
      const result = await page.evaluate(async (invoiceId: string) => {
        const response = await fetch(`/api/invoices/${invoiceId}/pdf`);
        if (!response.ok) return { ok: false, status: response.status, text: (await response.text()).slice(0, 200) };
        const buffer = await response.arrayBuffer();
        const head = new TextDecoder().decode(new Uint8Array(buffer.slice(0, 5)));
        return { ok: true, bytes: buffer.byteLength, head };
      }, id);
      assert.ok(result.ok, `the PDF route failed: ${JSON.stringify(result)}`);
      assert.equal((result as { head: string }).head, "%PDF-", "the response should be a PDF");
      assert.ok((result as { bytes: number }).bytes > 10000, "the PDF should not be a stub");
      console.log(`      PDF: ${(result as { bytes: number }).bytes} bytes`);
    });

    await check("the invoice list shows what just happened", async () => {
      await page.goto(`${BASE}/admin/invoices`, { waitUntil: "networkidle0", timeout: 60000 });
      const text = await bodyText(page);
      assert.ok(/Invoice \d+/.test(text), "the issued invoice should be listed");
    });
  } finally {
    await browser.close();
    server?.kill();
    await prisma.$disconnect();
  }

  console.log(`\n${passed} checks passed`);
  console.log("Remember: this ran against a branch. Delete it when you are done, and put DATABASE_URL back.");
}

main().catch((e) => { console.error(`\n${e instanceof Error ? e.message : e}`); process.exit(1); });
