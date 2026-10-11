import assert from 'node:assert/strict';
import { Prisma } from '@prisma/client';
import { bookingRevision, replaceSiteWork } from '../lib/site-work-persistence';
import { planSiteWork, type SiteWorkInput, type SiteWorkEntry } from '../lib/site-work';

type Row = Prisma.WorkerEntryGetPayload<object>;
const original: SiteWorkInput = {
  requestId: '11111111-1111-1111-1111-111111111111', site: 'Nextra City', date: '2026-10-11', description: 'Drilling',
  footage: '200', rate: '50', workerSplit: 'EQUAL', recordEarnings: true,
  workers: [{ workerId: 'a', amount: '', basis: 'FIXED', quantity: '1', rate: '' }],
  helpers: [{ workerId: 'h', basis: 'DAY', quantity: '1', rate: '800', amount: '', costMode: 'EQUAL', contributions: {}, paidBy: 'a', method: 'Cash' }],
};
const names = { a: 'Worker A', b: 'Worker B', h: 'Helper' };
const prefix = `sw_${original.requestId}_`;
const row = (e: SiteWorkEntry, id: string): Row => ({ ...e, id, kind: e.kind, site: e.site ?? null, quantity: e.quantity == null ? null : new Prisma.Decimal(e.quantity), rate: e.rate == null ? null : new Prisma.Decimal(e.rate), amount: new Prisma.Decimal(e.amount), unit: e.unit ?? null, method: e.method ?? null, createdAt: new Date('2026-10-11'), updatedAt: new Date('2026-10-11'), deletedAt: null });
const old = planSiteWork(original, names).entries.map((e, i) => row(e, `${prefix}${String(i).padStart(6, '0')}`));
const separate = row({ workerId: 'a', kind: 'PAYMENT', amount: 500, date: '2026-10-11', description: 'Separate advance' }, 'separate-payment');
type Audit = { id: string; metadata: unknown };
let rows: Row[] = [...old, separate];
let audits: Audit[] = [];
let failCreate = false;
const live = (p: string) => rows.filter(e => e.id.startsWith(p) && !e.deletedAt);
const tx = {
  worker: { findMany: async () => Object.entries(names).map(([id, name]) => ({ id, name })) },
  auditLog: {
    findUnique: async ({ where }: { where: { id: string } }) => audits.find(a => a.id === where.id) ?? null,
    create: async ({ data }: { data: Audit }) => { audits.push(data); return data; },
  },
  workerEntry: {
    findMany: async ({ where }: { where: { id: { startsWith: string } } }) => live(where.id.startsWith),
    count: async ({ where }: { where: { id: { startsWith: string } } }) => live(where.id.startsWith).length,
    updateMany: async ({ where, data }: { where: { id: { startsWith: string } }; data: { deletedAt: Date } }) => {
      rows = rows.map(e => e.id.startsWith(where.id.startsWith) && !e.deletedAt ? { ...e, ...data } : e);
    },
    createMany: async ({ data }: { data: (SiteWorkEntry & { id: string })[] }) => {
      if (failCreate) throw new Error('simulated write failure');
      rows.push(...data.map(e => row(e, e.id)));
    },
  },
} as unknown as Prisma.TransactionClient;
const revision = bookingRevision(old);
const edited: SiteWorkInput = { ...original, requestId: '22222222-2222-2222-2222-222222222222', rate: '75', workers: [{ ...original.workers[0], workerId: 'b' }], helpers: [] };
// Mimic the outer database transaction's rollback when any inner operation fails.
async function save(input = edited, rev = revision) {
  const beforeRows = [...rows], beforeAudits = [...audits];
  try { await replaceSiteWork(tx, old[0].id, prefix, rev, input); }
  catch (e) { rows = beforeRows; audits = beforeAudits; throw e; }
}
async function main() {
  await assert.rejects(save(edited, 'stale-revision'), /changed while/);
  assert.equal(live(prefix).length, old.length);
  await assert.rejects(save({ ...edited, rate: '0' }));
  assert.equal(live(prefix).length, old.length);
  failCreate = true;
  await assert.rejects(save(), /simulated/);
  assert.equal(live(prefix).length, old.length);
  assert.equal(audits.length, 0);
  failCreate = false;
  await save();
  assert.equal(live(prefix).length, 0);
  const replacement = live(`sw_${edited.requestId}_`);
  assert.equal(replacement.length, 1);
  assert.equal(replacement[0].workerId, 'b');
  assert.equal(Number(replacement[0].amount), 15000);
  assert.equal(rows.find(e => e.id === separate.id)?.deletedAt, null);
  assert.equal(audits.length, 1);
  const savedLength = rows.length;
  // JSONB changes key ordering; retries must compare values, not serialized order.
  const reorder = (value: unknown): unknown => Array.isArray(value) ? value.map(reorder) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).reverse().map(([k, v]) => [k, reorder(v)])) : value;
  audits[0].metadata = reorder(audits[0].metadata);
  await save();
  assert.equal(rows.length, savedLength);
  await assert.rejects(save({ ...edited, rate: '80' }), /different details/);
  await assert.rejects(save({ ...edited, requestId: '33333333-3333-3333-3333-333333333333' }), /changed while/);
  rows = rows.map(e => e.id.startsWith(`sw_${edited.requestId}_`) ? { ...e, deletedAt: new Date() } : e);
  await assert.rejects(save(), /changed or been removed/);
  console.log('Site work persistence checks passed: stale edits, validation, rollback, replacement, separate payments, retries and removed bookings.');
}
main().catch(e => { console.error(e); process.exitCode = 1; });
