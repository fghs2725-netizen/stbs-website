import type { Prisma } from '@prisma/client';
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { planSiteWork, type SiteWorkInput } from './site-work';

type EntryRecord = Prisma.WorkerEntryGetPayload<object>;
export class SiteWorkSaveError extends Error {}
export const bookingRevision = (rows: EntryRecord[]) => createHash('sha256').update(JSON.stringify([...rows].sort((a, b) => a.id.localeCompare(b.id)))).digest('hex');

/** Called inside a serializable transaction: replace a whole booking or change nothing. */
export async function replaceSiteWork(tx: Prisma.TransactionClient, entryId: string, prefix: string, revision: string, input: SiteWorkInput): Promise<void> {
  const retry = await tx.auditLog.findUnique({ where: { id: `sitework_${input.requestId}` } });
  if (retry) {
    const saved = retry.metadata as { input?: SiteWorkInput; previous?: string; revision?: string } | null;
    if (saved?.previous !== prefix || saved.revision !== revision || !isDeepStrictEqual(saved.input, JSON.parse(JSON.stringify(input)))) throw new SiteWorkSaveError('This save was already used with different details. Refresh and reopen the booking.');
    if (!await tx.workerEntry.count({ where: { id: { startsWith: `sw_${input.requestId}_` }, deletedAt: null } })) throw new SiteWorkSaveError('The saved booking has since changed or been removed. Refresh the account.');
    return;
  }
  const rows = await tx.workerEntry.findMany({ where: { id: { startsWith: prefix }, deletedAt: null } });
  if (!rows.some(r => r.id === entryId) || bookingRevision(rows) !== revision) throw new SiteWorkSaveError('This booking changed while you were editing. Refresh and reopen it before saving.');
  const prior = await tx.auditLog.findUnique({ where: { id: `sitework_${prefix.slice(3, -1)}` } });
  const oldInput = (prior?.metadata as { input?: SiteWorkInput } | null)?.input;
  const oldIds = [...rows.map(r => r.workerId), ...(oldInput ? [...oldInput.workers, ...oldInput.helpers].map(w => w.workerId) : [])];
  const workers = await tx.worker.findMany({ where: { deletedAt: null, OR: [{ active: true }, { id: { in: oldIds } }] }, select: { id: true, name: true } });
  let plan: ReturnType<typeof planSiteWork>;
  try { plan = planSiteWork(input, Object.fromEntries(workers.map(w => [w.id, w.name]))); }
  catch (e) { throw new SiteWorkSaveError(e instanceof Error ? e.message : 'Check the site work details.'); }
  await tx.workerEntry.updateMany({ where: { id: { startsWith: prefix }, deletedAt: null }, data: { deletedAt: new Date() } });
  await tx.workerEntry.createMany({ data: plan.entries.map((entry, i) => ({ ...entry, id: `sw_${input.requestId}_${String(i).padStart(6, '0')}` })) });
  await tx.auditLog.create({ data: { id: `sitework_${input.requestId}`, action: 'UPDATED', entityType: 'SiteWork', entityId: `sw_${input.requestId}_`, metadata: { input: JSON.parse(JSON.stringify(input)), previous: prefix, revision } } });
}
