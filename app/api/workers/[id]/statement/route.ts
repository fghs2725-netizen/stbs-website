import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getWorker } from "@/lib/worker-management";
import { generateWorkerStatementPdf, isPeriod } from "@/lib/worker-pdf";
import { monthLabel } from "@/lib/worker-ledger";
import { sanitizeFileBase } from "@/components/quotation/share/share-model";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const period = new URL(request.url).searchParams.get("period") ?? "all";
  if (!isPeriod(period)) return NextResponse.json({ error: "Unknown period" }, { status: 400 });
  const worker = await getWorker(id);
  if (!worker) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    const pdf = await generateWorkerStatementPdf(id, period, new URL(request.url).origin, (event, extra) => console.log(`WORKER_PDF_${event}`, JSON.stringify(extra ?? {})));
    const name = sanitizeFileBase(`${worker.name} - Statement - ${period === "all" ? "All time" : monthLabel(period)}`, "Statement");
    return new Response(pdf, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${name}.pdf"`, "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("WORKER_PDF_FAILURE", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "The statement PDF could not be made. Please try again." }, { status: 500 });
  }
}
