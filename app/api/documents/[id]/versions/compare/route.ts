import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { VersionControl } from "@/lib/documents/version-control";
import { sanitizeError } from "@/lib/utils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (!from || !to) {
      return NextResponse.json({ error: "Both 'from' and 'to' version IDs are required" }, { status: 400 });
    }

    const diff = await VersionControl.compareVersions(id, from, to);
    return NextResponse.json({ diff });
  } catch (error: unknown) {
    console.error("[Version Compare GET]", error);
    return NextResponse.json({ error: sanitizeError(error) }, { status: 400 });
  }
}
