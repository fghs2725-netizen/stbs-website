import { prisma } from "@/lib/prisma";
import { documentMetadataSchema } from "@/lib/company-documents/shared";
import { deleteDocumentObject } from "@/lib/company-documents/storage";
import { DocumentError, documentFailure, documentResponse, requireDocumentAdmin, requireSameOrigin, serializeDocument } from "@/lib/company-documents/server";

type Context = { params: Promise<{ id: string }> };
export async function PATCH(request: Request, context: Context) {
  try {
    await requireDocumentAdmin(); requireSameOrigin(request);
    const { id } = await context.params;
    const input = documentMetadataSchema.parse(await request.json());
    const result = await prisma.companyDocument.updateMany({ where: { id, status: "READY", deletedAt: null }, data: input });
    if (!result.count) throw new DocumentError("Document not found.", 404);
    const row = await prisma.companyDocument.findUniqueOrThrow({ where: { id } });
    return documentResponse({ document: serializeDocument(row) });
  } catch (error) { return documentFailure(error); }
}
export async function DELETE(request: Request, context: Context) {
  try {
    await requireDocumentAdmin(); requireSameOrigin(request);
    const { id } = await context.params;
    const row = await prisma.companyDocument.findUnique({ where: { id } });
    if (!row) return documentResponse({ success: true });
    // Hide first: if storage deletion fails, reads still fail closed and DELETE can retry.
    await prisma.companyDocument.update({ where: { id }, data: { status: "DELETED", deletedAt: row.deletedAt || new Date() } });
    await deleteDocumentObject(row.provider, row.storageKey);
    return documentResponse({ success: true });
  } catch (error) { return documentFailure(error); }
}
