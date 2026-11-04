import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { documentStorageProvider, writeDocumentObject, deleteDocumentObject } from "@/lib/company-documents/storage";
import { DocumentError, documentFailure, documentResponse, requireDocumentAdmin, requireSameOrigin, serializeDocument } from "@/lib/company-documents/server";
import { financialYearStart, formatLetterNumber, letterFileName, letterSchema, letterSeriesPrefix, nextLetterNumber } from "@/lib/letter";
import { generateLetterPdf } from "@/lib/letter-pdf";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/** Writes a letter on the letterhead, numbers it STBS/LTR/{FY}/NNN and saves the PDF to the library under Letters. */
export async function POST(request: Request) {
  try {
    const userId = await requireDocumentAdmin();
    requireSameOrigin(request);
    const input = letterSchema.parse(await request.json());
    let provider: "blob" | "local";
    try { provider = documentStorageProvider(); } catch { throw new DocumentError("Private document storage has not been configured.", 503); }

    // The number is read from the letters already saved; the title starts with it. Deleted letters
    // still count, so a number is never handed out twice.
    const fy = financialYearStart(input.date);
    const taken = await prisma.companyDocument.findMany({
      where: { category: "Letters", title: { startsWith: letterSeriesPrefix(fy) } }, select: { title: true },
    });
    const letter = { ...input, reference: formatLetterNumber(fy, nextLetterNumber(taken.map((t) => t.title), fy)) };

    let pdf: Buffer;
    try { pdf = Buffer.from(await generateLetterPdf(letter, new URL(request.url).origin)); }
    catch (error) { console.error("LETTER_PDF_FAILURE", error instanceof Error ? error.message : error); throw new DocumentError("The letter could not be made. Please try again.", 502); }
    const key = `company-documents/${randomUUID()}.pdf`;
    await writeDocumentObject(provider, key, pdf);
    try {
      const row = await prisma.companyDocument.create({ data: {
        title: `${letter.reference} - ${letter.subject}`.slice(0, 150), category: "Letters",
        originalName: letterFileName(letter), mimeType: "application/pdf", size: pdf.length, provider, storageKey: key,
        uploadedById: userId, status: "READY",
      } });
      return documentResponse({ document: serializeDocument(row), reference: letter.reference }, 201);
    } catch (error) { await deleteDocumentObject(provider, key).catch(() => undefined); throw error; }
  } catch (error) { return documentFailure(error); }
}
