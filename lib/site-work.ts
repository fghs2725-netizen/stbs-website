import { isIsoDate, parseAmount, parseQuantity, round2, type LedgerEntry } from './worker-ledger';

export type SiteWorkerInput = {
  rowId?: string; workerId: string; basis: 'FEET' | 'DAY' | 'FIXED';
  quantity: string; rate: string; amount: string;
};
export type SiteHelperInput = SiteWorkerInput & {
  costMode: 'BUSINESS' | 'EQUAL' | 'CUSTOM'; contributions: Record<string, string>;
  paidBy: string; // UNPAID, BUSINESS, or a main worker ID
  method: string;
};
export type SiteWorkInput = {
  requestId: string; site: string; date: string; description: string;
  footage: string; rate: string; workerSplit: 'EQUAL' | 'CUSTOM';
  crewBasis?: 'FOOTAGE' | 'FIXED';
  workers: SiteWorkerInput[]; recordEarnings: boolean; helpers: SiteHelperInput[];
};
export type SiteWorkEntry = Omit<LedgerEntry, 'id' | 'createdAt'> & { workerId: string };

// Deterministic IDs group the atomic booking and make retrying a save idempotent.
// Existing bookings keep their IDs and need no data migration.
export function siteWorkPrefix(id: string): string | null {
  return /^(sw_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}_)\d+$/.exec(id)?.[1] ?? null;
}

export function siteWorkerEarning(worker: SiteWorkerInput) {
  if (worker.basis === 'FIXED') {
    const amount = parseAmount(worker.amount);
    if (amount == null) throw new Error('Enter the agreed earning amount.');
    return { amount, quantity: 1, unit: 'Job', rate: amount };
  }
  if (worker.basis !== 'FEET' && worker.basis !== 'DAY') throw new Error('Choose per foot, per day, or agreed amount.');
  const quantity = parseQuantity(worker.quantity), rate = parseAmount(worker.rate);
  if (quantity == null || rate == null) throw new Error('Enter the work quantity and rate.');
  const amount = round2(quantity * rate);
  if (amount <= 0 || amount >= 1e10) throw new Error('The earning amount is out of range.');
  return { amount, quantity, unit: worker.basis === 'FEET' ? 'Rft' : 'Day', rate };
}

/** Funding belongs to worker IDs, so removing/reordering rows cannot transfer a deduction. */
export function reconcileHelperFunding(helpers: SiteHelperInput[], workerIds: string[]): SiteHelperInput[] {
  return helpers.map(h => ({ ...h,
    costMode: workerIds.length ? h.costMode : 'BUSINESS',
    contributions: Object.fromEntries(Object.entries(h.contributions).filter(([id]) => workerIds.includes(id))),
    paidBy: ['UNPAID', 'BUSINESS', ...workerIds].includes(h.paidBy) ? h.paidBy : 'UNPAID',
  }));
}

