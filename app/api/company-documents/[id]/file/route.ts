import { prisma } from "@/lib/prisma";
import { previewable, uniqueDocumentNames } from "@/lib/company-documents/shared";
import { readDocumentObject } from "@/lib/company-documents/storage";
import { DocumentError, documentFailure, requireDocumentAdmin } from "@/lib/company-documents/server";

export const dynamic = "force-dynamic";
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireDocumentAdmin();
    const { id } = await params;
    const row = await prisma.companyDocument.findFirst({ where: { id, status: "READY", deletedAt: null } });
    if (!row) throw new DocumentError("Document not found.", 404);
    const stream = await readDocumentObject(row.provider, row.storageKey);
    if (!stream) throw new DocumentError("Document file not found.", 404);
    const inline = new URL(request.url).searchParams.get("preview") === "1" && previewable(row.mimeType);
    const filename = uniqueDocumentNames([row.originalName])[0];
    const encodedName = encodeURIComponent(filename).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
    return new Response(stream, { headers: {
      "Content-Type": row.mimeType, "Content-Length": String(row.size),
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${filename.replace(/[^\x20-\x7e]/g, "_")}"; filename*=UTF-8''${encodedName}`,
      "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "sandbox", "Referrer-Policy": "no-referrer",
    } });
  } catch (error) { return documentFailure(error); }
}
