/**
 * The arithmetic of a worker's account. Pure (no database, no dates from the clock unless asked), so
 * every page and PDF counts money the same way and it can be tested exactly.
 *
 *   earned  = opening "we owe him" + every work entry (quantity × rate)
 *   paid    = opening "advance"    + every payment (every rupee handed to him, whatever it was for)
 *   balance = earned − paid        > 0: to pay him · < 0: he has an advance · 0: settled
 *
 * Expenses (rig diesel, repairs…) are business costs and never touch a worker's balance.
 */

export type EntryKind = "WORK" | "PAYMENT";

export type LedgerEntry = {
  id: string;
  kind: EntryKind;
  date: string; // YYYY-MM-DD
  description: string;
  site?: string | null;
  quantity?: number | null;
  unit?: string | null;
  rate?: number | null;
  amount: number;
  method?: string | null;
  createdAt: string; // ISO; orders entries made on the same day
  deletedAt?: string | null;
};

export type LedgerRow = LedgerEntry & { balanceAfter: number };

export type BalanceState = { kind: "TO_PAY" | "ADVANCE" | "SETTLED"; amount: number };

export const PAYMENT_PICKS = ["Advance", "Petrol", "Salary", "Food", "Other"] as const;
export const PAYMENT_METHODS = ["Cash", "UPI", "Bank"] as const;
export const WORKER_ROLES = ["Driller", "Operator", "Driver", "Helper", "Mechanic", "Supervisor"] as const;
export const EXPENSE_CATEGORIES = ["Diesel/Petrol", "Repairs", "Material", "Food", "Transport", "Other"] as const;
export const DEFAULT_WORK_DESCRIPTION = "Borewell drilling";
export const DEFAULT_WORK_UNIT = "Rft";

/** Rupees to the paisa, without the 0.1 + 0.2 drift. */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function workAmount(quantity: number, rate: number): number {
  return round2(quantity * rate);
}

/**
 * A money amount typed by a person: positive, at most two decimals, below ₹1,000 crore. Commas and a
 * leading ₹ are allowed. Anything else is refused (null) rather than guessed.
 */
