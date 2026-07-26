import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { submitForApproval, getApprovalHistory } from "@/lib/documents/approval-workflow";
import { sanitizeError } from "@/lib/utils";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const history = await getApprovalHistory(id);
    return NextResponse.json({ history });
  } catch (error) {
    console.error("[Approval History GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const approvalRequest = await submitForApproval({
      documentId: id,
      userId: session.user.id,
      note: body.note,
    });

    return NextResponse.json({ approvalRequest }, { status: 201 });
  } catch (error: unknown) {
    console.error("[Approval Submit POST]", error);
    return NextResponse.json(
      { error: sanitizeError(error) },
      { status: 400 }
    );
  }
}
