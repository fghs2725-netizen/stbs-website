import fs from "node:fs/promises";
import path from "node:path";
import chromium from "@sparticuz/chromium";
import puppeteer, { type Browser, type Page } from "puppeteer-core";
import { PDFDocument } from "pdf-lib";
import type { QuotationState } from "@/components/quotation/quotation-model";
import { createQuotationRenderToken } from "@/lib/quotation-render-auth";

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

function trustedOrigin(requestOrigin: string) {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  const configured = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL;
  if (configured) return configured.replace(/\/$/, "");
  if (process.env.VERCEL) throw new Error("PDF_TRUSTED_ORIGIN_MISSING");
  return requestOrigin;
}

async function launch(context: PdfContext) {
  context.stage = "chromium-path"; diag("CHROMIUM_PATH_START", context);
  const pathValue = await executablePath();
  diag("CHROMIUM_PATH_SUCCESS", context, { vercel: Boolean(process.env.VERCEL), configuredPath: Boolean(process.env.PUPPETEER_EXECUTABLE_PATH) });
  context.stage = "browser-launch"; diag("BROWSER_LAUNCH_START", context);
  const browser = await puppeteer.launch({
    args: process.env.VERCEL ? await puppeteer.defaultArgs({ args: chromium.args, headless: "shell" }) : ["--no-sandbox", "--disable-setuid-sandbox"],
    executablePath: pathValue,
    headless: process.env.VERCEL ? "shell" : true,
    defaultViewport: { width: 794, height: 1123, deviceScaleFactor: 1 },
  });
  diag("BROWSER_LAUNCH_SUCCESS", context); return browser;
}


async function waitReady(page: Page, context: PdfContext) {
  // Verify the main document element exists
  const documentRootFound = await page.$eval('#quotation-pdf-document', el => !!el);
  diag('PDF_DIAG_RENDER_DOCUMENT_ROOT', context, { found: documentRootFound });

  // Verify the readiness marker exists on the main element
  const readyMarkerFound = await page.$eval('#quotation-pdf-document[data-pdf-ready="true"]', el => !!(el && el.getAttribute('data-pdf-ready') === 'true'));
  diag('PDF_DIAG_RENDER_READY_MARKER', context, { found: readyMarkerFound });

  // Wait for the readiness marker to be present
  await page.waitForSelector('#quotation-pdf-document[data-pdf-ready="true"]', { timeout: 15_000 });
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
    const response = await page.goto(url, { waitUntil: "load", timeout: 15_000 });
    const status = response?.status() ?? 0;
    diag("RENDER_NAVIGATION_HTTP_STATUS", context, { status });
    if (!response || !response.ok()) throw new Error(`PDF_RENDER_HTTP_${status}`);
    diag("RENDER_NAVIGATION_SUCCESS", context);
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
    const origin = trustedOrigin(requestOrigin);
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
