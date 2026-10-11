import assert from 'node:assert/strict';
import { planSiteWork, reconcileHelperFunding, siteWorkerEarning, siteWorkPrefix, type SiteWorkInput, type SiteWorkerInput, type SiteHelperInput } from '../lib/site-work';
import { dashboardTotals, runningLedger, statementFor, workerTotals, type LedgerEntry } from '../lib/worker-ledger';

const names = { a: 'Worker A', b: 'Worker B', c: 'Worker C', h: 'Helper', j: 'Second helper' };
const worker = (workerId: string, amount = ''): SiteWorkerInput => ({ workerId, basis: 'FIXED', amount, quantity: '1', rate: '' });
const helper: SiteHelperInput = { ...worker('h'), basis: 'DAY', quantity: '1', rate: '800', costMode: 'EQUAL', contributions: {}, paidBy: 'UNPAID', method: 'Cash' };
const base: SiteWorkInput = { requestId: '12345678-1234-1234-1234-123456789abc', site: 'Nextra City', date: '2026-10-11', description: 'Drilling',
  footage: '200', rate: '50', workerSplit: 'EQUAL', workers: [worker('a'), worker('b')], recordEarnings: true, helpers: [helper] };
function booking(patch: Partial<SiteWorkInput> = {}, helperPatch: Partial<SiteHelperInput> = {}) {
  const plan = planSiteWork({ ...base, helpers: [{ ...helper, ...helperPatch }], ...patch }, names);
  const workers = Object.keys(names).map(id => ({ id, openingBalance: 0, entries: plan.entries.filter(e => e.workerId === id).map((e, i): LedgerEntry => ({ ...e, id: `e${String(i).padStart(6, '0')}`, createdAt: '2026-10-11T00:00:00Z' })) }));
  const balances = Object.fromEntries(workers.map(w => [w.id, workerTotals(0, w.entries).balance]));
  for (const w of workers) {
    const statement = statementFor(0, w.entries);
    assert.equal(statement.closing, workerTotals(0, w.entries).balance);
    assert.equal(runningLedger(0, w.entries).at(-1)?.balanceAfter ?? 0, statement.closing);
  }
  return { plan, workers, balances };
}
assert.deepEqual(booking().balances, { a: 4600, b: 4600, c: 0, h: 800, j: 0 });
assert.equal(booking().plan.crewAmount, 10000);
assert.equal(booking({}, { costMode: 'BUSINESS' }).balances.a, 5000);
assert.equal(booking({}, { costMode: 'CUSTOM', contributions: { a: '800', b: '0' } }).balances.a, 4200);
assert.equal(booking({}, { costMode: 'CUSTOM', contributions: { a: '200', b: '300' } }).plan.businessContribution, 300);
assert.equal(booking({}, { paidBy: 'BUSINESS' }).balances.h, 0);
assert.equal(booking({}, { paidBy: 'a' }).balances.a, 5400);
assert.equal(booking({}, { paidBy: 'a', costMode: 'CUSTOM', contributions: { a: '800' } }).balances.a, 5000);
assert.equal(booking({}, { paidBy: 'b', costMode: 'BUSINESS' }).balances.b, 5800);
assert.equal(booking({ recordEarnings: false }).balances.a, -400);
assert.deepEqual(booking({}, { rate: '800.01' }).plan.helpers[0].contributions, { a: 400, b: 400.01 });
assert.equal(booking({}, { quantity: '0.5' }).plan.helperAmount, 400);
assert.equal(dashboardTotals(booking({}, { paidBy: 'a' }).workers, '2026-10').monthWork, 10000);
assert.equal(dashboardTotals(booking({}, { paidBy: 'a' }).workers, '2026-10').monthPaid, 0);
assert.equal(dashboardTotals(booking({}, { paidBy: 'BUSINESS' }).workers, '2026-10').monthPaid, 800);

// Footage is charged once and then split, even with many workers and no helpers.
assert.equal(booking({ helpers: [], workers: [worker('a')] }).balances.a, 10000);
assert.deepEqual(booking({ helpers: [], workers: [worker('a'), worker('b'), worker('c')] }).plan.workerShares, { a: 3333.33, b: 3333.33, c: 3333.34 });
assert.equal(booking({ footage: '100.5', rate: '75', helpers: [] }).plan.crewAmount, 7537.5);
assert.deepEqual(booking({ helpers: [], workerSplit: 'CUSTOM', workers: [worker('a', '6500'), worker('b', '3500')] }).plan.workerShares, { a: 6500, b: 3500 });
assert.equal(booking({ helpers: [], workerSplit: 'CUSTOM', workers: [worker('a', '10000'), worker('b', '0')] }).balances.b, 0);

