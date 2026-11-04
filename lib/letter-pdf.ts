/**
 * Letter and blank-letterpad PDFs, through the quotation's renderer. The render URL carries the letter
 * itself (base64url JSON) with a short-lived token bound to exactly those bytes, as the bank letter does,
 * so the render page needs no database and can print nothing it was not given.
 */
import { createHash } from "node:crypto";
import { renderPdf, fail, type PdfContext } from "@/lib/quotation-pdf";
import { createQuotationRenderToken } from "@/lib/quotation-render-auth";
import { trustedPdfOrigin } from "@/lib/pdf-origin";
import { letterPageCount, letterSchema, type LetterDetails } from "@/lib/letter";

export const LETTER_ROOT = "#letter-document";
export const BLANK = "blank";
export const encodeLetter = (l: LetterDetails) => Buffer.from(JSON.stringify(l)).toString("base64url");
export const decodeLetter = (data: string): LetterDetails | null => {
  try { return letterSchema.parse(JSON.parse(Buffer.from(data, "base64url").toString("utf8"))); } catch { return null; }
};
export const letterBinding = (data: string) => `letter:${createHash("sha256").update(data).digest("hex")}`;

/** `letter` null makes the blank letterpad. */
export async function generateLetterPdf(letter: LetterDetails | null, requestOrigin: string) {
  const context: PdfContext = { stage: "render-url", startedAt: Date.now() };
  try {
    const origin = trustedPdfOrigin(requestOrigin);
    const data = letter ? encodeLetter(letter) : BLANK;
    const token = createQuotationRenderToken(letterBinding(data));
    return await renderPdf(
      `${origin}/internal/letter?d=${encodeURIComponent(data)}&token=${encodeURIComponent(token)}`,
      context,
      letter ? letterPageCount(letter) : 1,
      LETTER_ROOT,
    );
  } catch (error) { fail(context, error); }
}
