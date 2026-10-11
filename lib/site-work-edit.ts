import { round2, type LedgerEntry } from './worker-ledger';
import { siteWorkPrefix, type SiteWorkInput, type SiteWorkerInput, type SiteHelperInput } from './site-work';

export type BookingRow = LedgerEntry & { workerId: string };
export type SiteWorkEdit = { entryId: string; revision: string; input: SiteWorkInput; workers: { id: string; name: string }[]; notice?: string };

/** Recover pre-snapshot bookings using the original writer's ordered helper blocks. */
export function restoreSiteWork(rows: BookingRow[]): { input: SiteWorkInput; notice: string } {
  if (!rows.length || !siteWorkPrefix(rows[0].id)) throw new Error('This site booking is unavailable.');
  const sorted = [...rows].sort((a, b) => Number(a.id.split('_').at(-1)) - Number(b.id.split('_').at(-1)));
  const main = sorted.filter(e => e.kind === 'WORK' && e.description !== 'Helper work');
  const mainIds = new Set(main.map(e => e.workerId));
  sorted.filter(e => e.kind === 'CONTRIBUTION' || e.kind === 'REIMBURSEMENT').forEach(e => mainIds.add(e.workerId));
  const workers: SiteWorkerInput[] = [...mainIds].map(id => ({ rowId: id, workerId: id, basis: 'FIXED', quantity: '1', rate: '', amount: String(main.find(e => e.workerId === id)?.amount ?? 0) }));
  const helpers: SiteHelperInput[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const e = sorted[i];
    if (e.kind !== 'WORK' || e.description !== 'Helper work') continue;
    const block: BookingRow[] = [];
    for (let j = i + 1; j < sorted.length && sorted[j].kind !== 'WORK'; j++) block.push(sorted[j]);
    const contributions = Object.fromEntries(block.filter(r => r.kind === 'CONTRIBUTION').map(r => [r.workerId, String(r.amount)]));
    const payment = block.find(r => r.kind === 'PAYMENT' || r.kind === 'THIRD_PARTY_PAYMENT');
    const payer = block.find(r => r.kind === 'REIMBURSEMENT');
    if (payment?.kind === 'THIRD_PARTY_PAYMENT' && !payer) throw new Error('The helper payment credit is missing. Review this booking before editing.');
    helpers.push({ rowId: e.workerId, workerId: e.workerId,
      basis: e.unit === 'Day' ? 'DAY' : e.unit === 'Rft' ? 'FEET' : 'FIXED', quantity: String(e.quantity ?? 1), rate: String(e.rate ?? e.amount), amount: String(e.amount),
      costMode: Object.keys(contributions).length ? 'CUSTOM' : 'BUSINESS', contributions,
      paidBy: payment ? payment.kind === 'PAYMENT' ? 'BUSINESS' : payer!.workerId : 'UNPAID', method: payment?.method || 'Cash' });
  }
  const match = main[0]?.description.match(/^(.*?) · ([\d.]+) Rft × ₹([\d.]+) · crew share$/);
  const total = round2(main.reduce((sum, e) => sum + e.amount, 0));
  return { input: {
    requestId: siteWorkPrefix(sorted[0].id)!.slice(3, -1), site: sorted[0].site ?? '', date: sorted[0].date,
    description: match?.[1] || main[0]?.description || 'Borewell drilling',
    footage: match?.[2] || '', rate: match?.[3] || String(total), crewBasis: match ? 'FOOTAGE' : 'FIXED',
    workerSplit: 'CUSTOM', workers, helpers, recordEarnings: main.length > 0,
  }, notice: 'This older booking was restored from its account entries. Check the crew and shares: people with no entries were not stored. Where feet and rate were not saved, the recorded crew amount is shown.' };
}
