import fs from "node:fs/promises";
import chromium from "@sparticuz/chromium";
import puppeteer, { type Browser } from "puppeteer-core";
import { createDocumentRenderToken } from "@/lib/document-render-auth";
import { trustedPdfOrigin, assertPdfRenderPathname } from "@/lib/pdf-origin";

type PdfContext = { stage: string; emit?: (event: string, extra?: Record<string, unknown>) => void };

function diag(event: string, context: PdfContext, extra: Record<string, unknown> = {}) { context.emit?.(event, extra); }
function fail(context: PdfContext, error: unknown): never {
  const value = error instanceof Error ? error : new Error("Unknown PDF error");
  const failure = new Error("PDF_GENERATION_FAILED"); failure.cause = value; throw failure;
}

async function executablePath() {
  const configured = process.env.PUPPETEER_EXECUTABLE_PATH;
  if (configured) return configured;
  if (process.env.VERCEL) return chromium.executablePath();
  for (const candidate of [process.env.LOCAL_CHROME_PATH, "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"].filter(Boolean) as string[]) {
    try { await fs.access(candidate); return candidate; } catch { /* continue */ }
  }
  throw new Error("LOCAL_CHROMIUM_NOT_FOUND");
}

async function launch(context: PdfContext) {
  const pathValue = await executablePath();
  const useSandbox = process.env.PUPPETEER_SANDBOX === "true";

  const baseArgs = process.env.VERCEL
    ? await puppeteer.defaultArgs({ args: chromium.args, headless: "shell" })
    : [
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--no-zygote",
        "--disable-setuid-sandbox",
        "--disable-background-networking",
        "--disable-default-apps",
        "--disable-extensions",
        "--disable-sync",
        "--no-first-run",
      ];

  if (!useSandbox) {
    baseArgs.push("--no-sandbox");
  }

  const browser = await puppeteer.launch({
    args: baseArgs,
    executablePath: pathValue,
    headless: process.env.VERCEL ? "shell" : true,
    defaultViewport: { width: 794, height: 1123, deviceScaleFactor: 1 },
  });
  return browser;
}

export async function generateDocumentPdf(documentId: string, requestOrigin: string, emit?: (event: string, extra?: Record<string, unknown>) => void) {
  const context: PdfContext = { stage: "init", emit };
  let browser: Browser | undefined;
  try {
    const origin = trustedPdfOrigin(requestOrigin);
    const token = createDocumentRenderToken(documentId);
    const url = `${origin}/internal/document-pdf/${encodeURIComponent(documentId)}?token=${encodeURIComponent(token)}`;

    browser = await launch(context);
    const page = await browser.newPage();

    const response = await page.goto(url, { waitUntil: "load", timeout: 20_000 });
    if (!response || !response.ok()) throw new Error(`PDF_RENDER_HTTP_${response?.status() ?? 0}`);
    assertPdfRenderPathname(page.url());

    await page.waitForSelector('#document-pdf-render[data-pdf-ready="true"]', { timeout: 15_000 });
    await page.evaluate(async () => { await document.fonts.ready; });
    await page.evaluate(async () => {
      await Promise.all(Array.from(document.images).map(image => image.complete ? Promise.resolve() : new Promise<void>(resolve => {
        image.addEventListener('load', () => resolve(), { once: true });
        image.addEventListener('error', () => resolve(), { once: true });
      })));
    });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
    });

    return Buffer.from(pdf);
  } catch (error) {
    fail(context, error);
  } finally {
    await browser?.close().catch(() => undefined);
  }
}
