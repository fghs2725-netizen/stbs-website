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
    return NextResponse.json({ versions });
  } catch (error) {
    console.error("[Versions GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
