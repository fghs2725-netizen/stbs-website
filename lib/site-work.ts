import { isIsoDate, parseAmount, parseQuantity, round2, type LedgerEntry } from './worker-ledger';

export type SiteWorkInput = {
  requestId: string; site: string; date: string; description: string;
  workers: { workerId: string; amount: string }[];
  recordEarnings: boolean;
  helperId: string; days: string; rate: string;
  costMode: 'BUSINESS' | 'EQUAL' | 'CUSTOM';
  contributions: string[];
  paidBy: string; // UNPAID, BUSINESS, or a main worker ID
  method: string;
};
export type SiteWorkEntry = Omit<LedgerEntry, 'id' | 'createdAt'> & { workerId: string };

// Deterministic IDs group the atomic booking and make retrying a save idempotent,
// using the existing ledger schema. Normal entries use cuid IDs.
export function siteWorkPrefix(id: string): string | null {
  return /^(sw_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}_)\d+$/.exec(id)?.[1] ?? null;
}

export function planSiteWork(input: SiteWorkInput, names: Record<string, string>) {
  const fail = (message: string): never => { throw new Error(message); };
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(input.requestId)) fail('Please reopen the site work form.');
  const site = input.site?.trim();
  if (!site || site.length > 120) fail('Enter a site name of up to 120 characters.');
  if (!isIsoDate(input.date)) fail('Choose a valid work date.');
  if (!Array.isArray(input.workers) || input.workers.length !== 2) fail('Select the two main workers.');
  const ids = input.workers.map(w => w.workerId);
  if (new Set([...ids, input.helperId]).size !== 3 || [...ids, input.helperId].some(id => !names[id])) fail('Choose three different active workers.');
  if (typeof input.recordEarnings !== 'boolean') fail('Choose whether to record main-worker earnings.');
  const days = parseQuantity(input.days), rate = parseAmount(input.rate);
  if (days == null || rate == null) fail('Enter the helper’s days and daily rate.');
  const helperAmount = round2(days! * rate!);
  if (helperAmount <= 0 || helperAmount >= 1e10) fail('The helper amount is out of range.');
  let contributions: number[];
  if (input.costMode === 'BUSINESS') contributions = [0, 0];
  else if (input.costMode === 'EQUAL') {
    const first = Math.floor(Math.round(helperAmount * 100) / 2) / 100;
    contributions = [first, round2(helperAmount - first)];
  } else if (input.costMode === 'CUSTOM') {
    if (!Array.isArray(input.contributions) || input.contributions.length !== 2) fail('Enter both contributions.');
    contributions = input.contributions.map(v => {
      if (/^0(?:\.0{1,2})?$/.test(String(v).trim())) return 0;
      return parseAmount(v) ?? fail('Enter each contribution, using 0 for no contribution.');
    });
  } else return fail('Choose who covers the helper’s cost.');
  const businessContribution = round2(helperAmount - contributions[0] - contributions[1]);
  if (businessContribution < 0) fail('Worker contributions cannot exceed the helper’s earning.');
  if (!['UNPAID', 'BUSINESS', ...ids].includes(input.paidBy)) fail('Choose who paid the helper.');
  if (!['Cash', 'UPI', 'Bank'].includes(input.method)) fail('Choose a payment method.');
  const entries: SiteWorkEntry[] = [];
  const add = (workerId: string, kind: LedgerEntry['kind'], amount: number, description: string, extra: Partial<SiteWorkEntry> = {}) => {
    if (amount) entries.push({ workerId, kind, amount, description, date: input.date, site, ...extra });
  };
  if (input.recordEarnings) input.workers.forEach(w => {
    const amount = parseAmount(w.amount) ?? fail('Enter the original earning for each main worker.');
    add(w.workerId, 'WORK', amount, input.description?.trim().slice(0, 120) || 'Site work', { quantity: 1, unit: 'Job', rate: amount });
  });
  add(input.helperId, 'WORK', helperAmount, 'Helper work', { quantity: days, unit: 'Day', rate });
  ids.forEach((id, i) => add(id, 'CONTRIBUTION', contributions[i], `Helper contribution: ${names[input.helperId]}`));
  if (input.paidBy !== 'UNPAID') {
    const byBusiness = input.paidBy === 'BUSINESS';
    add(input.helperId, byBusiness ? 'PAYMENT' : 'THIRD_PARTY_PAYMENT', helperAmount,
      byBusiness ? 'Helper paid by business' : `Helper paid by ${names[input.paidBy]}`, { method: input.method });
    if (!byBusiness) add(input.paidBy, 'REIMBURSEMENT', helperAmount, `Credit for paying ${names[input.helperId]}`);
  }
  return { entries, helperAmount, contributions, businessContribution };
}
