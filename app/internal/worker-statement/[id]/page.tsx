import { notFound } from "next/navigation";
import { verifyQuotationRenderToken } from "@/lib/quotation-render-auth";
import { getWorkerForRender } from "@/lib/worker-management";
import { isPeriod, statementBinding } from "@/lib/worker-pdf";
import { formatRupees, monthLabel, monthRange, statementFor } from "@/lib/worker-ledger";
import { balanceText } from "@/components/admin/workers/BalanceLabel";
import { StatementFrame } from "@/components/admin/workers/StatementDocument";

export const dynamic = "force-dynamic";

const day = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

// Reached only by the PDF renderer, with a short-lived token bound to this worker and period.
export default async function WorkerStatementRender({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ period?: string; token?: string }> }) {
  const { id } = await params;
  const { period, token } = await searchParams;
  if (!isPeriod(period) || !verifyQuotationRenderToken(token, statementBinding(id, period))) notFound();
  const worker = await getWorkerForRender(id);
  if (!worker) notFound();

  const range = period === "all" ? { from: null, to: null } : monthRange(period);
  const s = statementFor(worker.openingBalance, worker.entries, range.from, range.to);
  const tone = s.closing > 0 ? "ws-to-pay" : s.closing < 0 ? "ws-advance" : "";

  return (
    <StatementFrame
      title={`Statement: ${worker.name}`}
      subtitle={[worker.role, worker.phone, period === "all" ? "All time" : monthLabel(period)].filter(Boolean).join(" · ")}
      aside={<div className={`ws-box ${tone}`}><span>Balance</span><b>{balanceText(s.closing)}</b></div>}
    >
      <table className="ws">
        <thead>
          <tr><th style={{ width: "15%" }}>Date</th><th>Particulars</th><th className="num">Work (₹)</th><th className="num">Given (₹)</th><th className="num">Balance</th></tr>
        </thead>
        <tbody>
          <tr className="ws-carry">
            <td>{range.from ? day(range.from) : ""}</td>
            <td>{range.from ? "Brought forward" : "Opening balance"}</td>
            <td className="num" /><td className="num" />
            <td className="num">{balanceText(s.broughtForward)}</td>
          </tr>
          {s.rows.map((r) => {
            const detail = [r.kind === "WORK" && r.quantity != null ? `${r.quantity} ${r.unit ?? ""} × ${formatRupees(r.rate ?? 0)}` : r.method, r.site].filter(Boolean).join(" · ");
            return (
              <tr key={r.id}>
                <td>{day(r.date)}</td>
                <td>{r.description}{detail ? <div className="muted">{detail}</div> : null}</td>
                <td className="num ws-work">{r.kind === "WORK" ? formatRupees(r.amount) : ""}</td>
                <td className="num">{r.kind === "PAYMENT" ? formatRupees(r.amount) : ""}</td>
                <td className="num">{balanceText(r.balanceAfter)}</td>
              </tr>
            );
          })}
          {!s.rows.length && <tr><td colSpan={5} className="muted">Nothing recorded in this period.</td></tr>}
          <tr className="ws-strong">
            <td /><td>Total for the period</td>
            <td className="num ws-work">{formatRupees(s.work)}</td>
            <td className="num">{formatRupees(s.payments)}</td>
            <td className="num">{balanceText(s.closing)}</td>
          </tr>
        </tbody>
      </table>
    </StatementFrame>
  );
}
