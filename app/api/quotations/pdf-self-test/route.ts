import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { runPdfSelfTest } from "@/lib/quotation-pdf";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET() {
  if (process.env.VERCEL_ENV === "production") return NextResponse.json({ error: "Not available" }, { status: 404 });
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const browser = await runPdfSelfTest();
    return NextResponse.json(browser);
  }
  catch { return NextResponse.json({ error: "PDF self-test failed." }, { status: 500 }); }
}
