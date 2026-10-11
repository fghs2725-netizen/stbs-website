'use client';

import { useRef, useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { BottomSheet } from '@/components/admin/shell/BottomSheet';
import { addSiteWorkAction, createWorkerAction } from '@/app/admin/(dashboard)/workers/actions';
import { formatRupees, parseAmount, parseQuantity, round2, todayIST, workerTotals } from '@/lib/worker-ledger';
import { planSiteWork, reconcileHelperFunding, siteWorkerEarning, type SiteWorkInput, type SiteWorkerInput, type SiteHelperInput } from '@/lib/site-work';
import { FormError } from './WorkerForms';

type Worker = { id: string; name: string };
const person = (workerId: string): SiteWorkerInput => ({ rowId: crypto.randomUUID(), workerId, basis: 'FIXED', quantity: '1', rate: '', amount: '' });
const helper = (workerId: string): SiteHelperInput => ({ ...person(workerId), basis: 'DAY', costMode: 'BUSINESS', contributions: {}, paidBy: 'UNPAID', method: 'Cash' });

function HelperEarnings({ value, onChange }: { value: SiteHelperInput; onChange: (patch: Partial<SiteHelperInput>) => void }) {
  let earning: ReturnType<typeof siteWorkerEarning> | null = null;
  try { earning = siteWorkerEarning(value); } catch { /* Incomplete fields are explained by the preview. */ }
  return <div className="space-y-2">
    <label className="a-label">Helper pay basis<select className="a-input mt-1" value={value.basis} onChange={e => onChange({ basis: e.target.value as SiteHelperInput['basis'] })}>
      <option value="DAY">Days × daily rate</option><option value="FEET">Feet × rate</option><option value="FIXED">Agreed amount</option>
    </select></label>
    {value.basis === 'FIXED' ? <label className="a-label">Helper amount (₹)<input className="a-input mt-1" inputMode="decimal" value={value.amount} onChange={e => onChange({ amount: e.target.value })} required /></label> : <div className="grid grid-cols-2 gap-3">
      <label className="a-label">{value.basis === 'DAY' ? 'Days worked' : 'Feet worked'}<input className="a-input mt-1" inputMode="decimal" value={value.quantity} onChange={e => onChange({ quantity: e.target.value })} required /></label>
      <label className="a-label">{value.basis === 'DAY' ? 'Daily rate (₹)' : 'Rate per foot (₹)'}<input className="a-input mt-1" inputMode="decimal" value={value.rate} onChange={e => onChange({ rate: e.target.value })} required /></label>
    </div>}
    {earning && <p className="a-num text-sm">Helper earns {formatRupees(earning.amount)}</p>}
  </div>;
}

export function SiteWorkForm({ workers }: { workers: Worker[] }) {
  const router = useRouter();
  const [created, setCreated] = useState<Worker[]>([]);
  const catalog = [...workers, ...created.filter(w => !workers.some(p => p.id === w.id))];
  const names = Object.fromEntries(catalog.map(w => [w.id, w.name]));
  const [draft, setDraft] = useState<SiteWorkInput | null>(null);
  const [error, setError] = useState('');
  const [pending, start] = useTransition();
  const saving = useRef(false);
  const creating = useRef(false);
  const [newPerson, setNewPerson] = useState<{ type: 'WORKER' | 'HELPER'; name: string; phone: string } | null>(null);
  const [personError, setPersonError] = useState('');
  const [personPending, startPerson] = useTransition();
  const set = (patch: Partial<SiteWorkInput>) => setDraft(d => d ? { ...d, ...patch } : d);
  const updateHelper = (rowId: string | undefined, patch: Partial<SiteHelperInput>) => setDraft(d => d ? { ...d, helpers: d.helpers.map(h => h.rowId === rowId ? { ...h, ...patch } : h) } : d);
  const removeWorker = (id: string) => setDraft(d => {
    if (!d) return d;
    const crew = d.workers.filter(w => w.workerId !== id);
    return { ...d, workers: crew, helpers: reconcileHelperFunding(d.helpers, crew.map(w => w.workerId)) };
  });
  const addPerson = (id: string, type: 'WORKER' | 'HELPER') => setDraft(d => d ? type === 'WORKER' ? { ...d, workers: [...d.workers, person(id)] } : { ...d, helpers: [...d.helpers, helper(id)] } : d);
  let preview: ReturnType<typeof planSiteWork> | null = null;
  let previewError = '';
  if (draft) {
    try { preview = planSiteWork(draft, names); }
    catch (e) { previewError = e instanceof Error ? e.message : 'Complete the form.'; }
  }
  const footage = parseQuantity(draft?.footage), rate = parseAmount(draft?.rate);
  const total = footage != null && rate != null ? round2(footage * rate) : null;
  const open = () => {
    setError(''); setNewPerson(null); setPersonError('');
    setDraft({ requestId: crypto.randomUUID(), site: '', date: todayIST(), description: 'Borewell drilling',
      footage: '', rate: '', workerSplit: 'EQUAL', workers: [], helpers: [], recordEarnings: true });
  };
  const createPerson = () => {
    if (!newPerson || creating.current) return;
    if (!newPerson.name.trim()) { setPersonError('Enter the person’s name.'); return; }
    creating.current = true; setPersonError('');
    startPerson(async () => {
      try {
        const result = await createWorkerAction({ name: newPerson.name, phone: newPerson.phone, role: newPerson.type === 'HELPER' ? 'Helper' : undefined });
        if (!result.ok) { setPersonError(result.error); return; }
        if (!result.id) { setPersonError('Could not add the person.'); return; }
        setCreated(old => [...old, { id: result.id!, name: newPerson.name.trim() }]);
        addPerson(result.id, newPerson.type);
        setNewPerson(null);
      } catch { setPersonError('Could not confirm creation. Check the worker list before trying again.'); }
      finally { creating.current = false; }
    });
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!draft || saving.current || creating.current || newPerson) return;
    if (!preview) { setError(previewError); return; }
    saving.current = true; setError('');
    start(async () => {
      try {
        const result = await addSiteWorkAction(draft);
        if (!result.ok) { setError(result.error); return; }
        setDraft(null); router.refresh();
      } catch { setError('Could not confirm the save. Retry with this form to avoid duplicate entries.'); }
      finally { saving.current = false; }
    });
  };
  const available = catalog.filter(w => !draft?.workers.some(v => v.workerId === w.id) && !draft?.helpers.some(v => v.workerId === w.id));
  return <>
    <button type="button" className="a-btn a-btn-secondary" onClick={open}>Add site work</button>
    <BottomSheet open={!!draft} title="Add site work" onClose={() => { if (!saving.current && !creating.current) setDraft(null); }}>
      {draft && <form onSubmit={submit} className="space-y-4">
        <fieldset disabled={pending || personPending} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="a-label">Site<input className="a-input mt-1" value={draft.site} onChange={e => set({ site: e.target.value })} placeholder="Nextra City" maxLength={120} required /></label>
            <label className="a-label">Date<input className="a-input mt-1" type="date" value={draft.date} onChange={e => set({ date: e.target.value })} required /></label>
          </div>
          <label className="a-label">1. How many feet drilled?{!draft.workers.length && ' (optional for helpers only)'}<input className="a-input mt-1" inputMode="decimal" placeholder="e.g. 200" value={draft.footage} onChange={e => set({ footage: e.target.value })} required={draft.workers.length > 0} /></label>
          <section className="space-y-3" aria-label="Choose crew">
            <h3 className="font-semibold">2. Choose workers and helpers</h3>
            <p className="text-sm">You can select only helpers; no main worker is required.</p>
            {draft.workers.map(w => <div key={w.rowId} className="flex items-center justify-between gap-2"><span>{names[w.workerId]}</span><button className="a-btn a-btn-secondary a-btn-sm" type="button" aria-label={`Remove worker ${names[w.workerId]}`} onClick={() => removeWorker(w.workerId)}>Remove</button></div>)}
            <label className="a-label">Add worker<select className="a-input mt-1" value="" onChange={e => { if (e.target.value) addPerson(e.target.value, 'WORKER'); }}><option value="">Choose a worker</option>{available.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select></label>
            <button type="button" className="a-link text-sm" onClick={() => { setNewPerson({ type: 'WORKER', name: '', phone: '' }); setPersonError(''); }}>+ Create new worker here</button>
            {draft.helpers.map(h => <div key={h.rowId} className="flex items-center justify-between gap-2"><span>{names[h.workerId]} · Helper</span><button className="a-btn a-btn-secondary a-btn-sm" type="button" aria-label={`Remove helper ${names[h.workerId]}`} onClick={() => set({ helpers: draft.helpers.filter(v => v.rowId !== h.rowId) })}>Remove</button></div>)}
            <label className="a-label">Add helper (optional)<select className="a-input mt-1" value="" onChange={e => { if (e.target.value) addPerson(e.target.value, 'HELPER'); }}><option value="">Choose a helper</option>{available.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select></label>
            <button type="button" className="a-link text-sm" onClick={() => { setNewPerson({ type: 'HELPER', name: '', phone: '' }); setPersonError(''); }}>+ Create new helper here</button>
            {newPerson && <section className="a-card p-3 space-y-3" aria-label="Create person">
              <h4 className="font-semibold">New {newPerson.type === 'HELPER' ? 'helper' : 'worker'}</h4>
              <label className="a-label">Name<input className="a-input mt-1" value={newPerson.name} maxLength={80} onChange={e => setNewPerson({ ...newPerson, name: e.target.value })} /></label>
              <label className="a-label">Phone (optional)<input className="a-input mt-1" value={newPerson.phone} inputMode="tel" maxLength={20} onChange={e => setNewPerson({ ...newPerson, phone: e.target.value })} /></label>
              <p className="text-sm">Saved to Workers immediately and selected for this site.</p>
              <FormError message={personError} />
              <div className="flex gap-2"><button type="button" className="a-btn a-btn-primary" onClick={createPerson}>{personPending ? 'Adding…' : 'Create & select'}</button><button type="button" className="a-btn a-btn-secondary" onClick={() => setNewPerson(null)}>Cancel</button></div>
            </section>}
          </section>
          {draft.workers.length > 0 && <>
          <label className="a-label">3. Crew labour rate per foot (₹)<input className="a-input mt-1" inputMode="decimal" placeholder="e.g. 75" value={draft.rate} onChange={e => set({ rate: e.target.value })} required /></label>
          <p className="a-num text-sm">{total != null ? `${footage} feet × ${formatRupees(rate!)} = ${formatRupees(total)} for the main crew` : 'Enter feet and rate to calculate the main crew’s total.'} Helper costs are entered below.</p>
          <label className="a-label">4. Split the crew amount<select className="a-input mt-1" value={draft.workerSplit} onChange={e => set({ workerSplit: e.target.value as SiteWorkInput['workerSplit'] })}><option value="EQUAL">Equal shares among selected workers</option><option value="CUSTOM">Custom amount for each worker</option></select></label>
          {draft.workerSplit === 'CUSTOM' && draft.workers.map(w => <label key={w.rowId} className="a-label">{names[w.workerId]} share (₹)<input className="a-input mt-1" inputMode="decimal" value={w.amount} onChange={e => set({ workers: draft.workers.map(v => v.rowId === w.rowId ? { ...v, amount: e.target.value } : v) })} required /></label>)}
          <label className="a-label">Record main-worker earnings<select className="a-input mt-1" value={draft.recordEarnings ? 'NEW' : 'EXISTING'} onChange={e => set({ recordEarnings: e.target.value === 'NEW' })}><option value="NEW">Add the shares to their accounts</option><option value="EXISTING">Already recorded — only add helper entries</option></select></label>
          </>}
          {draft.helpers.map(h => <section key={h.rowId} className="a-card p-3 space-y-3" aria-label={`${names[h.workerId]} helper details`}>
            <h3 className="font-semibold">{names[h.workerId]} · Helper</h3>
            <HelperEarnings value={h} onChange={patch => updateHelper(h.rowId, patch)} />
            {draft.workers.length > 0 ? <label className="a-label">Who covers this helper’s cost?<select className="a-input mt-1" value={h.costMode} onChange={e => updateHelper(h.rowId, { costMode: e.target.value as SiteHelperInput['costMode'] })}><option value="BUSINESS">Business pays extra</option><option value="EQUAL">Deduct equally from main workers</option><option value="CUSTOM">Custom worker contributions</option></select></label> : <p className="text-sm">Business covers this helper’s cost.</p>}
            {h.costMode === 'CUSTOM' && <><p className="text-sm">The business covers any remainder.</p>{draft.workers.map(w => <label key={w.rowId} className="a-label">{names[w.workerId]} contribution (₹)<input className="a-input mt-1" inputMode="decimal" value={h.contributions[w.workerId] ?? '0'} onChange={e => updateHelper(h.rowId, { contributions: { ...h.contributions, [w.workerId]: e.target.value } })} required /></label>)}</>}
            <label className="a-label">Who actually paid this helper?<select className="a-input mt-1" value={h.paidBy} onChange={e => updateHelper(h.rowId, { paidBy: e.target.value })}><option value="UNPAID">Not paid yet</option><option value="BUSINESS">Business paid</option>{draft.workers.map(w => <option key={w.workerId} value={w.workerId}>{names[w.workerId]} paid personally</option>)}</select></label>
            {h.paidBy !== 'UNPAID' && <><label className="a-label">Payment method<select className="a-input mt-1" value={h.method} onChange={e => updateHelper(h.rowId, { method: e.target.value })}>{['Cash', 'UPI', 'Bank'].map(m => <option key={m}>{m}</option>)}</select></label><p className="text-sm">Records full payment on the selected date. Do not add it again if already recorded.</p></>}
          </section>)}
          <section aria-label="Booking preview" aria-live="polite" className="a-card p-3 space-y-2 text-sm">
            <h3 className="font-semibold">Preview before saving</h3>
            {preview ? <>
              <p>{draft.workers.length > 0 && <>Main crew: {formatRupees(preview.crewAmount)} · </>}Helpers: {formatRupees(preview.helperAmount)}</p>
              {draft.workers.map(w => {
                const entries = preview!.entries.filter(e => e.workerId === w.workerId).map((e, i) => ({ ...e, id: String(i), createdAt: '' }));
                const totals = workerTotals(0, entries);
                return <p key={w.workerId}>{names[w.workerId]}: {formatRupees(preview!.workerShares[w.workerId])} share{!draft.recordEarnings && ' (already recorded)'} − {formatRupees(totals.contributions)} helper costs + {formatRupees(totals.reimbursements)} payment credit. Account change: {formatRupees(totals.balance)}.</p>;
              })}
              {preview.helpers.map(h => <p key={h.workerId}>{names[h.workerId]}: {formatRupees(h.amount)} {h.paidBy === 'UNPAID' ? 'still to pay' : 'paid in full'}</p>)}
              <p>{draft.recordEarnings || !draft.workers.length ? 'Total labour cost' : 'Additional labour cost from this booking'}: {formatRupees(preview.labourCost)}</p>
              <p>Existing balances and advances are kept.</p>
            </> : <p>{previewError}</p>}
          </section>
          <FormError message={error} />
          <button type="submit" className="a-btn a-btn-primary w-full" disabled={pending || personPending || !!newPerson || !preview}>{pending ? 'Saving…' : 'Save site work'}</button>
        </fieldset>
      </form>}
    </BottomSheet>
  </>;
}
