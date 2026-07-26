import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { markAsRead, deleteNotification } from "@/lib/notifications";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    await markAsRead(id, session.user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Notification mark-read]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    await deleteNotification(id, session.user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Notification delete]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
