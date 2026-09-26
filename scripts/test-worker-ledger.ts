import assert from "node:assert/strict";
import {
  dashboardTotals, describeBalance, expenseTotals, monthLabel, monthRange, parseAmount, parseQuantity, previousMonth,
  runningLedger, statementFor, workAmount, workerTotals, isIsoDate, type LedgerEntry,
} from "../lib/worker-ledger";

let passed = 0;
function check(label: string, fn: () => void) {
  fn();
  passed++;
  console.log(`  ok  ${label}`);
}

let seq = 0;
const e = (kind: "WORK" | "PAYMENT", date: string, amount: number, extra: Partial<LedgerEntry> = {}): LedgerEntry => ({
  id: `e${++seq}`, kind, date, amount, description: kind === "WORK" ? "Borewell drilling" : "Petrol",
  createdAt: `2026-09-01T00:00:${String(seq).padStart(2, "0")}.000Z`, ...extra,
});

check("work pays in, money given pays out: to pay", () => {
  const t = workerTotals(0, [e("WORK", "2026-09-02", 5000), e("PAYMENT", "2026-09-03", 500)]);
  assert.deepEqual(t, { work: 5000, payments: 500, earned: 5000, paid: 500, balance: 4500 });
  assert.deepEqual(describeBalance(t.balance), { kind: "TO_PAY", amount: 4500 });
});

check("more given than earned: an advance", () => {
  const t = workerTotals(0, [e("WORK", "2026-09-02", 1000), e("PAYMENT", "2026-09-03", 1500)]);
  assert.deepEqual(describeBalance(t.balance), { kind: "ADVANCE", amount: 500 });
});

check("exactly even: settled", () => {
  const t = workerTotals(0, [e("WORK", "2026-09-02", 700), e("PAYMENT", "2026-09-03", 700)]);
  assert.deepEqual(describeBalance(t.balance), { kind: "SETTLED", amount: 0 });
});

check("opening balance both ways", () => {
  assert.equal(workerTotals(2000, []).balance, 2000); // we owed him
  assert.equal(workerTotals(2000, []).earned, 2000);
  assert.equal(workerTotals(-3000, []).balance, -3000); // he had an advance
  assert.equal(workerTotals(-3000, []).paid, 3000);
  assert.equal(workerTotals(-3000, [e("WORK", "2026-09-02", 5000)]).balance, 2000);
});

check("deleted entries are ignored everywhere", () => {
  const entries = [e("WORK", "2026-09-02", 5000), e("PAYMENT", "2026-09-03", 900, { deletedAt: "2026-09-04T00:00:00Z" })];
  assert.equal(workerTotals(0, entries).balance, 5000);
  assert.equal(runningLedger(0, entries).length, 1);
});

check("running balance follows date, then the order entries were made", () => {
  const a = e("PAYMENT", "2026-09-05", 200);
  const b = e("WORK", "2026-09-01", 1000);
  const c = e("PAYMENT", "2026-09-05", 300); // same day as a, made after it
  const rows = runningLedger(100, [c, a, b]);
  assert.deepEqual(rows.map((r) => r.id), [b.id, a.id, c.id]);
  assert.deepEqual(rows.map((r) => r.balanceAfter), [1100, 900, 600]);
});

check("a month's statement brings earlier entries forward and closes on the true balance", () => {
  const entries = [e("WORK", "2026-08-20", 4000), e("PAYMENT", "2026-08-25", 1000), e("WORK", "2026-09-02", 2000), e("PAYMENT", "2026-09-10", 500), e("WORK", "2026-10-01", 999)];
  const { from, to } = monthRange("2026-09");
  const s = statementFor(-500, entries, from, to);
  assert.equal(s.broughtForward, 2500); // −500 + 4000 − 1000
  assert.equal(s.rows.length, 2);
  assert.equal(s.work, 2000);
  assert.equal(s.payments, 500);
  assert.equal(s.closing, 4000);
  assert.equal(s.rows[s.rows.length - 1].balanceAfter, s.closing);
});

check("an all-time statement starts from the opening balance", () => {
  const s = statementFor(-500, [e("WORK", "2026-08-20", 4000)], null, null);
  assert.equal(s.broughtForward, -500);
  assert.equal(s.closing, 3500);
});

check("dashboard: owed and advances summed separately, month totals only for that month", () => {
  const t = dashboardTotals([
    { openingBalance: 0, entries: [e("WORK", "2026-09-02", 3000), e("PAYMENT", "2026-09-03", 1000)] }, // to pay 2000
    { openingBalance: -1500, entries: [e("WORK", "2026-08-30", 500)] }, // advance 1000
    { openingBalance: 0, entries: [e("PAYMENT", "2026-09-15", 250), e("WORK", "2026-09-15", 250)] }, // settled
  ], "2026-09");
  assert.deepEqual(t, { toPay: 2000, advance: 1000, monthWork: 3250, monthPaid: 1250 });
});

check("money is kept to the paisa", () => {
  assert.equal(workAmount(200, 72.5), 14500);
  assert.equal(workAmount(0.1, 0.2 * 10), 0.2);
  assert.equal(workAmount(33.33, 3), 99.99);
  assert.equal(workerTotals(0, [e("WORK", "2026-09-01", 0.1), e("WORK", "2026-09-01", 0.2)]).balance, 0.3);
});

check("amounts typed by a person: positive, two decimals, commas and ₹ allowed", () => {
  assert.equal(parseAmount("500"), 500);
  assert.equal(parseAmount("₹1,25,000.50"), 125000.5);
  assert.equal(parseAmount("0"), null);
  assert.equal(parseAmount("-5"), null);
  assert.equal(parseAmount("12.345"), null);
  assert.equal(parseAmount("abc"), null);
  assert.equal(parseQuantity("200"), 200);
  assert.equal(parseQuantity("0"), null);
});

check("dates and months", () => {
  assert.equal(isIsoDate("2026-09-26"), true);
  assert.equal(isIsoDate("2026-02-30"), false);
  assert.deepEqual(monthRange("2026-02"), { from: "2026-02-01", to: "2026-02-28" });
  assert.deepEqual(monthRange("2028-02"), { from: "2028-02-01", to: "2028-02-29" });
  assert.equal(previousMonth("2026-01"), "2025-12");
  assert.equal(monthLabel("2026-09"), "September 2026");
});

check("expenses: month total and categories, largest first, deleted ignored", () => {
  const t = expenseTotals([
    { date: "2026-09-01", amount: 3000, category: "Diesel/Petrol" },
    { date: "2026-09-05", amount: 1200, category: "Repairs" },
    { date: "2026-09-06", amount: 800, category: "Diesel/Petrol" },
    { date: "2026-08-31", amount: 9999, category: "Material" },
    { date: "2026-09-07", amount: 500, category: "Food", deletedAt: "2026-09-08" },
  ], "2026-09");
  assert.deepEqual(t, { total: 5000, byCategory: [{ category: "Diesel/Petrol", amount: 3800 }, { category: "Repairs", amount: 1200 }] });
});

console.log(`\n${passed} checks passed`);
