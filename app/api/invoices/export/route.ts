import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { buildInvoiceExport } from "@/lib/invoice-export";
import type { InvoiceFilter } from "@/lib/invoice-management";

function filterFrom(q: URLSearchParams): InvoiceFilter {
  const kind = q.get("kind"), ca = q.get("ca");
  return {
    search: q.get("q") ?? undefined, status: q.get("status") ?? undefined, month: q.get("month") ?? undefined,
    from: q.get("from") ?? undefined, to: q.get("to") ?? undefined,
    kind: kind === "final" || kind === "cash" || kind === "draft" ? kind : undefined,
    ca: ca === "sent" || ca === "unsent" ? ca : undefined,
  };
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Invoices as an Excel workbook. With no query, every invoice (Analytics' Download button). With
 * `ids`, the bills selected in the list; with the list's own filter parameters, every bill they match.
 */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const q = new URL(request.url).searchParams;
    const ids = (q.get("ids") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    const filtered = ["q", "status", "month", "kind", "ca", "from", "to"].some((k) => q.get(k));
    const file = await buildInvoiceExport(new Date(), ids.length ? { ids } : filtered ? { filter: filterFrom(q) } : {});
    const stamp = new Date().toISOString().slice(0, 10);
    return new Response(new Uint8Array(file), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="STBS-Invoices-${stamp}.xlsx"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("INVOICE_EXPORT_FAILURE", error instanceof Error ? error.message.slice(0, 160) : "UNKNOWN");
    return NextResponse.json({ error: "The invoice export failed. Please try again." }, { status: 500 });
  }
}
