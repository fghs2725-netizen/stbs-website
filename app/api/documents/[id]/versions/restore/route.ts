import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { VersionControl } from "@/lib/documents/version-control";
import { sanitizeError } from "@/lib/utils";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await request.json();

    if (!body.versionId) {
      return NextResponse.json({ error: "versionId is required" }, { status: 400 });
    }

    await VersionControl.restoreVersion(id, body.versionId, session.user.id);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("[Version Restore POST]", error);
    return NextResponse.json({ error: sanitizeError(error) }, { status: 400 });
  }
}
