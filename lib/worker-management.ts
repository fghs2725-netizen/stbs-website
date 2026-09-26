import type { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  DEFAULT_WORK_UNIT, isIsoDate, parseAmount, parseQuantity, round2, workAmount,
  type EntryKind, type LedgerEntry,
} from "@/lib/worker-ledger";

/**
 * Workers, their work and payment entries, and business expenses. The arithmetic is in
 * lib/worker-ledger.ts; this file only stores and loads. Everything here is admin-only.
 */

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) throw new Error("UNAUTHORIZED");
}

export class InputError extends Error {}

const num = (d: Prisma.Decimal | number | null | undefined) => (d == null ? null : Number(d));
const text = (v: unknown, max: number) => {
  const s = String(v ?? "").trim().replace(/\s+/g, " ");
  return s ? s.slice(0, max) : null;
};

export type WorkerRow = {
  id: string;
  name: string;
  phone: string | null;
  role: string | null;
  notes: string | null;
  openingBalance: number;
  active: boolean;
  entries: LedgerEntry[];
};

type EntryRecord = Prisma.WorkerEntryGetPayload<object>;
const toEntry = (e: EntryRecord): LedgerEntry => ({
  id: e.id,
  kind: e.kind as EntryKind,
  date: e.date,
  description: e.description,
  site: e.site,
  quantity: num(e.quantity),
  unit: e.unit,
  rate: num(e.rate),
  amount: Number(e.amount),
  method: e.method,
  createdAt: e.createdAt.toISOString(),
});

const workerInclude = { entries: { where: { deletedAt: null }, orderBy: [{ date: "asc" as const }, { createdAt: "asc" as const }] } };
type WorkerRecord = Prisma.WorkerGetPayload<{ include: typeof workerInclude }>;
const toWorker = (w: WorkerRecord): WorkerRow => ({
  id: w.id, name: w.name, phone: w.phone, role: w.role, notes: w.notes,
  openingBalance: Number(w.openingBalance), active: w.active, entries: w.entries.map(toEntry),
});

// ─── Workers ─────────────────────────────────────────────────────────────────

export async function listWorkers(opts: { archived?: boolean } = {}): Promise<WorkerRow[]> {
  await requireAdmin();
  const rows = await prisma.worker.findMany({
    where: { deletedAt: null, active: !opts.archived },
    include: workerInclude,
    orderBy: { name: "asc" },
  });
  return rows.map(toWorker);
}

export async function countArchivedWorkers(): Promise<number> {
  await requireAdmin();
  return prisma.worker.count({ where: { deletedAt: null, active: false } });
}

export async function getWorker(id: string): Promise<WorkerRow | null> {
  await requireAdmin();
  const w = await prisma.worker.findFirst({ where: { id, deletedAt: null }, include: workerInclude });
  return w ? toWorker(w) : null;
}

export type WorkerInput = { name: unknown; phone?: unknown; role?: unknown; notes?: unknown; opening?: unknown; openingSide?: unknown };

function workerData(input: WorkerInput) {
  const name = text(input.name, 80);
  if (!name) throw new InputError("Enter the worker's name.");
  const phone = text(input.phone, 20);
  if (phone && !/^[+\d][\d\s-]{6,19}$/.test(phone)) throw new InputError("Enter a valid phone number, or leave it empty.");
  let openingBalance = 0;
  const openingRaw = String(input.opening ?? "").trim();
  if (openingRaw) {
    const amount = parseAmount(openingRaw);
    if (amount == null) throw new InputError("The opening balance must be an amount like 2500.");
    openingBalance = input.openingSide === "ADVANCE" ? -amount : amount;
  }
  return { name, phone, role: text(input.role, 40), notes: text(input.notes, 500), openingBalance };
}

export async function createWorker(input: WorkerInput): Promise<string> {
  await requireAdmin();
  const row = await prisma.worker.create({ data: workerData(input), select: { id: true } });
  return row.id;
}

export async function updateWorker(id: string, input: WorkerInput): Promise<void> {
  await requireAdmin();
  await prisma.worker.update({ where: { id }, data: workerData(input) });
}

/** "Remove" archives: the worker leaves the dashboard, and every record he has is kept. */
export async function setWorkerActive(id: string, active: boolean): Promise<void> {
  await requireAdmin();
  await prisma.worker.update({ where: { id }, data: { active } });
}

// ─── Entries ─────────────────────────────────────────────────────────────────

export type EntryInput = {
  kind: unknown; date: unknown; description?: unknown; site?: unknown;
  quantity?: unknown; unit?: unknown; rate?: unknown; amount?: unknown; method?: unknown;
};

