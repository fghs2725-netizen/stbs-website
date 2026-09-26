import { renderPdf, fail, type PdfContext, type PdfDiagnostic } from "@/lib/quotation-pdf";
import { createQuotationRenderToken } from "@/lib/quotation-render-auth";
import { trustedPdfOrigin } from "@/lib/pdf-origin";
import { deploymentContext } from "@/lib/deployment-info";

/**
 * Worker statements and the workers summary, rendered by the same Chromium path as invoices. The render
 * token is bound to exactly what is printed (the worker and period, or the month), so a token for one
 * statement cannot print another. Statements run to any length, so no page count is enforced.
 */

export const WORKER_PDF_ROOT = "#worker-pdf-document";

/** "all" or YYYY-MM. */
export const isPeriod = (p: unknown): p is string => p === "all" || (typeof p === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(p));
export const isMonth = (m: unknown): m is string => typeof m === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(m);

export const statementBinding = (workerId: string, period: string) => `worker-statement:${workerId}:${period}`;
export const summaryBinding = (month: string) => `workers-summary:${month}`;

export async function generateWorkerStatementPdf(workerId: string, period: string, requestOrigin: string, emit?: PdfDiagnostic) {
  const context: PdfContext = { stage: "render-url", startedAt: Date.now(), emit };
  try {
    const origin = trustedPdfOrigin(requestOrigin);
    const token = createQuotationRenderToken(statementBinding(workerId, period));
    emit?.("RENDER_URL_CREATED", { originHost: new URL(origin).host, ...deploymentContext() });
    return await renderPdf(
      `${origin}/internal/worker-statement/${encodeURIComponent(workerId)}?period=${encodeURIComponent(period)}&token=${encodeURIComponent(token)}`,
      context, null, WORKER_PDF_ROOT,
    );
  } catch (error) { fail(context, error); }
}

export async function generateWorkersSummaryPdf(month: string, requestOrigin: string, emit?: PdfDiagnostic) {
  const context: PdfContext = { stage: "render-url", startedAt: Date.now(), emit };
  try {
    const origin = trustedPdfOrigin(requestOrigin);
    const token = createQuotationRenderToken(summaryBinding(month));
    return await renderPdf(
      `${origin}/internal/workers-summary?month=${encodeURIComponent(month)}&token=${encodeURIComponent(token)}`,
      context, null, WORKER_PDF_ROOT,
    );
  } catch (error) { fail(context, error); }
}
