"use client";

import { Share2 } from "lucide-react";
import { ShareQuotation } from "@/components/quotation/share/ShareQuotation";
import type { ShareSubject } from "@/components/quotation/share/share-model";
import { company } from "@/lib/company";
import { monthLabel } from "@/lib/worker-ledger";
import { balanceText } from "./BalanceLabel";

/** Fetches a PDF from one of the worker routes, turning a failure into a readable message. */
async function fetchPdf(url: string): Promise<Blob> {
  const response = await fetch(url);
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: unknown } | null;
    throw new Error(typeof body?.error === "string" ? body.error.slice(0, 180) : "The PDF could not be made. Please try again.");
  }
  return response.blob();
}

const base = { company: company.name, signatory: company.name, phones: company.phones.join(" / ") };

/** A worker's statement for the period on screen, through the same share sheet as invoices. */
export function StatementShareButton({ workerId, workerName, phone, period, periodLabel, work, paid, closing }: {
  workerId: string; workerName: string; phone: string | null; period: string; periodLabel: string; work: number; paid: number; closing: number;
}) {
  const subject: ShareSubject = {
    ...base,
    kind: "statement",
    reference: periodLabel,
    clientName: workerName,
    phone: phone ?? undefined,
    statement: { work, paid, balanceText: balanceText(closing) },
  };
  return (
    <ShareQuotation
      subject={subject}
      getPdf={() => fetchPdf(`/api/workers/${encodeURIComponent(workerId)}/statement?period=${encodeURIComponent(period)}`)}
      render={({ open, busy }) => (
        <button type="button" className="a-btn a-btn-secondary a-btn-sm" onClick={open} disabled={busy}><Share2 className="size-4" aria-hidden /> Share PDF</button>
      )}
    />
  );
}

/** Every worker's balance plus the month's work, payments and expenses. */
export function SummaryShareButton({ month }: { month: string }) {
  const subject: ShareSubject = { ...base, kind: "summary", reference: monthLabel(month), clientName: "Workers summary" };
  return (
    <ShareQuotation
      subject={subject}
      getPdf={() => fetchPdf(`/api/workers/summary?month=${encodeURIComponent(month)}`)}
      render={({ open, busy }) => (
        <button type="button" className="a-btn a-btn-secondary" onClick={open} disabled={busy}><Share2 className="size-4" aria-hidden /> Summary PDF</button>
      )}
    />
  );
}