function entryData(input: EntryInput) {
  const kind = input.kind === "WORK" ? "WORK" : input.kind === "PAYMENT" ? "PAYMENT" : null;
  if (!kind) throw new InputError("Unknown entry type.");
  if (!isIsoDate(input.date)) throw new InputError("Choose a valid date.");
  if (kind === "WORK") {
    const quantity = parseQuantity(input.quantity);
    if (quantity == null) throw new InputError("Enter how much work was done, like 200.");
    const rate = parseAmount(input.rate);
    if (rate == null) throw new InputError("Enter the rate, like 75.");
    return {
      kind, date: input.date, description: text(input.description, 120) ?? "Work",
      site: text(input.site, 120), quantity, unit: text(input.unit, 20) ?? DEFAULT_WORK_UNIT, rate,
      amount: workAmount(quantity, rate), method: null,
    };
  }
  const amount = parseAmount(input.amount);
  if (amount == null) throw new InputError("Enter the amount given, like 500.");
  return {
    kind, date: input.date, description: text(input.description, 120) ?? "Payment",
    site: null, quantity: null, unit: null, rate: null, amount: round2(amount), method: text(input.method, 20),
  };
}

export async function addEntry(workerId: string, input: EntryInput): Promise<void> {
  await requireAdmin();
  const worker = await prisma.worker.findFirst({ where: { id: workerId, deletedAt: null }, select: { id: true } });
  if (!worker) throw new InputError("This worker no longer exists.");
  await prisma.workerEntry.create({ data: { workerId, ...entryData(input) } });
}

export async function updateEntry(id: string, input: EntryInput): Promise<string> {
  await requireAdmin();
  const row = await prisma.workerEntry.update({ where: { id }, data: entryData(input), select: { workerId: true } });
  return row.workerId;
}

export async function deleteEntry(id: string): Promise<string> {
  await requireAdmin();
  const row = await prisma.workerEntry.update({ where: { id }, data: { deletedAt: new Date() }, select: { workerId: true } });
  return row.workerId;
}

/** The rate this worker was last paid in a unit, to pre-fill the next work entry. */
export function lastRates(entries: LedgerEntry[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const e of entries) if (e.kind === "WORK" && e.unit && e.rate != null) out[e.unit] = e.rate;
  return out;
}

// ─── Expenses ────────────────────────────────────────────────────────────────

export type ExpenseRow = {
  id: string; date: string; amount: number; category: string;
  description: string | null; forWhat: string | null; method: string | null; createdAt: string;
};

const toExpense = (e: Prisma.ExpenseGetPayload<object>): ExpenseRow => ({
  id: e.id, date: e.date, amount: Number(e.amount), category: e.category,
  description: e.description, forWhat: e.forWhat, method: e.method, createdAt: e.createdAt.toISOString(),
});

/** Expenses between two dates (inclusive), newest first. */
export async function listExpenses(from: string, to: string): Promise<ExpenseRow[]> {
  await requireAdmin();
  const rows = await prisma.expense.findMany({
    where: { deletedAt: null, date: { gte: from, lte: to } },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });
  return rows.map(toExpense);
}

export type ExpenseInput = { date: unknown; amount: unknown; category: unknown; description?: unknown; forWhat?: unknown; method?: unknown };

function expenseData(input: ExpenseInput) {
  if (!isIsoDate(input.date)) throw new InputError("Choose a valid date.");
  const amount = parseAmount(input.amount);
  if (amount == null) throw new InputError("Enter the amount, like 1500.");
  const category = text(input.category, 40);
  if (!category) throw new InputError("Choose a category.");
  return { date: input.date, amount, category, description: text(input.description, 200), forWhat: text(input.forWhat, 120), method: text(input.method, 20) };
}

export async function addExpense(input: ExpenseInput): Promise<void> {
  await requireAdmin();
  await prisma.expense.create({ data: expenseData(input) });
}

export async function updateExpense(id: string, input: ExpenseInput): Promise<void> {
  await requireAdmin();
  await prisma.expense.update({ where: { id }, data: expenseData(input) });
}

export async function deleteExpense(id: string): Promise<void> {
  await requireAdmin();
  await prisma.expense.update({ where: { id }, data: { deletedAt: new Date() } });
}

// ─── For the PDF render pages (reached with a signed render token, not a session) ─────

export async function getWorkerForRender(id: string): Promise<WorkerRow | null> {
  const w = await prisma.worker.findFirst({ where: { id, deletedAt: null }, include: workerInclude });
  return w ? toWorker(w) : null;
}

export async function getSummaryForRender(from: string, to: string) {
  const [workers, expenses] = await Promise.all([
    prisma.worker.findMany({ where: { deletedAt: null, active: true }, include: workerInclude, orderBy: { name: "asc" } }),
    prisma.expense.findMany({ where: { deletedAt: null, date: { gte: from, lte: to } }, orderBy: [{ date: "asc" }, { createdAt: "asc" }] }),
  ]);
  return { workers: workers.map(toWorker), expenses: expenses.map(toExpense) };
}
