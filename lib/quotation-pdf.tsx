import fs from "node:fs/promises";
import chromium from "@sparticuz/chromium";
import puppeteer, { type Browser, type Page } from "puppeteer-core";
import { PDFDocument } from "pdf-lib";
import type { QuotationState } from "@/components/quotation/quotation-model";
import { createQuotationRenderToken } from "@/lib/quotation-render-auth";
import { trustedPdfOrigin, assertPdfRenderPathname } from "@/lib/pdf-origin";

export type PdfDiagnostic = (event: string, extra?: Record<string, unknown>) => void;
type PdfContext = { stage: string; emit?: PdfDiagnostic };

function diag(event: string, context: PdfContext, extra: Record<string, unknown> = {}) { context.emit?.(event, extra); }
function fail(context: PdfContext, error: unknown): never {
  const value = error instanceof Error ? error : new Error("Unknown PDF error");
  diag("FAILURE", context, { errorName: value.name, errorMessage: value.message.slice(0, 180), errorCode: value.message.slice(0, 80) });
  const failure = new Error("PDF_GENERATION_FAILED"); failure.cause = value; (failure as Error & { stage?: string }).stage = context.stage; throw failure;
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
  context.stage = "chromium-path"; diag("CHROMIUM_PATH_START", context);
  const pathValue = await executablePath();
  diag("CHROMIUM_PATH_SUCCESS", context, { vercel: Boolean(process.env.VERCEL), configuredPath: Boolean(process.env.PUPPETEER_EXECUTABLE_PATH) });
  context.stage = "browser-launch"; diag("BROWSER_LAUNCH_START", context);

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
  diag("BROWSER_LAUNCH_SUCCESS", context); return browser;
}


