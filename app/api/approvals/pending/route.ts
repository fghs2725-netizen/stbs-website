import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getPendingApprovals } from "@/lib/documents/approval-workflow";

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const pendingApprovals = await getPendingApprovals();
    return NextResponse.json({ pendingApprovals });
  } catch (error) {
    console.error("[Pending Approvals GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
