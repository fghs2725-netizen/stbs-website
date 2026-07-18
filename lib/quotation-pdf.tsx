import fs from "node:fs/promises";
import path from "node:path";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import { PDFDocument } from "pdf-lib";
import { renderToStaticMarkup } from "react-dom/server.edge";
import { QuotationDocument } from "@/components/quotation/QuotationDocument";
import type { QuotationState } from "@/components/quotation/quotation-model";

const LOCAL_CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

async function stylesheet(name: string) {
  return fs.readFile(path.join(process.cwd(), "components", "quotation", name), "utf8");
}

async function executablePath() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) return process.env.PUPPETEER_EXECUTABLE_PATH;
  if (!process.env.VERCEL) {
    try { await fs.access(LOCAL_CHROME); return LOCAL_CHROME; } catch { /* use packaged Chromium below */ }
  }
  return chromium.executablePath();
}

export async function generateQuotationPdf(quotation: QuotationState, origin: string) {
  const [quotationCss, refinementCss, responsiveCss] = await Promise.all([
    stylesheet("quotation.css"),
    stylesheet("quotation-refinement.css"),
    stylesheet("responsive-print.css"),
  ]);
  const markup = renderToStaticMarkup(<QuotationDocument quotation={quotation} />);
  const html = `<!doctype html><html><head><meta charset="utf-8"><base href="${origin}/"><style>
    ${quotationCss}\n${refinementCss}\n${responsiveCss}
    @font-face{font-family:Inter;src:url('/fonts/inter-latin-400.woff2') format('woff2');font-weight:400}
    @font-face{font-family:Inter;src:url('/fonts/inter-latin-600.woff2') format('woff2');font-weight:600}
    *{box-sizing:border-box}html,body{margin:0;padding:0;width:210mm;background:#fff}
    .quotation-print-root{display:block!important;width:210mm!important;margin:0!important;padding:0!important;background:#fff}
    .quotation-print-root .q-document{display:block!important;width:210mm!important;margin:0!important;padding:0!important;gap:0!important}
    .quotation-print-root .q-page{display:block!important;width:210mm!important;height:297mm!important;min-height:0!important;max-height:297mm!important;box-sizing:border-box!important;margin:0!important;padding:0!important;overflow:hidden!important;break-inside:avoid!important;page-break-inside:avoid!important;break-after:page!important;page-break-after:auto!important;background:#f5f0e7!important;box-shadow:none!important}
    .quotation-print-root .q-page:last-child{break-after:auto!important;page-break-after:auto!important}
    @page{size:A4 portrait;margin:0}
    @media print{html,body{margin:0!important;padding:0!important;width:210mm!important;background:#fff!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}}
  </style></head><body><div class="quotation-print-root">${markup}</div></body></html>`;

  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath: await executablePath(),
    headless: true,
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: "load" });
    await page.waitForNetworkIdle({ idleTime: 500, timeout: 15_000 }).catch(() => undefined);
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all(Array.from(document.images).map(image => image.complete ? Promise.resolve() : new Promise<void>(resolve => {
        image.addEventListener("load", () => resolve(), { once: true });
        image.addEventListener("error", () => resolve(), { once: true });
      })));
    });
    const pdf = await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true, margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" } });
    const pageCount = (await PDFDocument.load(pdf)).getPageCount();
    if (pageCount !== 4) throw new Error(`PDF_PAGE_COUNT_${pageCount}`);
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
