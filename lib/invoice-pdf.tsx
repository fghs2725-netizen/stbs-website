/**
 * Invoice PDF generation.
 *
 * Reuses the quotation's renderer wholesale — the browser launch, the readiness wait, the byte and
 * page-count validation are all the same job — so a fix to one document's PDF path fixes both. The
 * only differences are the render URL and the root element to wait for.
 *
 * The render token is the quotation's too: it is an HMAC bound to one document id with a two-minute
 * expiry, and an invoice id is a cuid that can never collide with a quotation's.
 */
import { renderPdf, fail, type PdfContext, type PdfDiagnostic } from "@/lib/quotation-pdf";
import { createQuotationRenderToken } from "@/lib/quotation-render-auth";
import { trustedPdfOrigin } from "@/lib/pdf-origin";
import { deploymentContext } from "@/lib/deployment-info";
import { invoicePageCount } from "@/components/invoice/invoice-pagination";
import type { InvoiceState } from "@/components/invoice/invoice-model";
import type { InvoiceSettings } from "@/components/invoice/invoice-settings";

export const INVOICE_PDF_ROOT = "#invoice-pdf-document";

export async function generateInvoicePdf(
  invoice: InvoiceState,
  settings: InvoiceSettings,
  requestOrigin: string,
  emit?: PdfDiagnostic,
) {
  const context: PdfContext = { stage: "render-url", startedAt: Date.now(), emit };
  try {
    if (!invoice.id) throw new Error("PDF_RENDER_INVOICE_ID_MISSING");
    const origin = trustedPdfOrigin(requestOrigin);
    const token = createQuotationRenderToken(invoice.id);
    emit?.("RENDER_URL_CREATED", { originHost: new URL(origin).host, ...deploymentContext() });
    return await renderPdf(
      `${origin}/internal/invoice-pdf/${encodeURIComponent(invoice.id)}?token=${encodeURIComponent(token)}`,
      context,
      invoicePageCount(invoice, settings),
      INVOICE_PDF_ROOT,
    );
  } catch (error) { fail(context, error); }
}