export function planSiteWork(input: SiteWorkInput, names: Record<string, string>) {
  const fail = (message: string): never => { throw new Error(message); };
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(input.requestId)) fail('Please reopen the site work form.');
  const site = input.site?.trim();
  if (!site || site.length > 120) fail('Enter a site name of up to 120 characters.');
  if (!isIsoDate(input.date)) fail('Choose a valid work date.');
  if (!Array.isArray(input.workers) || !Array.isArray(input.helpers)) fail('Please reopen the updated site work form.');
  if (!input.workers.length && !input.helpers.length) fail('Choose at least one worker or helper.');
  const ids = input.workers.map(w => w.workerId);
  const allIds = [...ids, ...input.helpers.map(h => h.workerId)];
  if (new Set(allIds).size !== allIds.length || allIds.some(id => !Object.prototype.hasOwnProperty.call(names, id))) fail('Choose a different active person for every worker and helper.');
  if (typeof input.recordEarnings !== 'boolean') fail('Choose whether to record main-worker earnings.');
  const footage = parseQuantity(input.footage), crewRate = parseAmount(input.rate);
  const fixed = input.crewBasis === 'FIXED';
  if (ids.length && input.recordEarnings && (crewRate == null || (!fixed && footage == null))) fail('Enter the crew amount or feet drilled and rate per foot.');
  const crewAmount = ids.length ? round2(fixed ? crewRate ?? 0 : (footage ?? 0) * (crewRate ?? 0)) : 0;
  if (ids.length && ((input.recordEarnings && crewAmount <= 0) || crewAmount >= 1e10)) fail('The crew earning amount is out of range.');
  let workerShares: Record<string, number>;
  if (!ids.length) workerShares = {};
  else if (input.workerSplit === 'EQUAL') {
    const paise = Math.round(crewAmount * 100), each = Math.floor(paise / ids.length), remainder = paise % ids.length;
    workerShares = Object.fromEntries(ids.map((id, i) => [id, (each + (i >= ids.length - remainder ? 1 : 0)) / 100]));
  } else if (input.workerSplit === 'CUSTOM') {
    workerShares = Object.fromEntries(input.workers.map(w => [w.workerId, /^0(?:\.0{1,2})?$/.test(w.amount.trim()) ? 0 : parseAmount(w.amount) ?? fail('Enter each worker’s share, using 0 if needed.')]));
    if (round2(Object.values(workerShares).reduce((sum, amount) => sum + amount, 0)) !== crewAmount) fail('Worker shares must add up to the total feet × rate amount.');
  } else return fail('Choose how to split the crew amount.');
  const entries: SiteWorkEntry[] = [];
  const add = (workerId: string, kind: LedgerEntry['kind'], amount: number, description: string, extra: Partial<SiteWorkEntry> = {}) => {
    if (amount) entries.push({ workerId, kind, amount, description, date: input.date, site, ...extra });
  };
  if (input.recordEarnings) input.workers.forEach(w => {
    const amount = workerShares[w.workerId];
    // The footage is one shared job, not repeated full earnings for each worker.
    add(w.workerId, 'WORK', amount, `${input.description?.trim().slice(0, 50) || 'Borewell'} · ${fixed ? `₹${crewRate} crew total` : `${footage} Rft × ₹${crewRate}`} · crew share`, { quantity: 1, unit: 'Share', rate: amount });
  });
  const helperPlans = input.helpers.map(helper => {
    if (!ids.length && helper.costMode !== 'BUSINESS') fail('For a helper-only booking, choose business pays the helper cost.');
    const earning = siteWorkerEarning(helper);
    let contributions: Record<string, number>;
    if (helper.costMode === 'BUSINESS') contributions = Object.fromEntries(ids.map(id => [id, 0]));
    else if (helper.costMode === 'EQUAL') {
      if (!ids.length) fail('Add main workers to share a helper’s cost, or choose business pays.');
      const paise = Math.round(earning.amount * 100);
      const each = Math.floor(paise / ids.length), remainder = paise % ids.length;
      // Assign leftover paise to the last rows; every split sums exactly to the earning.
      contributions = Object.fromEntries(ids.map((id, i) => [id, (each + (i >= ids.length - remainder ? 1 : 0)) / 100]));
    } else if (helper.costMode === 'CUSTOM') {
      if (!helper.contributions || typeof helper.contributions !== 'object' || Array.isArray(helper.contributions)) fail('Enter the worker contributions.');
      if (Object.keys(helper.contributions).some(id => !ids.includes(id))) fail('A helper contribution refers to a removed worker. Review the split.');
      contributions = Object.fromEntries(ids.map(id => {
        const value = helper.contributions[id] ?? '0';
        const amount = /^0(?:\.0{1,2})?$/.test(String(value).trim()) ? 0 : parseAmount(value);
        return [id, amount ?? fail('Enter each contribution, using 0 for no contribution.')];
      }));
    } else return fail('Choose who covers each helper’s cost.');
    const businessContribution = round2(earning.amount - Object.values(contributions).reduce((a, b) => a + b, 0));
    if (businessContribution < 0) fail('Worker contributions cannot exceed the helper’s earning.');
    if (!['UNPAID', 'BUSINESS', ...ids].includes(helper.paidBy)) fail('Choose who paid each helper.');
    if (!['Cash', 'UPI', 'Bank'].includes(helper.method)) fail('Choose a payment method.');
    add(helper.workerId, 'WORK', earning.amount, 'Helper work', earning);
    ids.forEach(id => add(id, 'CONTRIBUTION', contributions[id], `Helper contribution: ${names[helper.workerId]}`));
    if (helper.paidBy !== 'UNPAID') {
      const byBusiness = helper.paidBy === 'BUSINESS';
      add(helper.workerId, byBusiness ? 'PAYMENT' : 'THIRD_PARTY_PAYMENT', earning.amount,
        byBusiness ? 'Helper paid by business' : `Helper paid by ${names[helper.paidBy]}`, { method: helper.method });
      if (!byBusiness) add(helper.paidBy, 'REIMBURSEMENT', earning.amount, `Credit for paying ${names[helper.workerId]}`);
    }
    return { workerId: helper.workerId, amount: earning.amount, contributions, businessContribution, paidBy: helper.paidBy };
  });
  if (!entries.length) fail('Record worker earnings or add a helper before saving.');
  const helperAmount = round2(helperPlans.reduce((sum, h) => sum + h.amount, 0));
  const businessContribution = round2(helperPlans.reduce((sum, h) => sum + h.businessContribution, 0));
  const labourCost = round2(entries.reduce((sum, e) => sum + (e.kind === 'WORK' ? e.amount : e.kind === 'CONTRIBUTION' ? -e.amount : 0), 0));
  return { entries, helpers: helperPlans, helperAmount, businessContribution, labourCost, crewAmount, workerShares };
}