async function waitReady(page: Page, context: PdfContext) {
  // Diagnose what page Puppeteer actually received
  const pageTitle = await page.title();
  const bodyPreview = await page.evaluate(() => document.body?.innerText?.slice(0, 300) || "(no body)");
  const bodyChildCount = await page.evaluate(() => document.body?.childElementCount ?? -1);
  const hasExpectedId = await page.evaluate(() => !!document.getElementById("quotation-pdf-document"));
  const pathname = await page.evaluate(() => window.location.pathname);
  const hasNextError = await page.evaluate(() => !!document.querySelector("[data-next-error]") || document.title.includes("404") || document.title.includes("Error") || !!(document.body?.innerText?.includes("This page could not be found")));
  diag("PAGE_DIAG", context, { pathname, pageTitle, bodyChildCount, hasExpectedId, hasNextError, bodyPreview: bodyPreview.replace(/[<>]/g, "") });

  // Verify the main document element exists
  const documentRootFound = await page.$eval('#quotation-pdf-document', el => !!el).catch(() => false);
  diag('PDF_DIAG_RENDER_DOCUMENT_ROOT', context, { found: documentRootFound });

  if (!documentRootFound) {
    diag("PAGE_NO_SELECTOR", context, { pathname, pageTitle, hasNextError });
    await page.screenshot({ path: "/tmp/pdf-debug.png", fullPage: true }).catch(() => undefined);
    throw new Error("PDF_SELECTOR_NOT_FOUND");
  }

  // Verify the readiness marker exists on the main element
  const readyMarkerFound = await page.$eval('#quotation-pdf-document[data-pdf-ready="true"]', el => !!(el && el.getAttribute('data-pdf-ready') === 'true'));
  diag('PDF_DIAG_RENDER_READY_MARKER', context, { found: readyMarkerFound });

  // Wait for the readiness marker to be present
  if (!readyMarkerFound) await page.waitForSelector('#quotation-pdf-document[data-pdf-ready="true"]', { timeout: 15_000 });
  context.stage = 'ready';
  diag('PDF_DIAG_RENDER_READY', context);

  // Wait for fonts to be loaded
  await page.evaluate(async () => { await document.fonts.ready; });
  diag('PDF_DIAG_FONTS_READY', context);

  // Wait for images to be fully loaded
  await page.evaluate(async () => {
    await Promise.all(Array.from(document.images).map(image => image.complete ? Promise.resolve() : new Promise<void>(resolve => {
      image.addEventListener('load', () => resolve(), { once: true });
      image.addEventListener('error', () => resolve(), { once: true });
    })));
  });
  diag('PDF_DIAG_IMAGES_READY', context);
}
async function renderPdf(url: string, context: PdfContext) {
  let browser: Browser | undefined;
  try {
    browser = await launch(context);
    context.stage = "page-create-start"; diag("PAGE_CREATE_START", context);
    const page = await browser.newPage();
    diag("PAGE_CREATE_SUCCESS", context);
    context.stage = "render-navigation"; diag("RENDER_NAVIGATION_START", context);
    const redactedUrl = url.replace(/token=[^&]+/, "token=[REDACTED]");
    diag("RENDER_URL_BEFORE_GOTO", context, { renderUrl: redactedUrl });
    const response = await page.goto(url, { waitUntil: "load", timeout: 15_000 });
    const status = response?.status() ?? 0;
    const finalUrl = response?.url() ?? "none";
    let finalPathname = "unknown";
    try { finalPathname = new URL(finalUrl).pathname; } catch { /* ignore */ }
    const redactedFinal = finalUrl.replace(/token=[^&]+/, "token=[REDACTED]");
    diag("RENDER_URL_AFTER_GOTO", context, { finalUrl: redactedFinal, finalPathname, status });
    if (!response || !response.ok()) {
      const errorPageTitle = await page.title().catch(() => "unknown");
      const errorBodyPreview = await page.evaluate(() => document.body?.innerText?.slice(0, 200) || "(empty body)").catch(() => "(evaluate failed)");
      diag("RENDER_HTTP_ERROR_BODY", context, { status, errorPageTitle, errorBodyPreview: errorBodyPreview.replace(/[<>]/g, "") });
      throw new Error(`PDF_RENDER_HTTP_${status}`);
    }
    diag("RENDER_NAVIGATION_SUCCESS", context);
    assertPdfRenderPathname(page.url());
    await waitReady(page, context);
    context.stage = "pdf-generation"; diag("PDF_GENERATION_START", context);
    const pdf = await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true, margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" } });
    const bytes = Buffer.from(pdf); diag("PDF_GENERATION_SUCCESS", context); diag("PDF_BYTES", context, { pdfBytes: bytes.length });
    if (bytes.length < 1000 || !bytes.subarray(0, 5).equals(Buffer.from("%PDF-"))) throw new Error("INVALID_PDF_BYTES");
    const pageCount = (await PDFDocument.load(bytes)).getPageCount();
    context.stage = "page-count"; diag("PAGE_COUNT", context, { expectedPageCount: 4, actualPageCount: pageCount });
    if (pageCount !== 4) throw new Error("PDF_PAGE_COUNT_INVALID");
    diag("VALIDATION_SUCCESS", context, { pageCount }); return bytes;
  } catch (error) { fail(context, error); } finally { await browser?.close().catch(() => undefined); }
}

export async function generateQuotationPdf(quotation: QuotationState, requestOrigin: string, emit?: PdfDiagnostic) {
  const context: PdfContext = { stage: "render-url", emit };
  try {
    if (!quotation.id) throw new Error("PDF_RENDER_QUOTATION_ID_MISSING");
    const origin = trustedPdfOrigin(requestOrigin);
    const token = createQuotationRenderToken(quotation.id);
    diag("RENDER_URL_CREATED", context, { originHost: new URL(origin).host });
    return await renderPdf(`${origin}/internal/quotation-pdf/${encodeURIComponent(quotation.id)}?token=${encodeURIComponent(token)}`, context);
  } catch (error) { fail(context, error); }
}

export async function runPdfSelfTest() {
  const context: PdfContext = { stage: "self-test" }; let browser: Browser | undefined;
  try {
    const pathValue = await executablePath(); browser = await launch(context); const page = await browser.newPage();
    await page.setContent(`<style>@page{size:A4;margin:0}html,body{margin:0}</style><body><div data-self-test>STBS PDF SELF TEST</div></body>`, { waitUntil: "load" });
    const pdf = Buffer.from(await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true, margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" } }));
    return { chromiumPath: Boolean(pathValue), browserLaunch: true, pageCreated: true, pdfGenerated: true, pdfBytes: pdf.length, pageCount: (await PDFDocument.load(pdf)).getPageCount() };
  } finally { await browser?.close().catch(() => undefined); }
}
