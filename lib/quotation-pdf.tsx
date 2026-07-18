import fs from "node:fs/promises";
import path from "node:path";
import chromium from "@sparticuz/chromium";
import puppeteer, { type Browser, type Page } from "puppeteer-core";
import { PDFDocument } from "pdf-lib";
import { renderToStaticMarkup } from "react-dom/server.edge";
import { QuotationDocument } from "@/components/quotation/QuotationDocument";
import type { QuotationState } from "@/components/quotation/quotation-model";

type PdfStage = "start" | "auth" | "data" | "chromium-path" | "browser-launch" | "page-created" | "render-url" | "render-navigation" | "render-ready" | "pdf-generated" | "page-count" | "complete";
type PdfContext = { started: number; stage: PdfStage; markers: Record<string, boolean> };

function diag(event: string, context: PdfContext, extra: Record<string, unknown> = {}) {
  console.log(`PDF_DIAG_${event}`, JSON.stringify({ stage: context.stage, durationMs: Date.now() - context.started, ...context.markers, ...extra }));
}

function fail(context: PdfContext, error: unknown, extra: Record<string, unknown> = {}): never {
  const value = error instanceof Error ? error : new Error("Unknown PDF error");
  console.error("PDF_DIAG_ERROR", JSON.stringify({ stage: context.stage, errorName: value.name, safeMessage: value.message.slice(0, 180), durationMs: Date.now() - context.started, ...context.markers, ...extra }));
  throw new Error("PDF_GENERATION_FAILED");
}

async function stylesheet(name: string) { return fs.readFile(path.join(process.cwd(), "components", "quotation", name), "utf8"); }

async function executablePath() {
  const configured = process.env.PUPPETEER_EXECUTABLE_PATH;
  if (configured) return configured;
  if (process.env.VERCEL) return chromium.executablePath();
  const candidates = [
    process.env.LOCAL_CHROME_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  ].filter(Boolean) as string[];
  for (const candidate of candidates) { try { await fs.access(candidate); return candidate; } catch { /* continue */ } }
  throw new Error("LOCAL_CHROMIUM_NOT_FOUND");
}

function htmlDocument(css: string, markup: string, origin: string) {
  return `<!doctype html><html><head><meta charset="utf-8"><base href="${origin}/"><style>${css}</style></head><body><div class="quotation-pdf-root">${markup}</div><script>document.fonts.ready.then(()=>{document.documentElement.dataset.pdfReady='true'})</script></body></html>`;
}

async function launch(context: PdfContext) {
  context.stage = "chromium-path";
  const pathValue = await executablePath();
  context.markers.chromiumPathResolved = true;
  diag("CHROMIUM_PATH", context, { vercel: Boolean(process.env.VERCEL), configuredPath: Boolean(process.env.PUPPETEER_EXECUTABLE_PATH) });
  context.stage = "browser-launch";
  const browser = await puppeteer.launch({
    args: process.env.VERCEL ? await puppeteer.defaultArgs({ args: chromium.args, headless: "shell" }) : ["--no-sandbox", "--disable-setuid-sandbox"],
    executablePath: pathValue,
    headless: process.env.VERCEL ? "shell" : true,
    defaultViewport: { width: 794, height: 1123, deviceScaleFactor: 1 },
  });
  context.markers.browserLaunched = true;
  diag("BROWSER_LAUNCH", context);
  return browser;
}

async function waitReady(page: Page, context: PdfContext) {
  context.stage = "render-ready";
  await page.waitForFunction(() => document.documentElement.dataset.pdfReady === "true", { timeout: 15_000 });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(Array.from(document.images).map(image => image.complete ? Promise.resolve() : new Promise<void>(resolve => {
      image.addEventListener("load", () => resolve(), { once: true });
      image.addEventListener("error", () => resolve(), { once: true });
    })));
  });
  context.markers.renderReady = true;
  diag("RENDER_READY", context);
}

