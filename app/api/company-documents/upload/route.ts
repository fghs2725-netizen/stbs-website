import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { prisma } from "@/lib/prisma";
import { privateBlobToken } from "@/lib/company-documents/storage";
import { completeDocument, DocumentError, documentFailure, documentResponse, requireDocumentAdmin, requireSameOrigin } from "@/lib/company-documents/server";

export async function POST(request: Request) {
  try {
    const body = await request.json() as HandleUploadBody;
    if (body?.type !== "blob.upload-completed") {
      await requireDocumentAdmin();
      requireSameOrigin(request);
    }
    // Blob completion callbacks are authenticated by handleUpload's signature check,
    // not a browser session. Only token issuance may use a browser session.
    const result = await handleUpload({
      body, request, token: privateBlobToken(),
      onBeforeGenerateToken: async (pathname, payload) => {
        const userId = await requireDocumentAdmin();
        requireSameOrigin(request);
        const row = await prisma.companyDocument.findUnique({ where: { id: payload || "" } });
        if (!row || row.uploadedById !== userId || row.storageKey !== pathname || row.provider !== "blob" || row.status !== "PENDING" || row.deletedAt || row.createdAt.getTime() < Date.now() - 3600000) throw new DocumentError("Upload is unavailable.", 403);
        return { allowedContentTypes: [row.mimeType], maximumSizeInBytes: row.size, addRandomSuffix: false, allowOverwrite: false, validUntil: Date.now() + 10 * 60 * 1000, tokenPayload: row.id };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        const row = await prisma.companyDocument.findUnique({ where: { id: tokenPayload || "" } });
        if (!row) return;
        if (blob.pathname !== row.storageKey) throw new DocumentError("Invalid upload.");
        try { await completeDocument(row.id); }
        catch (error) { if (!(error instanceof DocumentError)) throw error; }
      },
    });
    return documentResponse(result);
  } catch (error) { return documentFailure(error); }
}
