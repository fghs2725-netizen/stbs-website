"use client";
import { useCallback, useRef, useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Redo2, Undo2 } from "lucide-react";
import { QuotationPreview } from "./QuotationPreview";
import { defaultSubject, buildDraft, serviceOptions, type QuotationState, type QuotationItem, validateItem, getValidItems, isQuotationPdfReady, calcTotals, formatINR } from "./quotation-model";
import "./editor.css";
import { saveDraftAction, finalizeAction } from "@/app/admin/(dashboard)/quotations/actions";
import { AdminBackLink } from "@/components/admin-back-link";
import type { ReusableClient } from "@/lib/quotation-management";
import { QuotationPrintDocument } from "./QuotationPrintDocument";
import { openQuotationPdf, pdfActionMessage, pdfFailureMessage } from "./requestQuotationPdf";
import { fitScaleForWidth } from "./useQuotationPreviewFit";
import { ItemsTable } from "./items-table";
import { PricingPanel } from "./pricing-panel";
import { quotationPageCount } from "./pagination";
import { amountInWords } from "@/lib/amount-in-words";
import { ConfirmDialog, Toaster, useToasts } from "./feedback";
import { createHistory, duplicateItem, isPopulatedItem, moveItem, pushHistory, redoHistory, replaceHistoryPresent, undoHistory, type History } from "./editor-logic";

