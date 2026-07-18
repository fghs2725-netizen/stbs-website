import type { QuotationState } from "./quotation-model";

export async function requestQuotationPdf(quotation: QuotationState) {
  const response = await fetch(quotation.id ? `/api/quotations/${encodeURIComponent(quotation.id)}/pdf` : "/api/quotations/new/pdf", {
    method: quotation.id ? "GET" : "POST",
    headers: quotation.id ? undefined : { "Content-Type": "application/json" },
    body: quotation.id ? undefined : JSON.stringify(quotation),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error || "Could not generate PDF.");
  }
  return response.blob();
}

export async function openQuotationPdf(quotation: QuotationState) {
  const pendingWindow = typeof window !== "undefined" ? window.open("about:blank", "_blank") : null;
  const blob = await requestQuotationPdf(quotation);
  const url = URL.createObjectURL(blob);
  if (pendingWindow) pendingWindow.location.href = url;
  else {
    const link = document.createElement("a");
    link.href = url;
    link.download = `${quotation.quotationReference || "quotation"}.pdf`;
    link.click();
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