async function renderPdf(html: string, context: PdfContext) {
  let browser: Browser | undefined;
  try {
    browser = await launch(context);
    context.stage = "page-created";
    const page = await browser.newPage();
    context.markers.pageCreated = true;
    diag("PAGE_CREATED", context);
    context.stage = "render-url";
    diag("RENDER_URL", context, { directHtml: true });
    context.stage = "render-navigation";
    await page.setContent(html, { waitUntil: "load", timeout: 15_000 });
    context.markers.renderNavigationComplete = true;
    diag("RENDER_NAVIGATION", context);
    await waitReady(page, context);
    const pdf = await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true, margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" } });
    context.stage = "pdf-generated";
    const bytes = Buffer.from(pdf);
    context.markers.pdfGenerated = true;
    diag("PDF_GENERATED", context, { pdfBytes: bytes.length });
    if (bytes.length < 1000 || !bytes.subarray(0, 5).equals(Buffer.from("%PDF-"))) throw new Error("INVALID_PDF_BYTES");
    context.stage = "page-count";
    const pageCount = (await PDFDocument.load(bytes)).getPageCount();
    diag("PAGE_COUNT", context, { expectedPageCount: 4, actualPageCount: pageCount, pdfBytes: bytes.length });
    if (pageCount !== 4) { const error = new Error("PDF_PAGE_COUNT_INVALID"); fail(context, error, { expectedPageCount: 4, actualPageCount: pageCount }); }
    context.stage = "complete";
    diag("COMPLETE", context, { pdfBytes: bytes.length, pageCount });
    return bytes;
  } catch (error) { fail(context, error); }
  finally { await browser?.close().catch(() => undefined); }
}

function pdfCss(quotationCss: string, refinementCss: string, responsiveCss: string) {
  return `${quotationCss}\n${refinementCss}\n${responsiveCss}\n
    *{box-sizing:border-box}html,body{margin:0!important;padding:0!important;width:210mm!important;background:#f5f0e7!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .quotation-pdf-root{display:block!important;width:210mm!important;margin:0!important;padding:0!important;background:#f5f0e7!important}
    .quotation-pdf-root .q-document{display:block!important;width:210mm!important;margin:0!important;padding:0!important;gap:0!important}
    .quotation-pdf-root .q-page{display:block!important;width:210mm!important;height:297mm!important;min-height:297mm!important;max-height:297mm!important;box-sizing:border-box!important;margin:0!important;padding:0!important;overflow:hidden!important;break-inside:avoid!important;break-after:page!important;background:#f5f0e7!important;box-shadow:none!important}
    .quotation-pdf-root .q-page:last-child{break-after:auto!important}
    @page{size:A4 portrait;margin:0}
    @font-face{font-family:Inter;src:url('/fonts/inter-latin-400.woff2') format('woff2');font-weight:400}
    @font-face{font-family:Inter;src:url('/fonts/inter-latin-600.woff2') format('woff2');font-weight:600}
    @font-face{font-family:Montserrat;src:url('/fonts/montserrat-latin-700.woff2') format('woff2');font-weight:700}`;
}

export async function generateQuotationPdf(quotation: QuotationState, origin: string) {
  const context: PdfContext = { started: Date.now(), stage: "start", markers: {} };
  diag("START", context);
  try {
    const [quotationCss, refinementCss, responsiveCss] = await Promise.all([stylesheet("quotation.css"), stylesheet("quotation-refinement.css"), stylesheet("responsive-print.css")]);
    const markup = renderToStaticMarkup(<QuotationDocument quotation={quotation} />);
    const html = htmlDocument(pdfCss(quotationCss, refinementCss, responsiveCss), markup, origin);
    context.stage = "data";
    context.markers.quotationRendered = true;
    diag("DATA", context);
    return await renderPdf(html, context);
  } catch (error) { fail(context, error); }
}

export async function runPdfSelfTest() {
  const context: PdfContext = { started: Date.now(), stage: "start", markers: {} };
  let browser: Browser | undefined;
  try {
    const pathValue = await executablePath();
    context.markers.chromiumPathResolved = true;
    browser = await launch(context);
    const page = await browser.newPage();
    context.markers.pageCreated = true;
    await page.setContent(`<style>@page{size:A4;margin:0}html,body{margin:0}</style><body><div data-self-test>STBS PDF SELF TEST</div></body>`, { waitUntil: "load" });
    const pdf = Buffer.from(await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true, margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" } }));
    context.markers.pdfGenerated = true;
    const pageCount = (await PDFDocument.load(pdf)).getPageCount();
    return { chromiumPath: Boolean(pathValue), browserLaunch: true, pageCreated: true, pdfGenerated: true, pdfBytes: pdf.length, pageCount };
  } finally { await browser?.close().catch(() => undefined); }
}