const today = () => { const d = new Date(); return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`; };
const emptyItem = (): QuotationItem => ({ id: crypto.randomUUID(), description: "", unit: "", quantity: 1, rate: 0 });
const AUTOSAVE_MS = 3000;
const PREVIEW_DEBOUNCE_MS = 200;

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
  gstin: "GSTIN (optional)",
};
const CLIENT_FIELD_ORDER = ["companyName", "contactPerson", "addressLine1", "addressLine2", "city", "state", "pinCode", "phone", "email", "gstin"] as const;

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

type SaveState = "saved" | "saving" | "unsaved" | "error";
type Confirm = null | { kind: "row"; id: string } | { kind: "finalize" } | { kind: "reset" };

export function QuotationEditor({ initial, backHref, backLabel, clients = [] }: { initial?: QuotationState; backHref?: string; backLabel?: string; clients?: ReusableClient[] }) {
  const [history, setHistory] = useState<History<QuotationState>>(() => createHistory(buildDraft(initial)));
  const historyRef = useRef(history);
  const q = history.present;
  const qRef = useRef(q);
  qRef.current = q;

  // Every change goes through here so undo/redo sees it. `key` lets typing bursts collapse into one step.
  const setQ = useCallback((next: QuotationState | ((p: QuotationState) => QuotationState), key?: string) => {
    const h = historyRef.current;
    const value = typeof next === "function" ? next(h.present) : next;
    const updated = pushHistory(h, value, key, Date.now());
    historyRef.current = updated;
    setHistory(updated);
  }, []);
  const setHistoryDirect = (updated: History<QuotationState>) => { historyRef.current = updated; setHistory(updated); };
  const undo = useCallback(() => setHistoryDirect(undoHistory(historyRef.current)), []);
  const redo = useCallback(() => setHistoryDirect(redoHistory(historyRef.current)), []);

  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [savedAt, setSavedAt] = useState<string>("");
  const [saveTick, setSaveTick] = useState(0);
  const savedJson = useRef(JSON.stringify(q));
  const savingRef = useRef(false);
  const failedJson = useRef("");
  const [pdfBusy, setPdfBusy] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const { toasts, push, dismiss } = useToasts();
  const router = useRouter();
  const [step, setStep] = useState(() => {
    if (initial?.id && typeof window !== "undefined") {
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

  // --- Derived values (never stored in state) ---
  const qJson = useMemo(() => JSON.stringify(q), [q]);
  const dirty = qJson !== savedJson.current;
  const validItems = useMemo(() => getValidItems(q.items), [q.items]);
  const totals = useMemo(() => calcTotals(q), [q]);
  const pageCount = useMemo(() => quotationPageCount(q), [q]);
  const canGenerateQuotation = isQuotationPdfReady(q) && (q.serviceType !== "Custom" || q.customServiceType.trim() !== "");
  const isFinal = q.status === "FINAL";

  // What still blocks finalising / PDF, shown inline so nothing fails silently.
  const missing = useMemo(() => {
    const list: string[] = [];
    if (!q.client.companyName.trim()) list.push("Client company name");
    if (q.serviceType === "Custom" && !q.customServiceType.trim()) list.push("Custom service name");
    if (!(q.subject || "").trim()) list.push("Subject");
    if (!validItems.length) list.push("At least one complete price item");
    return list;
  }, [q.client.companyName, q.serviceType, q.customServiceType, q.subject, validItems.length]);

  // The preview renders the real template; debounce so typing stays smooth.
  const [previewQ, setPreviewQ] = useState(q);
  useEffect(() => {
    const t = window.setTimeout(() => setPreviewQ(q), PREVIEW_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [q]);

  const fitPreviewToPanel = useCallback(() => {
    const width = previewPanelRef.current?.clientWidth ?? 0;
    if (!width || Math.abs(width - lastFitWidth.current) < 1) return;
    lastFitWidth.current = width;
    setZoom(Math.round(fitScaleForWidth(width) * 60));
  }, []);

  const generatePdf = useCallback(async () => {
    if (!canGenerateQuotation || page4Overflow || pdfBusy) return;
    setPdfBusy(true);
    try { push("success", pdfActionMessage(await openQuotationPdf(qRef.current))); }
    catch (error) { push("error", pdfFailureMessage(error)); }
    finally { setPdfBusy(false); }
  }, [canGenerateQuotation, page4Overflow, pdfBusy, push]);

  useEffect(() => {
    const panel = previewPanelRef.current;
    if (!panel) return;
    const observer = new ResizeObserver(() => { if (tab === "preview") fitPreviewToPanel(); });
    observer.observe(panel);
    return () => observer.disconnect();
  }, [fitPreviewToPanel, tab]);

  // --- Saving (manual + autosave share one path) ---
  const persist = useCallback(async (mode: "manual" | "auto"): Promise<boolean> => {
    const sent = qRef.current;
    if (sent.status === "FINAL") return false;
    if (savingRef.current) return false;
    savingRef.current = true;
    setSaveState("saving");
    try {
      const saved = await saveDraftAction(sent);
      // Merge only server-assigned fields so edits made while saving are never overwritten.
      const merge = (x: QuotationState): QuotationState => ({ ...x, id: saved.id, quotationReference: saved.quotationReference, clientId: saved.clientId ?? x.clientId, saveClientForFuture: saved.clientId ? false : x.saveClientForFuture });
      savedJson.current = JSON.stringify(merge(sent));
      setHistoryDirect(replaceHistoryPresent(historyRef.current, merge(historyRef.current.present)));
      setSavedAt(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }));
      setSaveState("saved");
      if (mode === "manual") push("success", `Draft saved · ${saved.quotationReference}`);
      if (!sent.id) { sessionStorage.setItem("wizard-step", String(step)); router.replace(`/admin/quotations/${saved.id}/edit`); }
      return true;
    } catch (e) {
      failedJson.current = JSON.stringify(sent);
      setSaveState("error");
      const text = (e as Error)?.message === "FINAL_READ_ONLY" ? "This quotation is final and read-only." : "Could not save. Your changes are still here; retrying on your next edit, or press Ctrl+S.";
      push("error", text);
      return false;
    } finally {
      savingRef.current = false;
      setSaveTick((n) => n + 1);
    }
  }, [push, router, step]);

  // Autosave existing drafts a few seconds after the last edit. A brand-new quotation is created by an explicit save.
  useEffect(() => {
    // A failed save is retried only after the content changes, never in a loop.
    if (!q.id || isFinal || !dirty || savingRef.current || qJson === failedJson.current) return;
    if (saveState === "saved") setSaveState("unsaved");
    const t = window.setTimeout(() => { void persist("auto"); }, AUTOSAVE_MS);
    return () => window.clearTimeout(t);
    // saveTick re-arms after a save that finished while newer edits were waiting.
  }, [qJson, saveTick, q.id, isFinal, dirty, persist, saveState]);

  useEffect(() => {
    const fn = (e: BeforeUnloadEvent) => { if (dirty) e.preventDefault(); };
    window.addEventListener("beforeunload", fn);
    return () => window.removeEventListener("beforeunload", fn);
  }, [dirty]);

  const finalize = useCallback(async () => {
    if (!qRef.current.id || missing.length) return;
    setFinalizing(true);
    try {
      if (dirty && !(await persist("auto"))) throw new Error("save");
      await finalizeAction(qRef.current.id!);
      setHistoryDirect(replaceHistoryPresent(historyRef.current, { ...historyRef.current.present, status: "FINAL" }));
      savedJson.current = JSON.stringify({ ...historyRef.current.present });
      push("success", "Quotation finalized. It is now locked; duplicate it from the list to make changes.");
    } catch { push("error", "Could not finalize the quotation. Nothing was locked; try again."); }
    finally { setFinalizing(false); setConfirm(null); }
  }, [dirty, missing.length, persist, push]);

  // --- Keyboard shortcuts ---
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      const k = e.key.toLowerCase();
      if (k === "s") { e.preventDefault(); if (!isFinal) void persist("manual"); }
      else if (k === "p") { e.preventDefault(); void generatePdf(); }
      else if (k === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      else if (k === "y" || (k === "z" && e.shiftKey)) { e.preventDefault(); redo(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [persist, generatePdf, undo, redo, isFinal]);

  // --- Updaters ---
  const update = (key: keyof QuotationState, value: unknown) => setQ((x) => ({ ...x, [key]: value }), `f:${String(key)}`);
  const updateClient = (key: string, value: string) => setQ((x) => ({ ...x, client: { ...x.client, [key]: value } }), `c:${key}`);
  const setService = (serviceType: string) => setQ((x) => ({ ...x, serviceType, subject: subjectEdited ? x.subject : defaultSubject({ ...x, serviceType }) }));
  const setCustomService = (customServiceType: string) => setQ((x) => ({ ...x, customServiceType, subject: subjectEdited ? x.subject : defaultSubject({ ...x, customServiceType }) }), "f:custom");
  const selectClient = (id: string) => { const client = clients.find((x) => x.id === id); if (!client) return; setQ((x) => ({ ...x, clientId: client.id, saveClientForFuture: false, client: { gstin: client.gstin, companyName: client.companyName, contactPerson: client.contactPerson, addressLine1: client.addressLine1, addressLine2: client.addressLine2, city: client.city, state: client.state, pinCode: client.pinCode, phone: client.phone, email: client.email } })); };

  const editItem = useCallback((id: string, patch: Partial<QuotationItem>, key: string) => setQ((x) => ({ ...x, items: x.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) }), key), [setQ]);
  const addItem = useCallback(() => { const item = emptyItem(); setQ((x) => ({ ...x, items: [...x.items, item] })); setFocusId(item.id); }, [setQ]);
  const removeItemNow = useCallback((id: string) => setQ((x) => ({ ...x, items: x.items.filter((i) => i.id !== id) })), [setQ]);
  const requestRemove = (id: string) => { const item = q.items.find((i) => i.id === id); if (item && isPopulatedItem(item)) setConfirm({ kind: "row", id }); else removeItemNow(id); };
  const dupItem = (id: string) => { const nid = crypto.randomUUID(); setQ((x) => ({ ...x, items: duplicateItem(x.items, id, nid) })); setFocusId(nid); };
  const moveRow = (from: number, to: number) => setQ((x) => ({ ...x, items: moveItem(x.items, from, to) }));

  const resetNow = () => { const fresh = buildDraft({ quotationDate: today(), items: [] }); setHistoryDirect(createHistory(fresh)); savedJson.current = JSON.stringify(fresh); failedJson.current = ""; setSubjectEdited(false); setStep(1); setConfirm(null); };
  const handlePage4Overflow = useCallback((isOver: boolean) => setPage4Overflow(isOver), []);

  const loadTestItems = (count: number) => setQ((x) => ({ ...x, items: TEST_ITEMS.slice(0, count) }));

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

  const itemErrors = useMemo(() => {
    const map = new Map<string, ReturnType<typeof validateItem>>();
    q.items.forEach((item) => {
      const errs = validateItem(item);
      if (Object.keys(errs).length > 0) map.set(item.id, errs);
    });
    return map;
  }, [q.items]);

  const saveLabel = saveState === "saving" ? "Saving…" : saveState === "error" ? "Not saved" : !q.id ? "Not saved yet" : dirty ? "Unsaved changes" : `Saved${savedAt ? ` ${savedAt}` : ""}`;
  const pdfDisabled = !canGenerateQuotation || page4Overflow || pdfBusy;
  const pdfTitle = canGenerateQuotation && !page4Overflow ? "Generate the quotation PDF (Ctrl+P)" : "Complete the quotation and resolve the page overflow first";

  const actionButtons = (
    <>
      <button className="generate-pdf" onClick={() => void persist("manual")} disabled={saveState === "saving" || isFinal} title="Save draft (Ctrl+S)">{saveState === "saving" ? "Saving..." : "Save Draft"}</button>
      <button className="generate-pdf save-to-pdf" disabled={pdfDisabled} title={pdfTitle} onClick={() => void generatePdf()}>{pdfBusy ? "Generating..." : "Generate PDF"}</button>
      <button className="generate-pdf" onClick={() => setConfirm({ kind: "finalize" })} disabled={saveState === "saving" || finalizing || !q.id || isFinal || missing.length > 0} title={missing.length ? `Still needed: ${missing.join(", ")}` : "Lock this quotation"}>{finalizing ? "Finalizing..." : "Finalize"}</button>
    </>
  );

  return (
    <div className="quotation-editor" data-wide={step === 4 ? "true" : undefined}>
      <div className="mobile-tabs" role="tablist" aria-label="Quotation view">
        <button role="tab" aria-selected={tab === "edit"} className={tab === "edit" ? "active" : ""} onClick={() => setTab("edit")}>EDIT</button>
        <button role="tab" aria-selected={tab === "preview"} className={tab === "preview" ? "active" : ""} onClick={() => { setTab("preview"); fitPreviewToPanel(); }}>PREVIEW</button>
      </div>
      <aside className="editor-panel">
        <div className="editor-header-sticky">
          <div className="editor-top">
            <div className="editor-brand">STBS <span>QUOTATION BUILDER</span></div>
            <div className="editor-top-actions">
              <button type="button" className="icon-btn" onClick={undo} disabled={!history.past.length || isFinal} aria-label="Undo (Ctrl+Z)" title="Undo (Ctrl+Z)"><Undo2 className="size-4" /></button>
              <button type="button" className="icon-btn" onClick={redo} disabled={!history.future.length || isFinal} aria-label="Redo (Ctrl+Y)" title="Redo (Ctrl+Y)"><Redo2 className="size-4" /></button>
              <button className="new-quotation" onClick={() => (dirty ? setConfirm({ kind: "reset" }) : resetNow())}>New quotation</button>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3"><h2>Build quotation</h2>{backHref && <AdminBackLink href={backHref} label={backLabel || "Back"} dirty={dirty} />}</div>
          <div className="save-state" data-state={saveState === "saved" && dirty ? "unsaved" : saveState} role="status" aria-live="polite">
            <span className="dot" aria-hidden />{saveLabel}
            <span className="hint">{q.status === "FINAL" ? "Final" : "Draft"} · Ctrl+S saves · Ctrl+Z undoes</span>
          </div>
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

        <div className="editor-scroll-content">
          {page4Overflow && (
            <div className="editor-warning">
              ⚠ A price page is fuller than the page allows and content may touch the footer. Shorten a description or split the item.
            </div>
          )}

          {step === 1 && (
            <>
              <div className="step-heading"><h3>Quotation information</h3><p>Reference, date and validity are printed on the quotation header.</p></div>
              <label>Reference<input value={q.quotationReference} onChange={(e) => update("quotationReference", e.target.value)} readOnly={Boolean(q.id)} title={q.id ? "Assigned automatically" : undefined} /></label>
              <label>Date<input value={q.quotationDate} onChange={(e) => update("quotationDate", e.target.value)} /></label>
              <label>Validity<input value={q.validity} onChange={(e) => update("validity", e.target.value)} /></label>
            </>
          )}

          {step === 2 && (
            <>
              <div className="step-heading"><h3>Prepared for</h3><p>Who is this quotation for? These details appear in the quotation header.</p></div>
              {clients.length > 0 && <label>Client source<select value={q.clientId || "new"} onChange={(e) => e.target.value === "new" ? update("clientId", undefined) : selectClient(e.target.value)}><option value="new">ENTER NEW CLIENT</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.companyName}</option>)}</select></label>}
              {CLIENT_FIELD_ORDER.map((k) => { const v = q.client[k] ?? ""; return (
                <label key={k}>{CLIENT_FIELD_LABELS[k] ?? k}<input value={v} onChange={(e) => updateClient(k, e.target.value)} className={k === "companyName" && !v.trim() ? "field-error" : ""} aria-invalid={k === "companyName" && !v.trim() ? true : undefined} />{k === "companyName" && !v.trim() && <span className="validation-msg">Company name is required.</span>}</label>
              ); })}
              <label className="flex items-center gap-2 normal-case"><input type="checkbox" checked={Boolean(q.saveClientForFuture && !q.clientId)} onChange={(e) => setQ((x) => ({ ...x, saveClientForFuture: e.target.checked, clientId: e.target.checked ? undefined : x.clientId }))} /> SAVE CLIENT FOR FUTURE QUOTATIONS</label>
            </>
          )}

          {step === 3 && (
            <>
              <div className="step-heading"><h3>Service & subject</h3><p>Choose the service type — the subject line is generated automatically.</p></div>
              <label>Quotation type
                <select value={q.serviceType} onChange={(e) => setService(e.target.value)}>
                  {serviceOptions.map((x) => <option key={x}>{x}</option>)}
                </select>
              </label>
              {q.serviceType === "Custom" && <label>Custom service name<input value={q.customServiceType} onChange={(e) => setCustomService(e.target.value)} className={!q.customServiceType.trim() ? "field-error" : ""} />{!q.customServiceType.trim() && <span className="validation-msg">Enter the service name.</span>}</label>}
              <label>Subject<input value={q.subject || defaultSubject(q)} onChange={(e) => { setSubjectEdited(true); update("subject", e.target.value); }} /></label>
            </>
          )}

          {step === 4 && (
            <>
              <div className="step-heading"><h3>Price items</h3><p>Tab moves between cells. Enter on the last cell adds a row. Escape cancels a cell edit. Drag the grip or use the arrows to reorder.</p></div>
              {q.items.length === 0 ? (
                <div className="items-empty-state">
                  <p>No price items added yet.</p>
                  <button type="button" className="add-first-item" onClick={addItem}>+ ADD FIRST ITEM</button>
                </div>
              ) : (
                <>
                  <ItemsTable items={q.items} errors={itemErrors} focusId={focusId} onEdit={editItem} onAdd={addItem} onRemove={requestRemove} onDuplicate={dupItem} onMove={moveRow} onReorder={moveRow} />
                  <button type="button" className="add-item" onClick={addItem}>+ ADD ITEM</button>
                  <PricingPanel q={q} totals={totals} pageCount={pageCount} onChange={(patch, key) => setQ((x) => ({ ...x, ...patch }), key)} />
                </>
              )}

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
                      <button onClick={() => setQ((x) => ({ ...x, items: [] }))}>Clear</button>
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
                {totals.tax > 0 && <div className="review-row"><span>GST</span><b>{formatINR(totals.tax)}</b></div>}
                {totals.discount > 0 && <div className="review-row"><span>Discount</span><b>−{formatINR(totals.discount)}</b></div>}
                <div className="review-row total"><span>Final total</span><b>{formatINR(totals.grandTotal)}</b></div>
                {totals.grandTotal > 0 && <div className="review-row"><span>In words</span><b>{amountInWords(totals.grandTotal)}</b></div>}
                <div className="review-row"><span>Pages</span><b>{pageCount}</b></div>
              </div>
              {missing.length > 0 && <div className="editor-warning" role="alert">Before you can finalize or generate a PDF, add: {missing.join(", ")}.</div>}
              {!q.id && !isFinal && <p className="wizard-msg">Save the draft first (Ctrl+S) to enable Finalize.</p>}
              <div className="review-actions">{actionButtons}</div>
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
          <button onClick={() => setZoom(Math.max(50, zoom - 10))} aria-label="Zoom out">−</button>
          <b>{zoom}%</b>
          <button onClick={() => setZoom(Math.min(100, zoom + 10))} aria-label="Zoom in">+</button>
          <button onClick={fitPreviewToPanel}>Fit width</button>
          {actionButtons}
          <small>{pageCount} pages</small>
        </div>
        <div className="preview-viewport">
          <div className="preview-scale-container" style={{ "--preview-scale": zoom / 60, "--preview-height": `${(297 / 25.4 * 96 * pageCount * zoom / 60) + 36}px` } as React.CSSProperties}>
            <div className="preview-scale-content">
              <QuotationPreview quotation={previewQ} onPage4Overflow={handlePage4Overflow} />
            </div>
          </div>
        </div>
      </main>
      {tab === "edit" && (
        <div className="mobile-action-bar" role="toolbar" aria-label="Quotation actions">
          <button onClick={() => void persist("manual")} disabled={saveState === "saving" || isFinal}>{saveState === "saving" ? "Saving…" : "Save Draft"}</button>
          <button onClick={() => setConfirm({ kind: "finalize" })} disabled={saveState === "saving" || finalizing || !q.id || isFinal || missing.length > 0}>Finalize</button>
          <button className="primary" disabled={pdfDisabled} title={pdfTitle} onClick={() => void generatePdf()}>
            {pdfBusy ? "Generating…" : "Generate PDF"}
          </button>
        </div>
      )}
      <QuotationPrintDocument quotation={previewQ} />

      {confirm?.kind === "row" && <ConfirmDialog title="Delete this item?" body="This row has content. It can be restored with Undo (Ctrl+Z) until you leave the page." confirmLabel="Delete item" destructive onConfirm={() => { removeItemNow(confirm.id); setConfirm(null); }} onCancel={() => setConfirm(null)} />}
      {confirm?.kind === "finalize" && <ConfirmDialog title="Finalize this quotation?" body="This locks it permanently and it cannot be edited afterward. Need changes later? Duplicate it from the quotations list." confirmLabel="Finalize" busy={finalizing} onConfirm={() => void finalize()} onCancel={() => setConfirm(null)} />}
      {confirm?.kind === "reset" && <ConfirmDialog title="Start a new quotation?" body="Unsaved changes on this screen will be cleared." confirmLabel="Start new" destructive onConfirm={resetNow} onCancel={() => setConfirm(null)} />}
      <Toaster toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
