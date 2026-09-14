import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage/storage-service";

/**
 * Public streaming route for website-hosted media.
 *
 * Security: only files registered as website images (entityType "website" and
 * image/* MIME) are served without authentication. Quotation documents and
 * other privileged uploads are never exposed through this route.
 */
export const dynamic = "force-dynamic";

async function isPublicWebsiteMedia(key: string): Promise<boolean> {
  if (!key || key.includes("..") || key.includes("\\")) return false;
  const file = await prisma.storageFile.findUnique({ where: { key } });
  if (!file || file.deletedAt) return false;
  return file.entityType === "website" && (file.mimeType ?? "").startsWith("image/");
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  try {
    const segments = (await params).key ?? [];
    const key = segments.map(decodeURIComponent).join("/");
    if (!key.startsWith("website/") || !(await isPublicWebsiteMedia(key))) {
      return new Response("Not Found", { status: 404 });
    }

    const obj = await storage.getObject(key);
    if (!obj) return new Response("Not Found", { status: 404 });

    return new Response(new Uint8Array(obj.body), {
      headers: {
        "Content-Type": obj.contentType,
        "Content-Length": String(obj.body.length),
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("[Storage Local]", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}