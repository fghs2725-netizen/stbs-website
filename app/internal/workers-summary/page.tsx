import { notFound } from "next/navigation";
import { verifyQuotationRenderToken } from "@/lib/quotation-render-auth";
import { getSummaryForRender } from "@/lib/worker-management";
import { isMonth, summaryBinding } from "@/lib/worker-pdf";
import { dashboardTotals, expenseTotals, formatRupees, monthLabel, monthOf, monthRange, workerTotals } from "@/lib/worker-ledger";
import { balanceText } from "@/components/admin/workers/BalanceLabel";
import { StatementFrame } from "@/components/admin/workers/StatementDocument";

export const dynamic = "force-dynamic";

// Reached only by the PDF renderer, with a short-lived token bound to this month.
export default async function WorkersSummaryRender({ searchParams }: { searchParams: Promise<{ month?: string; token?: string }> }) {
  const { month, token } = await searchParams;
  if (!isMonth(month) || !verifyQuotationRenderToken(token, summaryBinding(month))) notFound();
  const { from, to } = monthRange(month);
  const { workers, expenses } = await getSummaryForRender(from, to);
  const totals = dashboardTotals(workers, month);
  const spent = expenseTotals(expenses, month);
  const short = monthLabel(month).split(" ")[0];

  return (
    <StatementFrame
      title="Workers summary"
      subtitle={`Balances as of today · work, payments and expenses for ${monthLabel(month)}`}
      aside={<div className="ws-box ws-to-pay"><span>Total to pay</span><b>{formatRupees(totals.toPay)}</b><span>Advance out: {formatRupees(totals.advance)}</span></div>}
    >
      <table className="ws">
        <thead>
          <tr><th>Worker</th><th className="num">Work in {short}</th><th className="num">Given in {short}</th><th className="num">Balance now</th></tr>
        </thead>
        <tbody>
          {workers.map((w) => {
            const inMonth = w.entries.filter((e) => monthOf(e.date) === month);
            const work = inMonth.filter((e) => e.kind === "WORK").reduce((a, e) => a + e.amount, 0);
            const given = inMonth.filter((e) => e.kind === "PAYMENT").reduce((a, e) => a + e.amount, 0);
            return (
              <tr key={w.id}>
                <td>{w.name}{w.role ? <div className="muted">{w.role}</div> : null}</td>
                <td className="num ws-work">{work ? formatRupees(work) : "—"}</td>
                <td className="num">{given ? formatRupees(given) : "—"}</td>
                <td className="num">{balanceText(workerTotals(w.openingBalance, w.entries).balance)}</td>
              </tr>
            );
          })}
          {!workers.length && <tr><td colSpan={4} className="muted">No workers yet.</td></tr>}
          <tr className="ws-strong">
            <td>Total</td>
            <td className="num ws-work">{formatRupees(totals.monthWork)}</td>
            <td className="num">{formatRupees(totals.monthPaid)}</td>
            <td className="num">To pay {formatRupees(totals.toPay)}</td>
          </tr>
        </tbody>
      </table>

      <p className="ws-section">Expenses in {monthLabel(month)}: {formatRupees(spent.total)}</p>
      <table className="ws">
        <thead><tr><th>Category</th><th className="num">Amount (₹)</th></tr></thead>
        <tbody>
          {spent.byCategory.map((c) => <tr key={c.category}><td>{c.category}</td><td className="num">{formatRupees(c.amount)}</td></tr>)}
          {!spent.byCategory.length && <tr><td colSpan={2} className="muted">No expenses recorded this month.</td></tr>}
        </tbody>
      </table>
      {expenses.length > 0 && (
        <table className="ws" style={{ marginTop: 12 }}>
          <thead><tr><th style={{ width: "15%" }}>Date</th><th>Expense</th><th>Category</th><th className="num">Amount (₹)</th></tr></thead>
          <tbody>
            {expenses.map((e) => (
              <tr key={e.id}>
                <td>{new Date(`${e.date}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</td>
                <td>{e.description || e.category}{e.forWhat ? <div className="muted">{e.forWhat}</div> : null}</td>
                <td>{e.category}</td>
                <td className="num">{formatRupees(e.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </StatementFrame>
  );
}
