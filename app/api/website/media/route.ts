import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { storage } from "@/lib/storage/storage-service";

/**
 * Delete a website media object (gallery photo, client logo, hero banner,
 * favicon asset) by its public URL.
 *
 * Removes the underlying blob object and soft-deletes the StorageFile record
 * so no orphaned blobs are left behind. Admin only.
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as { url?: unknown } | null;
    if (!body || typeof body.url !== "string" || !body.url.trim()) {
      return NextResponse.json({ error: "Missing 'url' in request body" }, { status: 400 });
    }

    const result = await storage.deleteUrl(body.url.trim());
    if (!result.success) {
      return NextResponse.json({ error: result.error || "Delete failed" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Website Media Delete]", error);
    return NextResponse.json(
      { error: "Delete failed. Please try again." },
      { status: 500 }
    );
  }
}