import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/auth-helpers";
import { decideApproval } from "@/lib/documents/approval-workflow";
import { sanitizeError } from "@/lib/utils";

const VALID_DECISIONS = ["APPROVED", "REJECTED", "REVISION_REQUESTED"] as const;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const admin = requireAdmin(session);
    if (!admin.ok) return admin.response;
    const { session: validSession } = admin;

    const { id } = await params;
    const body = await request.json();

    if (!body.decision || !VALID_DECISIONS.includes(body.decision)) {
      return NextResponse.json({ error: "Invalid decision value" }, { status: 400 });
    }

    const result = await decideApproval({
      approvalRequestId: id,
      decision: body.decision,
      userId: validSession.user.id,
      comment: body.comment,
    });

    return NextResponse.json({ result });
  } catch (error: unknown) {
    console.error("[Approval Decide POST]", error);
    return NextResponse.json({ error: sanitizeError(error) }, { status: 400 });
  }
}
