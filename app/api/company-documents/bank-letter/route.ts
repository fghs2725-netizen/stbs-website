import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { bankLetterSchema } from "@/lib/company-documents/shared";
import { documentStorageProvider, writeDocumentObject, deleteDocumentObject } from "@/lib/company-documents/storage";
import { generateBankLetterPdf } from "@/lib/company-documents/bank-letter";
import { DocumentError, documentFailure, documentResponse, requireDocumentAdmin, requireSameOrigin, serializeDocument } from "@/lib/company-documents/server";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const userId = await requireDocumentAdmin();
    requireSameOrigin(request);
    const details = bankLetterSchema.parse(await request.json());
    let provider: "blob" | "local";
    try { provider = documentStorageProvider(); } catch { throw new DocumentError("Private document storage has not been configured.", 503); }
    let pdf: Buffer;
    try { pdf = Buffer.from(await generateBankLetterPdf(details, new URL(request.url).origin)); }
    catch (error) { console.error("BANK_LETTER_PDF_FAILURE", error instanceof Error ? error.message : error); throw new DocumentError("The letter could not be made. Please try again.", 502); }
    const key = `company-documents/${randomUUID()}.pdf`;
    await writeDocumentObject(provider, key, pdf);
    try {
      const row = await prisma.companyDocument.create({ data: {
        title: `Bank details letter - ${details.bankName}`.slice(0, 150), category: "Bank Details",
        originalName: `STBS Bank Details - ${details.bankName}.pdf`.replace(/[\\/\x00-\x1f<>:"|?*]/g, "_").slice(0, 255),
        mimeType: "application/pdf", size: pdf.length, provider, storageKey: key, uploadedById: userId, status: "READY",
      } });
      return documentResponse({ document: serializeDocument(row) }, 201);
    } catch (error) { await deleteDocumentObject(provider, key).catch(() => undefined); throw error; }
  } catch (error) { return documentFailure(error); }
}
