import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** How many website enquiries are still unopened, for the badge on the phone's More tab. */
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const count = await prisma.enquiry.count({ where: { readAt: null } });
  return NextResponse.json({ count }, { headers: { "Cache-Control": "private, no-store" } });
}
