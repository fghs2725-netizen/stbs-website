const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export type Lookups = {
  yesterday: string;
  enquiries: { count: number; unread: number; latest: Array<{ date: string; service: string; place: string }> };
  paidYesterday: { total: number; count: number };
  paidThisMonth: { total: number };
  overdue: { count: number; stillOwed: number; invoices: Array<{ client: string; balance: number; overdueDays: number }> };
  owedNow: { total: number; bills: number };
  drafts: { quotations: number; invoices: number };
  expenses: { total: number; byCategory: Record<string, number> };
  workers: { totalOwedToWorkers: number };
};

/** The daily summary's facts as plain sentences, one per thing worth knowing today. Pure, so it is tested without a database. */
export function factLines(l: Lookups): string[] {
  const lines: string[] = [];
  const newOnes = l.enquiries.latest.filter((e) => e.date >= l.yesterday);
  if (newOnes.length) {
    const what = [...new Set(newOnes.map((e) => `${e.service} (${e.place})`))].slice(0, 3).join(", ");
    lines.push(`${plural(newOnes.length, "new website enquiry", "new website enquiries")} since yesterday: ${what}.`);
  }
  if (l.enquiries.unread) lines.push(`${plural(l.enquiries.unread, "enquiry", "enquiries")} from the last 30 days still unread.`);
  if (l.paidYesterday.count) lines.push(`Received ${inr(l.paidYesterday.total)} yesterday.`);
  lines.push(`Received this month so far: ${inr(l.paidThisMonth.total)}.`);
  if (l.owedNow.total > 0) lines.push(`Clients owe ${inr(l.owedNow.total)} on ${plural(l.owedNow.bills, "bill")}.`);
  if (l.overdue.count) {
    const top = l.overdue.invoices
      .slice()
      .sort((a, b) => b.balance - a.balance)
      .slice(0, 3)
      .map((i) => `${i.client} ${inr(i.balance)} (${i.overdueDays} days late)`)
      .join("; ");
    lines.push(`${plural(l.overdue.count, "bill")} past due, ${inr(l.overdue.stillOwed)} in all. Biggest: ${top}.`);
  }
  if (l.drafts.quotations) lines.push(`${plural(l.drafts.quotations, "quotation")} still in draft.`);
  if (l.drafts.invoices) lines.push(`${plural(l.drafts.invoices, "invoice")} still in draft.`);
  if (l.expenses.total > 0) {
    const [top, amount] = Object.entries(l.expenses.byCategory)[0] ?? [];
    lines.push(`Expenses this month: ${inr(l.expenses.total)}${top ? `, most on ${top} (${inr(amount)})` : ""}.`);
  }
  if (l.workers.totalOwedToWorkers > 0) lines.push(`Workers are owed ${inr(l.workers.totalOwedToWorkers)} in all.`);
  return lines;
}
