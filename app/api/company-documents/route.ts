import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { documentMime, documentUploadSchema } from "@/lib/company-documents/shared";
import { documentStorageProvider } from "@/lib/company-documents/storage";
import { cleanupDocuments, DocumentError, documentFailure, documentResponse, requireDocumentAdmin, requireSameOrigin, serializeDocument } from "@/lib/company-documents/server";

export const dynamic = "force-dynamic";
export async function GET() {
  try {
    await requireDocumentAdmin();
    await cleanupDocuments().catch(() => console.error("[company-documents] Cleanup will retry on next visit."));
    const rows = await prisma.companyDocument.findMany({ where: { status: "READY", deletedAt: null }, orderBy: { createdAt: "desc" } });
    let storageReady = true;
    try { documentStorageProvider(); } catch { storageReady = false; }
    return documentResponse({ documents: rows.map(serializeDocument), storageReady });
  } catch (error) { return documentFailure(error); }
}
export async function POST(request: Request) {
  try {
    const userId = await requireDocumentAdmin();
    requireSameOrigin(request);
    const input = documentUploadSchema.parse(await request.json());
    const mimeType = documentMime(input.originalName);
    if (!mimeType) throw new DocumentError("Choose a PDF, image, Word, Excel, or CSV file.");
    let provider: "blob" | "local";
    try { provider = documentStorageProvider(); } catch { throw new DocumentError("Private document storage has not been configured.", 503); }
    const extension = input.originalName.split(".").pop()!.toLowerCase();
    const row = await prisma.companyDocument.create({ data: { ...input, mimeType, provider, storageKey: `company-documents/${randomUUID()}.${extension}`, uploadedById: userId } });
    return documentResponse({ id: row.id, pathname: row.storageKey, provider, mimeType }, 201);
  } catch (error) { return documentFailure(error); }
}
