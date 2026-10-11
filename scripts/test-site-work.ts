import assert from 'node:assert/strict';
import { planSiteWork, siteWorkPrefix, type SiteWorkInput } from '../lib/site-work';
import { dashboardTotals, runningLedger, statementFor, workerTotals, type LedgerEntry } from '../lib/worker-ledger';

const names = { a: 'Worker A', b: 'Worker B', h: 'Helper' };
const base: SiteWorkInput = { requestId: '12345678-1234-1234-1234-123456789abc', site: 'Nextra City', date: '2026-10-11', description: 'Drilling',
  workers: [{ workerId: 'a', amount: '5000' }, { workerId: 'b', amount: '5000' }], recordEarnings: true,
  helperId: 'h', days: '1', rate: '800', costMode: 'EQUAL', contributions: ['0', '0'], paidBy: 'UNPAID', method: 'Cash' };
function booking(patch: Partial<SiteWorkInput> = {}) {
  const plan = planSiteWork({ ...base, ...patch }, names);
  const workers = Object.keys(names).map(id => ({ id, openingBalance: 0, entries: plan.entries.filter(e => e.workerId === id).map((e, i): LedgerEntry => ({ ...e, id: `e${i}`, createdAt: `2026-10-11T00:00:0${i}Z` })) }));
  const balances = workers.map(w => workerTotals(0, w.entries).balance);
  for (const w of workers) {
    const statement = statementFor(0, w.entries);
    assert.equal(statement.closing, workerTotals(0, w.entries).balance);
    assert.equal(runningLedger(0, w.entries).at(-1)?.balanceAfter ?? 0, statement.closing);
  }
  return { plan, workers, balances };
}
assert.deepEqual(booking().balances, [4600, 4600, 800]);
assert.deepEqual(booking({ costMode: 'BUSINESS' }).balances, [5000, 5000, 800]);
assert.deepEqual(booking({ costMode: 'CUSTOM', contributions: ['800', '0'] }).balances, [4200, 5000, 800]);
assert.deepEqual(booking({ costMode: 'CUSTOM', contributions: ['200', '300'] }).balances, [4800, 4700, 800]);
assert.equal(booking({ costMode: 'CUSTOM', contributions: ['200', '300'] }).plan.businessContribution, 300);
assert.deepEqual(booking({ paidBy: 'BUSINESS' }).balances, [4600, 4600, 0]);
assert.deepEqual(booking({ paidBy: 'a' }).balances, [5400, 4600, 0]);
assert.deepEqual(booking({ paidBy: 'a', costMode: 'CUSTOM', contributions: ['800', '0'] }).balances, [5000, 5000, 0]);
assert.deepEqual(booking({ paidBy: 'b', costMode: 'BUSINESS' }).balances, [5000, 5800, 0]);
assert.deepEqual(booking({ recordEarnings: false }).balances, [-400, -400, 800]);
assert.deepEqual(booking({ rate: '800.01' }).plan.contributions, [400, 400.01]);
assert.equal(booking({ days: '0.5' }).plan.helperAmount, 400);
assert.equal(dashboardTotals(booking({ paidBy: 'a' }).workers, '2026-10').monthWork, 10000);
assert.equal(dashboardTotals(booking({ paidBy: 'a' }).workers, '2026-10').monthPaid, 0);
assert.equal(dashboardTotals(booking({ paidBy: 'BUSINESS' }).workers, '2026-10').monthPaid, 800);
const archived = booking().workers[0].entries.map(e => ({ ...e, deletedAt: '2026-10-12' }));
assert.equal(workerTotals(0, archived).balance, 0);
const carried = statementFor(100, booking({ paidBy: 'a' }).workers[0].entries, '2026-11-01', '2026-11-30');
assert.equal(carried.broughtForward, 5500);
assert.equal(carried.closing, 5500);
for (const patch of [
  { helperId: 'a' }, { helperId: 'missing' }, { site: '' }, { date: '2026-02-30' },
  { costMode: 'CUSTOM', contributions: ['500', '500'] }, { costMode: 'CUSTOM', contributions: ['-1', '0'] },
  { rate: '0' }, { days: '0' }, { rate: '9999999999', days: '99' }, { paidBy: 'h' },
  { requestId: 'bad' }, { method: 'unknown' },
] as Partial<SiteWorkInput>[]) assert.throws(() => booking(patch));
assert.equal(siteWorkPrefix(`sw_${base.requestId}_3`), `sw_${base.requestId}_`);
assert.equal(siteWorkPrefix('normal-cuid'), null);
console.log('Site work checks passed: cost splits, personal payments, rounding, existing earnings, statements, totals, validation and reversal.');
