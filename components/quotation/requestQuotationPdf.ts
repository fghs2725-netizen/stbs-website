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
