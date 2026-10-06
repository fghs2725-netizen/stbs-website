import { createHash } from "node:crypto";
import { renderPdf, fail, type PdfContext } from "@/lib/quotation-pdf";
import { createQuotationRenderToken } from "@/lib/quotation-render-auth";
import { trustedPdfOrigin } from "@/lib/pdf-origin";
import { bankLetterSchema, type BankLetterDetails } from "./shared";

export const BANK_LETTER_ROOT = "#bank-letter-document";
export const encodeBankLetter = (details: BankLetterDetails) => Buffer.from(JSON.stringify(details)).toString("base64url");
export const decodeBankLetter = (data: string): BankLetterDetails | null => {
  try { return bankLetterSchema.parse(JSON.parse(Buffer.from(data, "base64url").toString("utf8"))); } catch { return null; }
};
/** The render token covers exactly these details, so it cannot print anything else. */
export const bankLetterBinding = (data: string) => `bank-letter:${createHash("sha256").update(data).digest("hex")}`;

export async function generateBankLetterPdf(details: BankLetterDetails, requestOrigin: string) {
  const context: PdfContext = { stage: "render-url", startedAt: Date.now() };
  try {
    const origin = trustedPdfOrigin(requestOrigin);
    const data = encodeBankLetter(details);
    const token = createQuotationRenderToken(bankLetterBinding(data));
    return await renderPdf(`${origin}/internal/bank-letter?d=${encodeURIComponent(data)}&token=${encodeURIComponent(token)}`, context, null, BANK_LETTER_ROOT);
  } catch (error) { fail(context, error); }
}
