'use client';

import { useRef, useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { BottomSheet } from '@/components/admin/shell/BottomSheet';
import { addSiteWorkAction } from '@/app/admin/(dashboard)/workers/actions';
import { formatRupees, todayIST } from '@/lib/worker-ledger';
import { planSiteWork, type SiteWorkInput } from '@/lib/site-work';
import { FormError } from './WorkerForms';

type Worker = { id: string; name: string };

export function SiteWorkForm({ workers }: { workers: Worker[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState<SiteWorkInput | null>(null);
  const [error, setError] = useState('');
  const [pending, start] = useTransition();
  const saving = useRef(false);
  const names = Object.fromEntries(workers.map(w => [w.id, w.name]));
  const set = (patch: Partial<SiteWorkInput>) => setDraft(d => d ? { ...d, ...patch } : d);
  let preview: ReturnType<typeof planSiteWork> | null = null;
  let previewError = '';
  if (draft) {
    try { preview = planSiteWork(draft, names); }
    catch (e) { previewError = e instanceof Error ? e.message : 'Complete the form.'; }
  }
  const open = () => {
    setError('');
    setDraft({ requestId: crypto.randomUUID(), site: '', date: todayIST(), description: 'Site work',
      workers: [{ workerId: '', amount: '' }, { workerId: '', amount: '' }], recordEarnings: false,
      helperId: '', days: '1', rate: '', costMode: 'BUSINESS', contributions: ['0', '0'], paidBy: 'UNPAID', method: 'Cash' });
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!draft || saving.current) return;
    if (!preview) { setError(previewError); return; }
    saving.current = true;
    setError('');
    start(async () => {
      try {
        const result = await addSiteWorkAction(draft);
        if (!result.ok) { setError(result.error); return; }
        setDraft(null);
        router.refresh();
      } catch { setError('Could not confirm the save. Retry with this form to avoid duplicate entries.'); }
      finally { saving.current = false; }
    });
  };
  return <>
    <button type="button" className="a-btn a-btn-secondary" onClick={open}>Add site work</button>
    <BottomSheet open={!!draft} title="Site work & helper" onClose={() => { if (!saving.current) setDraft(null); }}>
      {draft && <form onSubmit={submit} className="space-y-4">
        <p className="text-sm" style={{ color: 'var(--a-muted)' }}>Record the helper’s work, choose who covers it, and keep all three accounts together. Add a new helper with “Add worker” first.</p>
        <fieldset disabled={pending} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="a-label">Site<input className="a-input mt-1" value={draft.site} onChange={e => set({ site: e.target.value })} placeholder="Nextra City" maxLength={120} required /></label>
            <label className="a-label">Work / settlement date<input className="a-input mt-1" type="date" value={draft.date} onChange={e => set({ date: e.target.value })} required /></label>
          </div>
          <label className="a-label">Main-worker earnings
            <select className="a-input mt-1" value={draft.recordEarnings ? 'NEW' : 'EXISTING'} onChange={e => set({ recordEarnings: e.target.value === 'NEW' })}>
              <option value="EXISTING">Already recorded — add helper adjustments only</option>
              <option value="NEW">Record earnings with this booking</option>
            </select>
          </label>
          {draft.recordEarnings && <label className="a-label">Work description<input className="a-input mt-1" value={draft.description} onChange={e => set({ description: e.target.value })} maxLength={120} /></label>}
          {draft.workers.map((row, i) => <div key={i} className="grid grid-cols-2 gap-3">
            <label className="a-label">Main worker {i + 1}
              <select className="a-input mt-1" value={row.workerId} required onChange={e => set({ workers: draft.workers.map((w, n) => n === i ? { ...w, workerId: e.target.value } : w), paidBy: 'UNPAID' })}>
                <option value="">Select worker</option>{workers.map(w => <option key={w.id} value={w.id} disabled={w.id === draft.helperId || draft.workers.some((v, n) => n !== i && v.workerId === w.id)}>{w.name}</option>)}
              </select>
            </label>
            {draft.recordEarnings && <label className="a-label">Original earning (₹)<input className="a-input mt-1" inputMode="decimal" value={row.amount} onChange={e => set({ workers: draft.workers.map((w, n) => n === i ? { ...w, amount: e.target.value } : w) })} required /></label>}
          </div>)}
          <label className="a-label">Extra helper
            <select className="a-input mt-1" value={draft.helperId} required onChange={e => set({ helperId: e.target.value })}>
              <option value="">Select helper</option>{workers.map(w => <option key={w.id} value={w.id} disabled={draft.workers.some(v => v.workerId === w.id)}>{w.name}</option>)}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="a-label">Days worked<input className="a-input mt-1" inputMode="decimal" value={draft.days} onChange={e => set({ days: e.target.value })} required /></label>
            <label className="a-label">Daily rate (₹)<input className="a-input mt-1" inputMode="decimal" value={draft.rate} onChange={e => set({ rate: e.target.value })} required /></label>
          </div>
          <label className="a-label">Who covers the helper’s cost?
            <select className="a-input mt-1" value={draft.costMode} onChange={e => set({ costMode: e.target.value as SiteWorkInput['costMode'] })}>
              <option value="BUSINESS">Business pays the cost</option><option value="EQUAL">Both main workers share equally</option><option value="CUSTOM">Custom split / one worker pays</option>
            </select>
          </label>
          {draft.costMode === 'CUSTOM' && <div className="space-y-2">
            <p className="text-sm">Enter each worker’s contribution. The business covers the remainder.</p>
            {draft.workers.map((w, i) => <label key={i} className="a-label">{names[w.workerId] || `Worker ${i + 1}`} contribution (₹)<input className="a-input mt-1" inputMode="decimal" value={draft.contributions[i]} onChange={e => set({ contributions: draft.contributions.map((v, n) => n === i ? e.target.value : v) })} required /></label>)}
          </div>}
          <label className="a-label">Who actually paid the helper?
            <select className="a-input mt-1" value={draft.paidBy} onChange={e => set({ paidBy: e.target.value })}>
              <option value="UNPAID">Not paid yet</option><option value="BUSINESS">Business paid</option>
              {draft.workers.filter(w => w.workerId).map(w => <option key={w.workerId} value={w.workerId}>{names[w.workerId]} paid personally</option>)}
            </select>
          </label>
          {draft.paidBy !== 'UNPAID' && <>
            <label className="a-label">Payment method<select className="a-input mt-1" value={draft.method} onChange={e => set({ method: e.target.value })}>{['Cash', 'UPI', 'Bank'].map(m => <option key={m}>{m}</option>)}</select></label>
            <p className="text-sm">This records the full helper payment on the selected date. Use “Not paid yet” if recording earnings only. Do not record a payment here that is already in the helper’s account.</p>
          </>}
          <section aria-label="Booking preview" aria-live="polite" className="rounded-xl p-3 space-y-2 text-sm" style={{ background: 'var(--a-surface-alt, #f4f5f7)', color: 'var(--a-ink)' }}>
            <p className="font-semibold">Preview before saving</p>
            {preview ? <>
              <p>Helper earns {formatRupees(preview.helperAmount)} · Business cost share {formatRupees(preview.businessContribution)}</p>
              {draft.workers.map((w, i) => <p key={w.workerId}>{names[w.workerId]}: {draft.recordEarnings ? `${formatRupees(Number(w.amount.replace(/[,₹\s]/g, '')))} original − ` : 'Deduct '}{formatRupees(preview!.contributions[i])} contribution{draft.paidBy === w.workerId ? ` + ${formatRupees(preview!.helperAmount)} credit for paying helper` : ''}</p>)}
              <p>Helper: {draft.paidBy === 'UNPAID' ? `${formatRupees(preview.helperAmount)} still to pay` : 'paid in full'}</p>
              <p>These are changes from this booking; existing balances and advances are kept.</p>
            </> : <p>{previewError}</p>}
          </section>
          <FormError message={error} />
          <button type="submit" className="a-btn a-btn-primary w-full" disabled={pending || !preview}>{pending ? 'Saving…' : 'Save site work'}</button>
        </fieldset>
      </form>}
    </BottomSheet>
  </>;
}
