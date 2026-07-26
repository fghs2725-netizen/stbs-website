import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { cancelApproval } from "@/lib/documents/approval-workflow";
import { sanitizeError } from "@/lib/utils";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    await cancelApproval(id, session.user.id);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("[Approval Cancel POST]", error);
    return NextResponse.json({ error: sanitizeError(error) }, { status: 400 });
  }
}
