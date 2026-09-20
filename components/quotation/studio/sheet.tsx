"use client";
import { useCallback, useState } from "react";
import { Eye } from "lucide-react";
import { defaultSubject, serviceOptions, type ClientDetails, type QuotationItem } from "../quotation-model";
import { duplicateItem, isPopulatedItem, moveItem } from "../editor-logic";
import { ConfirmDialog } from "../feedback";
import type { ReusableClient } from "@/lib/quotation-management";
import { ClientBlock } from "./client-block";
import { LineItems } from "./line-items";
import { Totals } from "./totals";
import { VALIDITY_PRESETS, fromIsoDate, toIsoDate } from "./studio-logic";
import type { useQuotationSession } from "./use-quotation-session";

type Session = ReturnType<typeof useQuotationSession>;
const blankItem = (preset?: { description: string; unit: string }): QuotationItem => ({ id: crypto.randomUUID(), description: preset?.description ?? "", unit: preset?.unit ?? "", quantity: 1, rate: 0 });

/**
 * The editable quotation page. Fields sit where they print, with no borders until you touch them,
 * so filling it in feels like typing on the document. Pages 2-3 (profile, terms) are fixed and only previewed.
 */
export function Sheet({ s, clients, onPreview }: { s: Session; clients: ReusableClient[]; onPreview: () => void }) {
  const { q, setQ, patch, totals } = s;
  const [focusId, setFocusId] = useState<string | null>(null);
  const [confirmRow, setConfirmRow] = useState<string | null>(null);
  const [subjectEdited, setSubjectEdited] = useState(() => q.subject.trim() !== "" && q.subject !== defaultSubject(q));

  const setService = (serviceType: string) => setQ((x) => ({ ...x, serviceType, subject: subjectEdited ? x.subject : defaultSubject({ ...x, serviceType }) }));
  const setCustomService = (customServiceType: string) => setQ((x) => ({ ...x, customServiceType, subject: subjectEdited ? x.subject : defaultSubject({ ...x, customServiceType }) }), "custom-service");
  const setClientField = (field: keyof ClientDetails, value: string) => setQ((x) => ({ ...x, client: { ...x.client, [field]: value } }), `client:${field}`);
  const pickClient = (c: ReusableClient) => setQ((x) => ({ ...x, clientId: c.id, saveClientForFuture: false, client: { gstin: c.gstin, companyName: c.companyName, contactPerson: c.contactPerson, addressLine1: c.addressLine1, addressLine2: c.addressLine2, city: c.city, state: c.state, pinCode: c.pinCode, phone: c.phone, email: c.email } }));

  const editItem = useCallback((id: string, changes: Partial<QuotationItem>, key: string) => setQ((x) => ({ ...x, items: x.items.map((i) => (i.id === id ? { ...i, ...changes } : i)) }), key), [setQ]);
  const addItem = useCallback((preset?: { description: string; unit: string }) => { const item = blankItem(preset); setQ((x) => ({ ...x, items: [...x.items, item] })); setFocusId(item.id); }, [setQ]);
  const removeNow = useCallback((id: string) => setQ((x) => ({ ...x, items: x.items.filter((i) => i.id !== id) })), [setQ]);
  const requestRemove = (id: string) => { const item = q.items.find((i) => i.id === id); if (item && isPopulatedItem(item)) setConfirmRow(id); else removeNow(id); };
  const dupItem = (id: string) => { const nid = crypto.randomUUID(); setQ((x) => ({ ...x, items: duplicateItem(x.items, id, nid) })); setFocusId(nid); };
  const moveRow = (from: number, to: number) => setQ((x) => ({ ...x, items: moveItem(x.items, from, to) }));

  const iso = toIsoDate(q.quotationDate);
  const autoSubject = defaultSubject(q).trim();

  return (
    <article className="qs-paper" aria-label="Quotation">
      <img className="qs-banner" src="/quotation/banner/stbs-premium-banner.png" alt="Saini Tubewell Boring Service" />

      <header className="qs-head">
        <p className="qs-eyebrow">Commercial quotation</p>
        <div className="qs-service">
          <label className="qs-sr" htmlFor="qs-service">Service type</label>
          <select id="qs-service" data-qs-target="service" value={q.serviceType} onChange={(e) => setService(e.target.value)}>
            {serviceOptions.map((x) => <option key={x}>{x}</option>)}
          </select>
          {q.serviceType === "Custom" && (
            <input data-qs-target="service-custom" aria-label="Custom service name" aria-invalid={!q.customServiceType.trim() || undefined} className="qs-line qs-strong" placeholder="Name the service" value={q.customServiceType} onChange={(e) => setCustomService(e.target.value)} />
          )}
        </div>
      </header>

      <div className="qs-meta">
        <div className="qs-field">
          <span className="qs-eyebrow">Reference</span>
          <strong className={q.quotationReference ? undefined : "qs-pending"}>{q.quotationReference || "Assigned when first saved"}</strong>
        </div>
        <div className="qs-field">
          <label className="qs-eyebrow" htmlFor="qs-date">Date</label>
          <input id="qs-date" type="date" className="qs-line" value={iso} onChange={(e) => { const next = fromIsoDate(e.target.value); if (next) patch({ quotationDate: next }, "date"); }} />
          {!iso && q.quotationDate && <small className="qs-pending">{q.quotationDate}</small>}
        </div>
        <div className="qs-field">
          <label className="qs-eyebrow" htmlFor="qs-validity">Valid for</label>
          <input id="qs-validity" list="qs-validity-list" className="qs-line" value={q.validity} onChange={(e) => patch({ validity: e.target.value }, "validity")} />
          <datalist id="qs-validity-list">{VALIDITY_PRESETS.map((v) => <option key={v} value={v} />)}</datalist>
        </div>
      </div>

      <div className="qs-parties">
        <ClientBlock q={q} clients={clients} onField={setClientField} onPick={pickClient} onUnlink={() => patch({ clientId: undefined })} onSaveForFuture={(on) => patch({ saveClientForFuture: on })} />
        <div className="qs-block qs-by" aria-label="Prepared by">
          <span className="qs-eyebrow">Prepared by</span>
          <strong>SAINI TUBEWELL BORING SERVICE</strong>
          <span>Rajesh Saini · Managing Director</span>
          <span>9812003001 / 7988024114</span>
          <span>stbs2025@gmail.com</span>
        </div>
      </div>

      <div className="qs-subject" data-qs-target="subject-wrap">
        <div className="qs-row-head">
          <label className="qs-eyebrow" htmlFor="qs-subject">Subject</label>
          {subjectEdited && q.subject !== autoSubject
            ? <button type="button" className="qs-link" onClick={() => { setSubjectEdited(false); patch({ subject: autoSubject }); }}>Reset to “{autoSubject}”</button>
            : <span className="qs-tag">Follows the service</span>}
        </div>
        <input id="qs-subject" data-qs-target="subject" className="qs-line qs-subject-input" value={q.subject} onChange={(e) => { setSubjectEdited(true); patch({ subject: e.target.value }, "subject"); }} />
      </div>

      <section className="qs-section">
        <div className="qs-row-head">
          <h2>Price offer</h2>
          <span className="qs-tag">{s.validItems.length} of {q.items.length} on quotation</span>
        </div>
        <LineItems items={q.items} focusId={focusId} onEdit={editItem} onAdd={addItem} onRemove={requestRemove} onDuplicate={dupItem} onMove={moveRow} />
        {q.items.length > 0 && <Totals q={q} totals={totals} patch={patch} hasItems={s.validItems.length > 0} />}
      </section>

      <footer className="qs-fixed">
        <span>Company profile (page 2) and terms &amp; conditions (page 3) are added automatically.</span>
        <button type="button" className="qs-link" onClick={onPreview}><Eye size={14} aria-hidden /> Preview all {s.pageCount} pages</button>
      </footer>

      {confirmRow && (
        <ConfirmDialog title="Delete this item?" body="This row has content. Undo (Ctrl+Z) brings it back until you leave the page." confirmLabel="Delete item" destructive onConfirm={() => { removeNow(confirmRow); setConfirmRow(null); }} onCancel={() => setConfirmRow(null)} />
      )}
    </article>
  );
}
