import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getApprovalRules, createApprovalRule } from "@/lib/documents/approval-workflow";
import { sanitizeError } from "@/lib/utils";

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rules = await getApprovalRules();
    return NextResponse.json({ rules });
  } catch (error) {
    console.error("[Approval Rules GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    if (!body.name || !body.documentType) {
      return NextResponse.json({ error: "Name and documentType are required" }, { status: 400 });
    }

    const rule = await createApprovalRule({
      name: body.name,
      documentType: body.documentType,
      minApprovers: body.minApprovers,
      roleRequired: body.roleRequired,
      steps: Array.isArray(body.steps) ? body.steps.slice(0, 10) : undefined,
    });

    return NextResponse.json({ rule }, { status: 201 });
  } catch (error: unknown) {
    console.error("[Approval Rules POST]", error);
    return NextResponse.json({ error: sanitizeError(error) }, { status: 400 });
  }
}
