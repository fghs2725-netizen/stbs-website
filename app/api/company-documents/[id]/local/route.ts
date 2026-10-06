import { prisma } from "@/lib/prisma";
import { MAX_DOCUMENT_BYTES } from "@/lib/company-documents/shared";
import { writeLocalDocument } from "@/lib/company-documents/storage";
import { completeDocument, DocumentError, documentFailure, documentResponse, requireDocumentAdmin, requireSameOrigin, serializeDocument } from "@/lib/company-documents/server";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireDocumentAdmin(); requireSameOrigin(request);
    if (process.env.VERCEL || process.env.NODE_ENV === "production") throw new DocumentError("Not found.", 404);
    const { id } = await params;
    const row = await prisma.companyDocument.findUnique({ where: { id } });
    if (!row || row.uploadedById !== userId || row.provider !== "local" || row.deletedAt) throw new DocumentError("Upload not found.", 404);
    if (row.status === "READY") return documentResponse({ document: serializeDocument(row) });
    if (Number(request.headers.get("content-length")) > MAX_DOCUMENT_BYTES + 65536) throw new DocumentError("Files must be 20 MB or smaller.");
    const file = (await request.formData()).get("file");
    if (!(file instanceof File) || file.size !== row.size || file.size > MAX_DOCUMENT_BYTES) throw new DocumentError("Invalid file size.");
    try { await writeLocalDocument(row.storageKey, Buffer.from(await file.arrayBuffer())); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error; }
    return documentResponse({ document: serializeDocument(await completeDocument(id)) });
  } catch (error) { return documentFailure(error); }
}
