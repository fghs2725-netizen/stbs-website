"use client";
import { useCallback, useRef, useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { QuotationPreview } from "./QuotationPreview";
import { defaultSubject, buildDraft, serviceOptions, type QuotationState, type QuotationItem, validateItem, isItemValid, calcAmount, formatINR, getValidItems, isQuotationPdfReady, calcTotal } from "./quotation-model";
import "./editor.css";
import { saveDraftAction, finalizeAction } from "@/app/admin/(dashboard)/quotations/actions";
import { AdminBackLink } from "@/components/admin-back-link";
import type { ReusableClient } from "@/lib/quotation-management";
import { QuotationPrintDocument } from "./QuotationPrintDocument";
import { openQuotationPdf, pdfActionMessage, pdfFailureMessage } from "./requestQuotationPdf";
import { fitScaleForWidth } from "./useQuotationPreviewFit";

const today = () => { const d = new Date(); return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`; };
const emptyItem = (): QuotationItem => ({ id: crypto.randomUUID(), description: "", unit: "", quantity: 1, rate: 0 });

const CLIENT_FIELD_LABELS: Record<string, string> = {
  companyName: "Company name",
  contactPerson: "Contact person",
  addressLine1: "Address line 1",
  addressLine2: "Address line 2",
  city: "City",
  state: "State",
  pinCode: "PIN code",
  phone: "Phone",
  email: "Email",
};

/* ---------- Dev test data (NOT permanently stored) ---------- */
const TEST_ITEMS: QuotationItem[] = [
  { id: "t1", description: "Supply and installation of 6\" PVC casing pipe (ISI marked) for borewell construction", unit: "Rft", quantity: 200, rate: 480 },
  { id: "t2", description: "Borewell drilling in hard rock formation using DTH method (150mm dia)", unit: "Rft", quantity: 300, rate: 320 },
  { id: "t3", description: "Supply of MS pipe 4\" heavy duty for borewell housing pipe", unit: "Rft", quantity: 120, rate: 550 },
  { id: "t4", description: "Submersible pump installation 5HP with cable and accessories", unit: "Set", quantity: 1, rate: 45000 },
  { id: "t5", description: "Supply of river sand filter media (washed) for borewell filtration", unit: "CFt", quantity: 50, rate: 180 },
  { id: "t6", description: "Cement grouting work for borewell sealing (OPC 43 Grade)", unit: "Bag", quantity: 30, rate: 420 },
  { id: "t7", description: "Rainwater harvesting filter unit SS304 with auto-flush mechanism", unit: "No.", quantity: 2, rate: 18500 },
  { id: "t8", description: "PVC pipe 110mm SWR type for rainwater collection and drainage network", unit: "Rft", quantity: 400, rate: 95 },
  { id: "t9", description: "Recharge pit construction 3m × 3m × 3m with gravel bed and geotextile lining", unit: "No.", quantity: 3, rate: 25000 },
  { id: "t10", description: "Transportation and mobilization of heavy drilling rig and equipment to site", unit: "LS", quantity: 1, rate: 35000 },
  { id: "t11", description: "Chlorination and flushing of borewell after completion as per CGWA norms", unit: "LS", quantity: 1, rate: 8500 },
  { id: "t12", description: "Yield test and water quality analysis report from NABL accredited laboratory", unit: "No.", quantity: 1, rate: 5500 },
  { id: "t13", description: "Site supervision charges for complete project duration including daily progress reports", unit: "Month", quantity: 2, rate: 12000 },
];

export function QuotationEditor({ initial, backHref, backLabel, clients = [] }: { initial?: QuotationState; backHref?: string; backLabel?: string; clients?: ReusableClient[] }) {
  const [q, setQ] = useState<QuotationState>(() => buildDraft(initial));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [dirty, setDirty] = useState(false);
  const router = useRouter();
  const [step, setStep] = useState(() => {
    if (initial?.id) {
      const saved = Number(sessionStorage.getItem("wizard-step"));
      sessionStorage.removeItem("wizard-step");
      return saved >= 2 && saved <= 5 ? saved : 1;
    }
    return 1;
  });
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [subjectEdited, setSubjectEdited] = useState(false);
  const [zoom, setZoom] = useState(60);
  const [page4Overflow, setPage4Overflow] = useState(false);
  const [showTestPanel, setShowTestPanel] = useState(false);
  const previewPanelRef = useRef<HTMLElement>(null);
  const lastFitWidth = useRef(0);
  const descriptionRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  // --- Derived values (never stored in state) ---
  const validItems = useMemo(() => getValidItems(q.items), [q.items]);
  const total = useMemo(() => calcTotal(validItems), [validItems]);
  const canGenerateQuotation = isQuotationPdfReady(q) && (q.serviceType !== "Custom" || q.customServiceType.trim() !== "");

  const fitPreviewToPanel = useCallback(() => {
    const width = previewPanelRef.current?.clientWidth ?? 0;
    if (!width || Math.abs(width - lastFitWidth.current) < 1) return;
    lastFitWidth.current = width;
    setZoom(Math.round(fitScaleForWidth(width) * 60));
  }, []);

  const generatePdf = useCallback(async () => {
    if (!canGenerateQuotation || page4Overflow) return;
    setMessage("Generating PDF...");
    try { setMessage(pdfActionMessage(await openQuotationPdf(q))); }
    catch (error) { setMessage(pdfFailureMessage(error)); }
  }, [canGenerateQuotation, page4Overflow, q]);

  useEffect(() => {
    const panel = previewPanelRef.current;
    if (!panel) return;
    const observer = new ResizeObserver(() => { if (tab === "preview") fitPreviewToPanel(); });
    observer.observe(panel);
    return () => observer.disconnect();
  }, [fitPreviewToPanel, tab]);

  // --- Updaters ---
  const update = (key: keyof QuotationState, value: unknown) => { setDirty(true); setQ(x => ({ ...x, [key]: value })); };
  const updateClient = (key: string, value: string) => { setDirty(true); setQ(x => ({ ...x, client: { ...x.client, [key]: value } })); };
  const setService = (serviceType: string) => setQ(x => ({ ...x, serviceType, subject: subjectEdited ? x.subject : defaultSubject({ ...x, serviceType }) }));
  const setCustomService = (customServiceType: string) => setQ(x => ({ ...x, customServiceType, subject: subjectEdited ? x.subject : defaultSubject({ ...x, customServiceType }) }));
  const selectClient = (id: string) => { const client = clients.find(x => x.id === id); if (!client) return; setDirty(true); setQ(x => ({ ...x, clientId: client.id, saveClientForFuture: false, client: { companyName: client.companyName, contactPerson: client.contactPerson, addressLine1: client.addressLine1, addressLine2: client.addressLine2, city: client.city, state: client.state, pinCode: client.pinCode, phone: client.phone, email: client.email } })); };
  const setItem = (id: string, key: string, value: string | number) => setQ(x => ({ ...x, items: x.items.map(i => i.id === id ? { ...i, [key]: value } : i) }));
  const removeItem = (id: string) => setQ(x => ({ ...x, items: x.items.filter(i => i.id !== id) }));

  const addItem = useCallback(() => {
    const item = emptyItem();
    setQ(x => ({ ...x, items: [...x.items, item] }));
    // Focus description field after render
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = descriptionRefs.current.get(item.id);
        el?.focus();
        el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    });
  }, []);

  const reset = () => { if (confirm("Start a new quotation? Unsaved changes will be cleared.")) { setQ(buildDraft({ quotationDate: today(), items: [] })); setSubjectEdited(false); setStep(1); } };

  const handlePage4Overflow = useCallback((isOver: boolean) => {
    setPage4Overflow(isOver);
  }, []);
  useEffect(() => { const fn=(e:BeforeUnloadEvent)=>{if(dirty)e.preventDefault();}; window.addEventListener("beforeunload",fn); return()=>window.removeEventListener("beforeunload",fn); },[dirty]);
  const saveDraft = async () => { if(saving)return; setSaving(true); setMessage(""); try { const saved=await saveDraftAction(q); setQ(saved); setDirty(false); setMessage(`SAVED ${saved.quotationReference}`); if(!q.id) { sessionStorage.setItem("wizard-step", String(step)); router.replace(`/admin/quotations/${saved.id}/edit`); } } catch(e:any) { setMessage(e?.message === "FINAL_READ_ONLY" ? "Final quotations are read-only." : "Could not save draft."); } finally { setSaving(false); } };
  const finalize = async () => { if(!q.id || saving)return; if(!confirm("Finalize this quotation?\n\nThis locks it permanently - it cannot be edited afterward. Need changes later? Duplicate it from the quotations list.\n\nContinue?"))return; setSaving(true); try { await saveDraftAction(q); await finalizeAction(q.id); setQ(x=>({...x,status:"FINAL"})); setDirty(false); setMessage("FINALIZED"); } catch { setMessage("Could not finalize quotation."); } finally { setSaving(false); } };

  // --- Dev test helpers ---
  const loadTestItems = (count: number) => {
    setQ(x => ({ ...x, items: TEST_ITEMS.slice(0, count) }));
  };

  // --- Wizard steps ---
  const STEPS = [
    { key: "info", label: "Quotation information" },
    { key: "client", label: "Prepared for" },
    { key: "service", label: "Service & subject" },
    { key: "items", label: "Price items" },
    { key: "review", label: "Review & Generate" },
  ];

  const stepError = (n: number): string | null => {
    switch (n) {
      case 2: return q.client.companyName.trim() ? null : "Add the client's company name before continuing.";
      case 4: return validItems.length ? null : "Add at least one item with a description, unit, quantity and rate before continuing.";
      default: return null;
    }
  };
  const firstInvalidStep = [1, 2, 3, 4].find((n) => stepError(n)) ?? 5;
  const canProceed = step < 5 && !stepError(step);
  const goNext = () => { if (canProceed) setStep((s) => Math.min(5, s + 1)); };
  const goBack = () => { setStep((s) => Math.max(1, s - 1)); };
  const goToStep = (n: number) => { if (n >= 1 && n <= firstInvalidStep) setStep(n); };

  // --- Validation per item ---
  const itemErrors = useMemo(() => {
    const map = new Map<string, ReturnType<typeof validateItem>>();
    q.items.forEach(item => {
      const errs = validateItem(item);
      if (Object.keys(errs).length > 0) map.set(item.id, errs);
    });
    return map;
  }, [q.items]);

  return (
    <div className="quotation-editor">
      <div className="mobile-tabs" role="tablist" aria-label="Quotation view">
        <button role="tab" aria-selected={tab === "edit"} className={tab === "edit" ? "active" : ""} onClick={() => setTab("edit")}>EDIT</button>
        <button role="tab" aria-selected={tab === "preview"} className={tab === "preview" ? "active" : ""} onClick={() => { setTab("preview"); fitPreviewToPanel(); }}>PREVIEW</button>
      </div>
      <aside className="editor-panel">
        {/* Sticky header */}
        <div className="editor-header-sticky">
          <div className="editor-top">
<div className="editor-brand">STBS <span>QUOTATION BUILDER</span></div>
            <button className="new-quotation" onClick={reset}>New quotation</button>
          </div>
<div className="flex items-center justify-between gap-3"><h2>Build quotation</h2>{backHref && <AdminBackLink href={backHref} label={backLabel || "Back"} dirty={dirty} />}</div>
          <nav className="editor-stepper" aria-label="Quotation steps">
            {STEPS.map((s, i) => {
              const n = i + 1;
              const active = step === n;
              const passedValid = n < step && !stepError(n);
              return (
                <button key={s.key} type="button" className={`step ${active ? "active" : ""} ${passedValid ? "complete" : ""}`} onClick={() => goToStep(n)} aria-current={active ? "step" : undefined} disabled={n > firstInvalidStep}>
                  <span className="step-dot">{passedValid ? "✓" : n}</span>
                  <span className="step-label">{s.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

{/* Scrollable content */}
        <div className="editor-scroll-content">
          {/* Overflow warning */}
          {page4Overflow && (
            <div className="editor-warning">
              ⚠ Price table exceeds the available space on Page 4.
            </div>
          )}

          {step === 1 && (
            <>
              <div className="step-heading"><h3>Quotation information</h3><p>Reference, date and validity are printed on the quotation header.</p></div>
              <label>Reference<input value={q.quotationReference} onChange={e => update("quotationReference", e.target.value)} readOnly={Boolean(q.id)} title={q.id ? "Assigned automatically" : undefined} /></label>
              <label>Date<input value={q.quotationDate} onChange={e => update("quotationDate", e.target.value)} /></label>
              <label>Validity<input value={q.validity} onChange={e => update("validity", e.target.value)} /></label>
            </>
          )}

          {step === 2 && (
            <>
              <div className="step-heading"><h3>Prepared for</h3><p>Who is this quotation for? These details appear in the quotation header.</p></div>
              {clients.length > 0 && <label>Client source<select value={q.clientId || "new"} onChange={e => e.target.value === "new" ? update("clientId", undefined) : selectClient(e.target.value)}><option value="new">ENTER NEW CLIENT</option>{clients.map(client => <option key={client.id} value={client.id}>{client.companyName}</option>)}</select></label>}
              {Object.entries(q.client).map(([k, v]) => (
                <label key={k}>{CLIENT_FIELD_LABELS[k] ?? k}<input value={v} onChange={e => updateClient(k, e.target.value)} /></label>
              ))}
              <label className="flex items-center gap-2 normal-case"><input type="checkbox" checked={Boolean(q.saveClientForFuture && !q.clientId)} onChange={e => { setDirty(true); setQ(x => ({ ...x, saveClientForFuture: e.target.checked, clientId: e.target.checked ? undefined : x.clientId })); }} /> SAVE CLIENT FOR FUTURE QUOTATIONS</label>
            </>
          )}

          {step === 3 && (
            <>
              <div className="step-heading"><h3>Service & subject</h3><p>Choose the service type — the subject line is generated automatically.</p></div>
              <label>Quotation type
                <select value={q.serviceType} onChange={e => setService(e.target.value)}>
                  {serviceOptions.map(x => <option key={x}>{x}</option>)}
                </select>
              </label>
              {q.serviceType === "Custom" && <label>Custom service name<input value={q.customServiceType} onChange={e => setCustomService(e.target.value)} /></label>}
              <label>Subject<input value={q.subject || defaultSubject(q)} onChange={e => { setSubjectEdited(true); update("subject", e.target.value); }} /></label>
            </>
          )}

          {step === 4 && (
            <>
              <div className="step-heading"><h3>Price items</h3><p>List each quoted item with unit, quantity and rate. The template keeps them within the fixed A4 pages.</p></div>
              {q.items.length === 0 ? (
                <div className="items-empty-state">
                  <p>No price items added yet.</p>
                  <button type="button" className="add-first-item" onClick={addItem}>+ ADD FIRST ITEM</button>
                </div>
              ) : (
                <>
                  <div className="items-list">
                    {q.items.map((item, n) => {
                      const errs = itemErrors.get(item.id);
                      return (
                        <div className={`editor-item ${errs ? "has-errors" : ""}`} key={item.id}>
                          <div className="item-heading">
                            <strong>ITEM {String(n + 1).padStart(2, "0")}</strong>
                            <button onClick={() => removeItem(item.id)}>Delete</button>
                          </div>
                          <label>
                            Description
                            <input
                              ref={el => { if (el) descriptionRefs.current.set(item.id, el); else descriptionRefs.current.delete(item.id); }}
                              placeholder="Describe the work or material"
                              value={item.description}
                              onChange={e => setItem(item.id, "description", e.target.value)}
                              className={errs?.description ? "field-error" : ""}
                            />
                            {errs?.description && <span className="validation-msg">{errs.description}</span>}
                          </label>
                          <div className="item-grid">
                            <label>
                              Unit
                              <input value={item.unit} onChange={e => setItem(item.id, "unit", e.target.value)} className={errs?.unit ? "field-error" : ""} />
                              {errs?.unit && <span className="validation-msg">{errs.unit}</span>}
                            </label>
                            <label>
                              Quantity
                              <input type="number" min="1" step="1" value={item.quantity} onChange={e => setItem(item.id, "quantity", Number(e.target.value))} className={errs?.quantity ? "field-error" : ""} />
                              {errs?.quantity && <span className="validation-msg">{errs.quantity}</span>}
                            </label>
                            <label>
                              Rate
                              <input type="number" min="0" step="0.01" value={item.rate} onChange={e => setItem(item.id, "rate", Number(e.target.value))} className={errs?.rate ? "field-error" : ""} />
                              {errs?.rate && <span className="validation-msg">{errs.rate}</span>}
                            </label>
                          </div>
                          <div className="item-amount">
                            Amount <b>{isItemValid(item) ? formatINR(calcAmount(item.quantity, item.rate)) : "—"}</b>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <button type="button" className="add-item" onClick={addItem}>+ ADD ITEM</button>
                  <div className="editor-total">Total <b>{formatINR(total)}</b></div>
                </>
              )}

              {/* Dev test panel (development only) */}
              {process.env.NODE_ENV === "development" && (
                <div className="dev-test-panel">
                  <button className="dev-test-toggle" onClick={() => setShowTestPanel(!showTestPanel)}>
                    {showTestPanel ? "▾ DEV TEST" : "▸ DEV TEST"}
                  </button>
                  {showTestPanel && (
                    <div className="dev-test-buttons">
                      <span>Load test items:</span>
                      <button onClick={() => loadTestItems(1)}>1</button>
                      <button onClick={() => loadTestItems(5)}>5</button>
                      <button onClick={() => loadTestItems(10)}>10</button>
                      <button onClick={() => loadTestItems(13)}>13</button>
                      <button onClick={() => setQ(x => ({ ...x, items: [] }))}>Clear</button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {step === 5 && (
            <>
              <div className="step-heading"><h3>Review & Generate</h3><p>Confirm the details — the STBS template preview updates live on the right. Generate the final PDF when ready.</p></div>
              <div className="review-block">
                <div className="review-row"><span>Reference</span><b>{q.quotationReference || "Assigned when saved"}</b></div>
                <div className="review-row"><span>Date</span><b>{q.quotationDate || "—"}</b></div>
                <div className="review-row"><span>Validity</span><b>{q.validity || "—"}</b></div>
                <div className="review-row"><span>Client</span><b>{q.client.companyName || "Not set"}</b></div>
                <div className="review-row"><span>Service</span><b>{q.serviceType === "Custom" ? q.customServiceType || "—" : q.serviceType}</b></div>
                <div className="review-row"><span>Subject</span><b>{q.subject || defaultSubject(q)}</b></div>
                <div className="review-row"><span>Price items</span><b>{validItems.length}</b></div>
                <div className="review-row total"><span>Total</span><b>{formatINR(total)}</b></div>
              </div>
              <div className="review-actions">
                <button className="generate-pdf" onClick={saveDraft} disabled={saving || q.status === "FINAL"}>{saving ? "Saving..." : "Save Draft"}</button>
                <button className="generate-pdf save-to-pdf" disabled={!canGenerateQuotation || page4Overflow || message === "Generating PDF..."} title={canGenerateQuotation && !page4Overflow ? "Generate the quotation PDF" : "Complete the quotation and resolve Page 4 overflow first"} onClick={generatePdf}>{message === "Generating PDF..." ? "Generating..." : "Generate PDF"}</button>
                <button className="generate-pdf" onClick={finalize} disabled={saving || !q.id || q.status === "FINAL"}>Finalize</button>
              </div>
              {message && <p className="wizard-msg">{message}</p>}
            </>
          )}

          <div className="wizard-nav">
            <button type="button" className="wizard-back" onClick={goBack} disabled={step === 1}>‹ Back</button>
            <span className="wizard-hint">{stepError(step) || ""}</span>
            {step < 5 ? (
              <button type="button" className="wizard-next" onClick={goNext} disabled={!canProceed}>Next ›</button>
            ) : null}
          </div>
        </div>
      </aside>

      <main ref={previewPanelRef} className={`editor-preview ${tab === "edit" ? "show-edit" : "show-preview"}`} data-can-generate={canGenerateQuotation}>
        <div className="preview-controls">
<span>Quotation preview</span>
          <button onClick={() => setZoom(Math.max(50, zoom - 10))}>−</button>
          <b>{zoom}%</b>
          <button onClick={() => setZoom(Math.min(100, zoom + 10))}>+</button>
          <button onClick={fitPreviewToPanel}>Fit width</button>
          <button className="generate-pdf" onClick={saveDraft} disabled={saving || q.status === "FINAL"}>{saving ? "Saving..." : "Save Draft"}</button>
          <button className="generate-pdf save-to-pdf" disabled={!canGenerateQuotation || page4Overflow || message === "Generating PDF..."} title={canGenerateQuotation && !page4Overflow ? "Generate the quotation PDF" : "Complete the quotation and resolve Page 4 overflow first"} onClick={generatePdf}> {message === "Generating PDF..." ? "Generating..." : "Generate PDF"}</button>
          <button className="generate-pdf" onClick={finalize} disabled={saving || !q.id || q.status === "FINAL"}>Finalize</button>
          <small>{message || "4 Pages"}</small>
        </div>
        <div className="preview-viewport">
          <div className="preview-scale-container" style={{ "--preview-scale": zoom / 60, "--preview-height": `${(297 / 25.4 * 96 * 4 * zoom / 60) + 36}px` } as React.CSSProperties}>
            <div className="preview-scale-content">
              <QuotationPreview quotation={q} onPage4Overflow={handlePage4Overflow} />
            </div>
          </div>
        </div>
      </main>
      {tab === "edit" && (
        <div className="mobile-action-bar" role="toolbar" aria-label="Quotation actions">
          <button onClick={saveDraft} disabled={saving || q.status === "FINAL"}>{saving ? "Saving…" : "Save Draft"}</button>
          <button onClick={finalize} disabled={saving || !q.id || q.status === "FINAL"}>Finalize</button>
          <button
            className="primary"
            disabled={!canGenerateQuotation || page4Overflow || message === "Generating PDF..."}
            title={canGenerateQuotation && !page4Overflow ? "Generate the quotation PDF" : "Complete the quotation and resolve Page 4 overflow first"}
            onClick={generatePdf}
          >
            {message === "Generating PDF..." ? "Generating…" : "Generate PDF"}
          </button>
        </div>
      )}
      <QuotationPrintDocument quotation={q} />
    </div>
  );
}