// Each helper has independent funding and payer; all credits still balance.
const helpersOnly = booking({ workers: [], footage: '', rate: '', helpers: [
  { ...helper, costMode: 'BUSINESS' },
  { ...helper, workerId: 'j', basis: 'FIXED', amount: '600', costMode: 'BUSINESS', paidBy: 'BUSINESS' },
] });
assert.equal(helpersOnly.plan.crewAmount, 0);
assert.deepEqual(helpersOnly.plan.workerShares, {});
assert.equal(helpersOnly.plan.labourCost, 1400);
assert.equal(helpersOnly.balances.h, 800);
assert.equal(helpersOnly.balances.j, 0);
assert.equal(booking({ workers: [], footage: '', rate: '', recordEarnings: false }, { costMode: 'BUSINESS', basis: 'FEET', quantity: '100', rate: '5' }).balances.h, 500);
assert.equal(booking({ workers: [] }, { costMode: 'BUSINESS' }).plan.crewAmount, 0); // Ignore stale crew fields.
assert.throws(() => booking({ workers: [], helpers: [] }));
assert.throws(() => booking({ workers: [] }, { costMode: 'CUSTOM', contributions: {} }));
assert.throws(() => booking({ workers: [] }, { costMode: 'BUSINESS', paidBy: 'a' }));

const multi = booking({ workers: [worker('a'), worker('b'), worker('c')], helpers: [
  { ...helper, rate: '900', paidBy: 'a' },
  { ...helper, workerId: 'j', rate: '600', costMode: 'CUSTOM', contributions: { b: '200' }, paidBy: 'BUSINESS' },
] });
assert.equal(multi.plan.helperAmount, 1500);
assert.equal(multi.plan.businessContribution, 400);
assert.equal(multi.plan.labourCost, 10400);
assert.equal(multi.balances.a, 3933.33);
assert.equal(multi.balances.b, 2833.33);
assert.equal(multi.balances.c, 3033.34);
assert.equal(multi.balances.h, 0);
assert.equal(multi.balances.j, 0);
assert.equal(multi.balances.a + multi.balances.b + multi.balances.c, 9800);
assert.equal(siteWorkerEarning({ ...helper, basis: 'FEET', quantity: '100', rate: '5' }).amount, 500);
assert.equal(siteWorkerEarning({ ...helper, basis: 'FIXED', amount: '700' }).amount, 700);

const funding = { ...helper, costMode: 'CUSTOM' as const, contributions: { a: '300', b: '500' }, paidBy: 'a' };
const removed = reconcileHelperFunding([funding], ['b', 'c'])[0];
assert.deepEqual(removed.contributions, { b: '500' });
assert.equal(removed.paidBy, 'UNPAID');
assert.deepEqual(reconcileHelperFunding([funding], ['b', 'a'])[0], funding);
const noWorkers = reconcileHelperFunding([funding], [])[0];
assert.equal(noWorkers.costMode, 'BUSINESS');
assert.equal(noWorkers.paidBy, 'UNPAID');
assert.deepEqual(noWorkers.contributions, {});
assert.equal(booking({ workers: [], footage: '', rate: '', helpers: [noWorkers] }).balances.h, 800);
assert.equal(workerTotals(0, multi.workers[0].entries.map(e => ({ ...e, deletedAt: '2026-10-12' }))).balance, 0);
assert.equal(statementFor(100, booking({}, { paidBy: 'a' }).workers[0].entries, '2026-11-01', '2026-11-30').closing, 5500);

for (const patch of [
  { workers: [] }, { workers: [worker('a'), worker('a')] }, { helpers: [helper, helper] },
  { workers: [worker('h')] }, { workers: [worker('missing')] }, { site: '' }, { date: '2026-02-30' },
  { footage: '0' }, { rate: '0' }, { footage: '99999999', rate: '9999999999' },
  { workerSplit: 'CUSTOM', workers: [worker('a', '9000')] },
  { recordEarnings: false, helpers: [] }, { requestId: 'bad' },
] as Partial<SiteWorkInput>[]) assert.throws(() => booking(patch));
for (const patch of [
  { workerId: 'a' }, { workerId: 'missing' }, { costMode: 'CUSTOM', contributions: { a: '500', b: '500' } },
  { costMode: 'CUSTOM', contributions: { a: '-1' } }, { costMode: 'CUSTOM', contributions: { c: '50' } },
  { rate: '0' }, { quantity: '0' }, { rate: '9999999999', quantity: '99' }, { paidBy: 'h' }, { method: 'unknown' },
] as Partial<SiteHelperInput>[]) assert.throws(() => booking({}, patch));

// No two-worker or one-helper cap, including bookings with more than ten linked entries.
const manyNames = Object.fromEntries(Array.from({ length: 20 }, (_, i) => [`p${i}`, `Person ${i}`]));
const many = planSiteWork({ ...base, workers: Array.from({ length: 12 }, (_, i) => worker(`p${i}`)), helpers: Array.from({ length: 8 }, (_, i) => ({ ...helper, workerId: `p${i + 12}` })) }, manyNames);
assert.equal(many.helpers.length, 8);
assert.equal(Object.keys(many.workerShares).length, 12);
assert.equal(many.labourCost, 10000);
assert.equal(siteWorkPrefix(`sw_${base.requestId}_000013`), `sw_${base.requestId}_`);
assert.equal(siteWorkPrefix(`sw_${base.requestId}_3`), `sw_${base.requestId}_`);
assert.equal(siteWorkPrefix('normal-cuid'), null);
console.log('Site work checks passed: shared footage/rate, arbitrary crew size, optional/multiple helpers, cost splits, payer credits, row removal, rounding, statements and validation.');
