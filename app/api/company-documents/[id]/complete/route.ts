import { prisma } from "@/lib/prisma";
import { completeDocument, DocumentError, documentFailure, documentResponse, requireDocumentAdmin, requireSameOrigin, serializeDocument } from "@/lib/company-documents/server";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireDocumentAdmin(); requireSameOrigin(request);
    const { id } = await params;
    const row = await prisma.companyDocument.findUnique({ where: { id } });
    if (!row || row.uploadedById !== userId) throw new DocumentError("Upload not found.", 404);
    return documentResponse({ document: serializeDocument(await completeDocument(id)) });
  } catch (error) { return documentFailure(error); }
}
