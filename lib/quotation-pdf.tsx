import fs from "node:fs/promises";
import path from "node:path";
import chromium from "@sparticuz/chromium";
import puppeteer, { type Browser, type Page } from "puppeteer-core";
import { PDFDocument } from "pdf-lib";
import { renderToStaticMarkup } from "react-dom/server.edge";
import { QuotationDocument } from "@/components/quotation/QuotationDocument";
import type { QuotationState } from "@/components/quotation/quotation-model";

export type PdfDiagnostic = (event: string, extra?: Record<string, unknown>) => void;
type PdfContext = { started: number; stage: string; emit?: PdfDiagnostic };

function diag(event: string, context: PdfContext, extra: Record<string, unknown> = {}) {
  context.emit?.(event, extra);
}

function fail(context: PdfContext, error: unknown): never {
  const value = error instanceof Error ? error : new Error("Unknown PDF error");
  const safeMessage = value.message.slice(0, 180);
  diag("FAILURE", context, { errorName: value.name, errorMessage: safeMessage, errorCode: safeMessage });
  const failure = new Error("PDF_GENERATION_FAILED");
  failure.cause = value;
  (failure as Error & { stage?: string }).stage = context.stage;
  throw failure;
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
  diag("CHROMIUM_PATH_START", context);
  const pathValue = await executablePath();
  diag("CHROMIUM_PATH_SUCCESS", context, { vercel: Boolean(process.env.VERCEL), configuredPath: Boolean(process.env.PUPPETEER_EXECUTABLE_PATH) });
  context.stage = "browser-launch";
  diag("BROWSER_LAUNCH_START", context);
  const browser = await puppeteer.launch({
    args: process.env.VERCEL ? await puppeteer.defaultArgs({ args: chromium.args, headless: "shell" }) : ["--no-sandbox", "--disable-setuid-sandbox"],
    executablePath: pathValue,
    headless: process.env.VERCEL ? "shell" : true,
    defaultViewport: { width: 794, height: 1123, deviceScaleFactor: 1 },
  });
  diag("BROWSER_LAUNCH_SUCCESS", context);
  return browser;
}

async function waitReady(page: Page, context: PdfContext) {
  context.stage = "render-ready";
  await page.waitForFunction(() => document.documentElement.dataset.pdfReady === "true", { timeout: 15_000 });
  diag("FONTS_READY", context);
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(Array.from(document.images).map(image => image.complete ? Promise.resolve() : new Promise<void>(resolve => {
      image.addEventListener("load", () => resolve(), { once: true });
      image.addEventListener("error", () => resolve(), { once: true });
    })));
  });
  diag("IMAGES_READY", context);
}

async function renderPdf(html: string, context: PdfContext) {
  let browser: Browser | undefined;
  try {
    browser = await launch(context);
    context.stage = "page-create-start";
    diag("PAGE_CREATE_START", context);
    const page = await browser.newPage();
    context.stage = "page-create-success";
    diag("PAGE_CREATE_SUCCESS", context);
    context.stage = "set-content-start";
    diag("SET_CONTENT_START", context, { htmlLength: html.length });
    await page.setContent(html, { waitUntil: "load", timeout: 15_000 });
    context.stage = "set-content-success";
    diag("SET_CONTENT_SUCCESS", context);
    await waitReady(page, context);
    context.stage = "pdf-generation-start";
    diag("PDF_GENERATION_START", context);
    const pdf = await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true, margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" } });
    context.stage = "pdf-generation-success";
    const bytes = Buffer.from(pdf);
    diag("PDF_GENERATION_SUCCESS", context);
    diag("PDF_BYTES", context, { pdfBytes: bytes.length });
    if (bytes.length < 1000 || !bytes.subarray(0, 5).equals(Buffer.from("%PDF-"))) throw new Error("INVALID_PDF_BYTES");
    const pageCount = (await PDFDocument.load(bytes)).getPageCount();
    context.stage = "page-count";
    diag("PAGE_COUNT", context, { expectedPageCount: 4, actualPageCount: pageCount });
    if (pageCount !== 4) throw new Error("PDF_PAGE_COUNT_INVALID");
    diag("VALIDATION_SUCCESS", context, { pageCount });
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

export async function generateQuotationPdf(quotation: QuotationState, origin: string, emit?: PdfDiagnostic) {
  const context: PdfContext = { started: Date.now(), stage: "data-serialization-start", emit };
  try {
    diag("DATA_SERIALIZATION_START", context);
    JSON.stringify(quotation);
    diag("DATA_SERIALIZATION_SUCCESS", context);
    context.stage = "react-render-start";
    diag("REACT_RENDER_START", context);
    const [quotationCss, refinementCss, responsiveCss] = await Promise.all([stylesheet("quotation.css"), stylesheet("quotation-refinement.css"), stylesheet("responsive-print.css")]);
    const markup = renderToStaticMarkup(<QuotationDocument quotation={quotation} />);
    context.stage = "react-render-success";
    diag("REACT_RENDER_SUCCESS", context);
    const html = htmlDocument(pdfCss(quotationCss, refinementCss, responsiveCss), markup, origin);
    diag("HTML_LENGTH", context, { htmlLength: html.length });
    return await renderPdf(html, context);
  } catch (error) { fail(context, error); }
}

export async function runPdfSelfTest() {
  const context: PdfContext = { started: Date.now(), stage: "start" };
  let browser: Browser | undefined;
  try {
    const pathValue = await executablePath();
    browser = await launch(context);
    const page = await browser.newPage();
    await page.setContent(`<style>@page{size:A4;margin:0}html,body{margin:0}</style><body><div data-self-test>STBS PDF SELF TEST</div></body>`, { waitUntil: "load" });
    const pdf = Buffer.from(await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true, margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" } }));
    const pageCount = (await PDFDocument.load(pdf)).getPageCount();
    return { chromiumPath: Boolean(pathValue), browserLaunch: true, pageCreated: true, pdfGenerated: true, pdfBytes: pdf.length, pageCount };
  } finally { await browser?.close().catch(() => undefined); }
}
