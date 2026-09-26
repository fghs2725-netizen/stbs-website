import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { generateWorkersSummaryPdf, isMonth } from "@/lib/worker-pdf";
import { monthLabel } from "@/lib/worker-ledger";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const month = new URL(request.url).searchParams.get("month");
  if (!isMonth(month)) return NextResponse.json({ error: "Unknown month" }, { status: 400 });
  try {
    const pdf = await generateWorkersSummaryPdf(month, new URL(request.url).origin);
    return new Response(pdf, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="Workers summary - ${monthLabel(month)}.pdf"`, "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("WORKERS_SUMMARY_PDF_FAILURE", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "The summary PDF could not be made. Please try again." }, { status: 500 });
  }
}
