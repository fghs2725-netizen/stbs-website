import fs from "node:fs/promises";
import chromium from "@sparticuz/chromium";
import puppeteer, { type Browser, type Page } from "puppeteer-core";
import { PDFDocument } from "pdf-lib";
import type { QuotationState } from "@/components/quotation/quotation-model";
import { createQuotationRenderToken } from "@/lib/quotation-render-auth";
import { trustedPdfOrigin, assertPdfRenderPathname } from "@/lib/pdf-origin";
import { deploymentContext } from "@/lib/deployment-info";

export type PdfDiagnostic = (event: string, extra?: Record<string, unknown>) => void;
type PdfContext = { stage: string; startedAt: number; emit?: PdfDiagnostic };

function diag(event: string, context: PdfContext, extra: Record<string, unknown> = {}) { context.emit?.(event, extra); }
function fail(context: PdfContext, error: unknown): never {
  const value = error instanceof Error ? error : new Error("Unknown PDF error");
  diag("FAILURE", context, { stage: context.stage, errorName: value.name, safeErrorCode: value.message.slice(0, 80), durationMs: Date.now() - context.startedAt, ...deploymentContext() });
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
  const documentRootFound = await page.$eval('#quotation-pdf-document', el => !!el).catch(() => false);
  if (!documentRootFound) {
    const pageTitle = await page.title().then(t => t.replace(/token=[^&\s]+/g, "token=[REDACTED]")).catch(() => "unavailable");
    const pathname = await page.evaluate(() => window.location.pathname).catch(() => "unavailable");
    diag("PAGE_NOT_READY", context, { pathname, pageTitle });
    throw new Error("PDF_SELECTOR_NOT_FOUND");
  }

  const readyMarkerFound = await page.$eval('#quotation-pdf-document[data-pdf-ready="true"]', el => el.getAttribute('data-pdf-ready') === 'true').catch(() => false);
  context.stage = 'ready-marker';
  if (!readyMarkerFound) await page.waitForSelector('#quotation-pdf-document[data-pdf-ready="true"]', { timeout: 15_000 });

  context.stage = 'ready';
  diag('PDF_DIAG_RENDER_READY', context, { waitedForMarker: !readyMarkerFound });

  // Wait for fonts to be loaded
  await page.evaluate(async () => { await document.fonts.ready; });

  // Wait for images to be fully loaded
  await page.evaluate(async () => {
    await Promise.all(Array.from(document.images).map(image => image.complete ? Promise.resolve() : new Promise<void>(resolve => {
      image.addEventListener('load', () => resolve(), { once: true });
      image.addEventListener('error', () => resolve(), { once: true });
    })));
  });
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
    if (!response || !response.ok()) {
      const redact = (text: string) => text.replace(/token=[^&\s]+/g, "token=[REDACTED]").replace(/[<>]/g, "");
      const errorPageTitle = await page.title().then(redact).catch(() => "unavailable");
      const errorBodyPreview = await page.evaluate(() => document.body?.innerText?.slice(0, 160) || "(empty body)").then(redact).catch(() => "(evaluate failed)");
      diag("RENDER_HTTP_ERROR_BODY", context, { status, errorPageTitle, errorBodyPreview });
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
  const context: PdfContext = { stage: "render-url", startedAt: Date.now(), emit };
  try {
    if (!quotation.id) throw new Error("PDF_RENDER_QUOTATION_ID_MISSING");
    const origin = trustedPdfOrigin(requestOrigin);
    const token = createQuotationRenderToken(quotation.id);
    diag("RENDER_URL_CREATED", context, { originHost: new URL(origin).host, ...deploymentContext() });
    return await renderPdf(`${origin}/internal/quotation-pdf/${encodeURIComponent(quotation.id)}?token=${encodeURIComponent(token)}`, context);
  } catch (error) { fail(context, error); }
}

export async function runPdfSelfTest() {
  const context: PdfContext = { stage: "self-test", startedAt: Date.now() }; let browser: Browser | undefined;
  try {
    const pathValue = await executablePath(); browser = await launch(context); const page = await browser.newPage();
    await page.setContent(`<style>@page{size:A4;margin:0}html,body{margin:0}</style><body><div data-self-test>STBS PDF SELF TEST</div></body>`, { waitUntil: "load" });
    const pdf = Buffer.from(await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true, margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" } }));
    return { chromiumPath: Boolean(pathValue), browserLaunch: true, pageCreated: true, pdfGenerated: true, pdfBytes: pdf.length, pageCount: (await PDFDocument.load(pdf)).getPageCount() };
  } finally { await browser?.close().catch(() => undefined); }
}
