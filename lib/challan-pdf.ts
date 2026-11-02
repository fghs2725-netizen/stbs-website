/**
 * Delivery challan PDF. The quotation's renderer does the work (browser launch, readiness wait,
 * byte and page-count checks); only the render URL differs. The render token is the quotation's too:
 * an HMAC bound to one id with a two-minute expiry.
 */
import { renderPdf, fail, type PdfContext, type PdfDiagnostic } from "@/lib/quotation-pdf";
import { createQuotationRenderToken } from "@/lib/quotation-render-auth";
import { trustedPdfOrigin } from "@/lib/pdf-origin";
import { deploymentContext } from "@/lib/deployment-info";
import { challanPageCount, type ChallanState } from "@/lib/challan";

export const CHALLAN_PDF_ROOT = "#challan-pdf-document";

export async function generateChallanPdf(challan: ChallanState, requestOrigin: string, emit?: PdfDiagnostic) {
  const context: PdfContext = { stage: "render-url", startedAt: Date.now(), emit };
  try {
    if (!challan.id) throw new Error("PDF_RENDER_CHALLAN_ID_MISSING");
    const origin = trustedPdfOrigin(requestOrigin);
    const token = createQuotationRenderToken(challan.id);
    emit?.("RENDER_URL_CREATED", { originHost: new URL(origin).host, ...deploymentContext() });
    return await renderPdf(
      `${origin}/internal/challan-pdf/${encodeURIComponent(challan.id)}?token=${encodeURIComponent(token)}`,
      context,
      challanPageCount(challan),
      CHALLAN_PDF_ROOT,
    );
  } catch (error) { fail(context, error); }
}

/** STBS-Challan-0001-client-name.pdf, or a draft's equivalent. */
export function challanFilename(c: Pick<ChallanState, "reference" | "client">): string {
  const num = c.reference ? c.reference.split("/").pop() : "Draft";
  const slug = c.client.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "client";
  return `STBS-Challan-${num}-${slug}.pdf`;
}
