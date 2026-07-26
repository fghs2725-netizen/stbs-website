import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { VersionControl } from "@/lib/documents/version-control";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const versions = await VersionControl.getVersions(id);

    const history = versions.map((v) => ({
      id: v.id,
      versionNumber: v.versionNumber,
      changeNote: v.changeNote,
      createdBy: v.createdBy,
      createdAt: v.createdAt,
      hasSnapshot: !!v.snapshot,
      snapshotSize: v.snapshot ? JSON.stringify(v.snapshot).length : 0,
      itemCount: Array.isArray((v.snapshot as any)?.items) ? (v.snapshot as any).items.length : 0,
      sectionCount: Array.isArray((v.snapshot as any)?.sections) ? (v.snapshot as any).sections.length : 0,
    }));

    return NextResponse.json({ history });
  } catch (error) {
    console.error("[Version History GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
