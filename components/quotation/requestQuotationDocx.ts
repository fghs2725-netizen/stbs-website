import { quotationFilename } from "@/lib/quotation-filename";
import type { QuotationState } from "./quotation-model";

/** Downloads the editable Word version of a SAVED quotation. Throws an Error with a readable message on failure. */
export async function downloadQuotationDocx(quotation: QuotationState): Promise<string> {
  if (!quotation.id) throw new Error("Save the quotation first, then export it to Word.");
  const response = await fetch(`/api/quotations/${encodeURIComponent(quotation.id)}/docx`);
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: unknown } | null;
    throw new Error(typeof body?.error === "string" ? body.error.slice(0, 200) : "Word export failed. Please try again.");
  }
  const blob = await response.blob();
  const header = response.headers.get("Content-Disposition") ?? "";
  const filename = /filename="([^"]+)"/.exec(header)?.[1] ?? quotationFilename(quotation, "docx");
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return filename;
}