export function parseAmount(input: unknown): number | null {
  const raw = typeof input === "number" ? String(input) : String(input ?? "").replace(/[₹,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(raw)) return null;
  const n = Number(raw);
  return n > 0 && n < 1e10 ? n : null;
}

/** A quantity: positive, up to two decimals. */
export function parseQuantity(input: unknown): number | null {
  const raw = String(input ?? "").replace(/[,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(raw)) return null;
  const n = Number(raw);
  return n > 0 && n < 1e8 ? n : null;
}

export function isIsoDate(s: unknown): s is string {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/** Today's date in India, as YYYY-MM-DD. */
export function todayIST(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function monthOf(date: string): string {
  return date.slice(0, 7);
}

/** First and last day of a YYYY-MM month. */
export function monthRange(month: string): { from: string; to: string } {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, "0")}` };
}

export function previousMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 2, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** "September 2026". */
export function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });
}

const live = (entries: LedgerEntry[]) => entries.filter((e) => !e.deletedAt);

/** Oldest first; entries on the same day in the order they were made. */
export function sortEntries<T extends LedgerEntry>(entries: T[]): T[] {
  return [...entries].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
}

export function describeBalance(balance: number): BalanceState {
  const b = round2(balance);
  if (b > 0) return { kind: "TO_PAY", amount: b };
  if (b < 0) return { kind: "ADVANCE", amount: -b };
  return { kind: "SETTLED", amount: 0 };
}

export type WorkerTotals = { work: number; payments: number; earned: number; paid: number; balance: number };

/** Totals over every live entry, including the opening balance. */
export function workerTotals(openingBalance: number, entries: LedgerEntry[]): WorkerTotals {
  let work = 0;
  let payments = 0;
  for (const e of live(entries)) {
    if (e.kind === "WORK") work += e.amount;
    else payments += e.amount;
  }
  work = round2(work);
  payments = round2(payments);
  const earned = round2(Math.max(openingBalance, 0) + work);
  const paid = round2(Math.max(-openingBalance, 0) + payments);
  return { work, payments, earned, paid, balance: round2(earned - paid) };
}

/** Every live entry, oldest first, with the balance after it (starting from the opening balance). */
export function runningLedger(openingBalance: number, entries: LedgerEntry[]): LedgerRow[] {
  let balance = round2(openingBalance);
  return sortEntries(live(entries)).map((e) => {
    balance = round2(balance + (e.kind === "WORK" ? e.amount : -e.amount));
    return { ...e, balanceAfter: balance };
  });
}

export type Statement = {
  /** Balance carried in from before the period (the opening balance plus everything earlier). */
  broughtForward: number;
  rows: LedgerRow[];
  work: number;
  payments: number;
  closing: number;
};

/**
 * A statement for a period (inclusive dates; either may be open). Entries before `from` are rolled
 * into the brought-forward balance, so the closing balance is always the true balance on `to`.
 */
export function statementFor(openingBalance: number, entries: LedgerEntry[], from?: string | null, to?: string | null): Statement {
  const all = runningLedger(openingBalance, entries);
  const before = from ? all.filter((r) => r.date < from) : [];
  const broughtForward = before.length ? before[before.length - 1].balanceAfter : round2(openingBalance);
  const rows = all.filter((r) => (!from || r.date >= from) && (!to || r.date <= to));
  const work = round2(rows.filter((r) => r.kind === "WORK").reduce((s, r) => s + r.amount, 0));
  const payments = round2(rows.filter((r) => r.kind === "PAYMENT").reduce((s, r) => s + r.amount, 0));
  return { broughtForward, rows, work, payments, closing: round2(broughtForward + work - payments) };
}

export type DashboardTotals = { toPay: number; advance: number; monthWork: number; monthPaid: number };

/** Across workers: what the business owes, what is out as advances, and this month's work and payments. */
export function dashboardTotals(workers: Array<{ openingBalance: number; entries: LedgerEntry[] }>, month: string): DashboardTotals {
  let toPay = 0;
  let advance = 0;
  let monthWork = 0;
  let monthPaid = 0;
  for (const w of workers) {
    const { balance } = workerTotals(w.openingBalance, w.entries);
    if (balance > 0) toPay += balance;
    else advance += -balance;
    for (const e of live(w.entries)) {
      if (monthOf(e.date) !== month) continue;
      if (e.kind === "WORK") monthWork += e.amount;
      else monthPaid += e.amount;
    }
  }
  return { toPay: round2(toPay), advance: round2(advance), monthWork: round2(monthWork), monthPaid: round2(monthPaid) };
}

export type ExpenseLike = { date: string; amount: number; category: string; deletedAt?: string | null };

/** A month's expenses: the total, and each category's share, largest first. */
export function expenseTotals(expenses: ExpenseLike[], month: string): { total: number; byCategory: Array<{ category: string; amount: number }> } {
  const map = new Map<string, number>();
  let total = 0;
  for (const e of expenses) {
    if (e.deletedAt || monthOf(e.date) !== month) continue;
    total += e.amount;
    map.set(e.category, (map.get(e.category) ?? 0) + e.amount);
  }
  const byCategory = [...map.entries()].map(([category, amount]) => ({ category, amount: round2(amount) })).sort((a, b) => b.amount - a.amount || a.category.localeCompare(b.category));
  return { total: round2(total), byCategory };
}

/** ₹4,500 for whole rupees, ₹4,500.50 when there are paise: worker amounts are nearly always whole. */
export function formatRupees(n: number): string {
  const whole = Math.abs(round2(n) % 1) < 0.001;
  return `₹${round2(n).toLocaleString("en-IN", { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 })}`;
}
