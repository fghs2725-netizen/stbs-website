import type { QuotationState } from "./quotation-model";

export function pdfFailureMessage(error: unknown) {
  return error instanceof Error && error.message.startsWith("PDF generation failed at stage:")
    ? error.message
    : "PDF generation failed. Please try again.";
}

export async function requestQuotationPdf(quotation: QuotationState) {
  const response = await fetch(quotation.id ? `/api/quotations/${encodeURIComponent(quotation.id)}/pdf` : "/api/quotations/new/pdf", {
    method: quotation.id ? "GET" : "POST",
    headers: quotation.id ? undefined : { "Content-Type": "application/json" },
    body: quotation.id ? undefined : JSON.stringify(quotation),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: unknown; stage?: unknown } | null;
    const safeError = typeof body?.error === "string" ? body.error.slice(0, 180) : "PDF generation failed. Please try again.";
    const safeStage = typeof body?.stage === "string" ? body.stage.slice(0, 80) : undefined;
    if (safeStage) console.error("PDF_REQUEST_FAILURE", { status: response.status, error: safeError, stage: safeStage });
    throw new Error(safeError);
  }
  return response.blob();
}

export async function openQuotationPdf(quotation: QuotationState) {
  const blob = await requestQuotationPdf(quotation);
  if (blob.type && !blob.type.toLowerCase().includes("application/pdf")) throw new Error("PDF generation failed.");
  const url = URL.createObjectURL(blob);
  const filename = `${(quotation.quotationReference || "quotation").replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`;
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
