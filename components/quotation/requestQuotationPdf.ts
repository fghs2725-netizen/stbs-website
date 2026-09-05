import type { QuotationState } from "./quotation-model";

export function pdfFailureMessage(error: unknown) {
  if (error instanceof Error && error.message.startsWith("PDF generation failed at stage:")) return error.message;
  if (error instanceof Error && error.name === "AbortError") return "PDF share cancelled.";
  return "PDF generation failed. Please try again.";
}

export type PdfAction = "share" | "open" | "download";

const PDF_ACTION_MESSAGES = {
  share: "PDF ready. Choose Save to Files or your preferred app from the share menu.",
  open: "PDF opened in a new tab. Use the Share button (box with arrow) to save it to Files.",
  download: "PDF download started.",
} as const;

const SUCCESS_MESSAGES: readonly string[] = Object.values(PDF_ACTION_MESSAGES);

export function isPdfSuccessMessage(message: string) {
  return SUCCESS_MESSAGES.includes(message);
}

export function pdfActionMessage(action: PdfAction) {
  return PDF_ACTION_MESSAGES[action];
}

function isIOS() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
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

export async function openQuotationPdf(quotation: QuotationState): Promise<PdfAction> {
  const blob = await requestQuotationPdf(quotation);
  if (blob.type && !blob.type.toLowerCase().includes("application/pdf")) throw new Error("PDF generation failed.");
  const base = (quotation.quotationReference || "quotation").replace(/[^a-zA-Z0-9_-]/g, "_");
  const filename = `${base}.pdf`;
  const url = URL.createObjectURL(blob);
  try {
    const file = new File([blob], filename, { type: "application/pdf" });
    if (typeof navigator !== "undefined" && navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: base });
      return "share";
    }
    if (isIOS()) {
      if (!window.open(url, "_blank", "noopener")) window.location.href = url;
      return "open";
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw error;
    if (isIOS()) {
      if (!window.open(url, "_blank", "noopener")) window.location.href = url;
      return "open";
    }
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  return "download";
}