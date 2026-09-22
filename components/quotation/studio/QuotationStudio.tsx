"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, Check, FileDown, FileText, Lock, Printer, Redo2, Undo2, X } from "lucide-react";
import type { QuotationState } from "../quotation-model";
import { formatINR } from "../quotation-model";
import type { ReusableClient } from "@/lib/quotation-management";
import type { QuotationTemplateRef } from "../template/template-model";
import { ConfirmDialog, Toaster } from "../feedback";
import { QuotationPreview } from "../QuotationPreview";
import { QuotationPrintDocument } from "../QuotationPrintDocument";
import { useQuotationSession } from "./use-quotation-session";
import { Sheet } from "./sheet";
import { ShareQuotation } from "../share/ShareQuotation";
import { shareSubjectFrom } from "../share/share-model";
import { requestQuotationPdf } from "../requestQuotationPdf";
import "./studio.css";

const PREVIEW_DEBOUNCE_MS = 250;

/**
 * Quotation editor. One editable A4 sheet you type directly on, a review rail that tracks what is
 * still missing, and a full preview over the top when you want to see all pages as printed.
 */
export function QuotationStudio({ initial, clients = [], templates = [], backHref = "/admin/quotations", backLabel = "Quotations" }: {
  initial: QuotationState; clients?: ReusableClient[]; templates?: QuotationTemplateRef[]; backHref?: string; backLabel?: string;
}) {
  const s = useQuotationSession(initial);
  const { q, dirty, isFinal, status, totals, busy } = s;
  const router = useRouter();
  const [preview, setPreview] = useState(false);
  const [confirmFinalize, setConfirmFinalize] = useState(false);
  const [previewQ, setPreviewQ] = useState(q);
  const previewTrigger = useRef<HTMLElement | null>(null);

  // The preview renders the real template, so it is debounced to keep typing smooth.
  useEffect(() => {
    const t = window.setTimeout(() => setPreviewQ(q), PREVIEW_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [q]);

  const openPreview = useCallback(() => { previewTrigger.current = document.activeElement as HTMLElement; setPreviewQ(q); setPreview(true); }, [q]);
  const closePreview = useCallback(() => { setPreview(false); previewTrigger.current?.focus?.(); }, []);
  useEffect(() => {
    if (!preview) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); closePreview(); } };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [preview, closePreview]);

  const leave = (e: React.MouseEvent) => { if (dirty && !window.confirm("You have unsaved changes. Leave this page?")) e.preventDefault(); };

  // Jump to whatever is still missing and put the cursor in it.
  const jumpTo = (target: string) => {
    const el = document.querySelector<HTMLElement>(`[data-qs-target="${target}"]`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    (el.matches("input,select,textarea") ? el : el.querySelector<HTMLElement>("input,select,textarea,button"))?.focus?.();
  };

  // Switching template swaps the wording instantly. The validity line follows the template only while it is
  // still the previous template's wording, so a validity you typed yourself is never overwritten.
  const chooseTemplate = (id: string) => {
    const next = templates.find((t) => t.id === id);
    if (!next) return;
    s.patch({ templateId: next.id, template: next, validity: q.validity === q.template?.content.validity ? next.content.validity : q.validity });
  };
  // A draft pinned to an archived template still shows it, so the select never displays the wrong name.
  const templateOptions = q.template && !templates.some((t) => t.id === q.template!.id) ? [q.template, ...templates] : templates;

  // The PDF is made from the saved quotation, so pending edits are saved first or the file would be stale.
  const shareSubject = useMemo(() => shareSubjectFrom(q, totals.grandTotal), [q, totals.grandTotal]);
  const getPdf = useCallback(async () => {
    await s.saveBeforeExport("PDF");
    return requestQuotationPdf(s.latest());
  }, [s]);
  const registerPdf = useCallback((open: () => void) => { s.pdfShortcut.current = open; }, [s.pdfShortcut]);

  const exportDisabled = !status.ready || s.overflow;
  const exportTitle = status.ready ? (s.overflow ? "A price page is overfull — shorten a description first" : undefined) : `Still needed: ${status.missing.join(", ")}`;

  return (
    <div className="qs" data-final={isFinal || undefined}>
      <header className="qs-bar">
        <div className="qs-bar-left">
          <Link href={backHref} onClick={leave} className="qs-back"><ArrowLeft size={16} aria-hidden /> <span>{backLabel}</span></Link>
          <span className="qs-ref">{q.quotationReference || "New quotation"}</span>
          <span className={`qs-chip ${isFinal ? "qs-chip-final" : "qs-chip-draft"}`}>{isFinal ? "Final" : "Draft"}</span>
          <span className="qs-save" data-state={s.saveState} role="status" aria-live="polite"><i aria-hidden />{s.saveLabel}</span>
        </div>
        <div className="qs-bar-right">
          <button type="button" className="qs-icon" onClick={s.undo} disabled={!s.canUndo} aria-label="Undo (Ctrl+Z)" title="Undo (Ctrl+Z)"><Undo2 size={16} /></button>
          <button type="button" className="qs-icon" onClick={s.redo} disabled={!s.canRedo} aria-label="Redo (Ctrl+Y)" title="Redo (Ctrl+Y)"><Redo2 size={16} /></button>
          <button type="button" className="qs-btn" onClick={() => void s.persist("manual")} disabled={s.saveState === "saving" || isFinal} title="Save draft (Ctrl+S)">{s.saveState === "saving" ? "Saving…" : "Save"}</button>
          <ShareQuotation intent="share" subject={shareSubject} getPdf={getPdf} render={({ open }) => (
            <button type="button" className="qs-btn" onClick={open} disabled={exportDisabled} title={exportTitle ?? "Send the PDF by WhatsApp, email and more"}>Share</button>
          )} />
          <ShareQuotation intent="save" subject={shareSubject} getPdf={getPdf} registerOpen={registerPdf} render={({ open }) => (
            <button type="button" className="qs-btn qs-btn-solid" onClick={open} disabled={exportDisabled} title={exportTitle ?? "Save the PDF (Ctrl+P)"}>PDF</button>
          )} />
        </div>
      </header>

      <div className="qs-body">
        <main className="qs-canvas">
          {s.overflow && (
            <p className="qs-alert" role="alert"><AlertTriangle size={15} aria-hidden /> A price page is fuller than A4 allows and may run into the footer. Shorten a description or split the item.</p>
          )}
          {isFinal && (
            <p className="qs-alert qs-alert-info"><Lock size={15} aria-hidden /> This quotation is final and read-only. Duplicate it from the list to make changes.</p>
          )}
          {(templateOptions.length > 0 || isFinal) && (
            <div className="qs-template-bar">
              <label htmlFor="qs-template">Template</label>
              {isFinal ? (
                <span>{q.template?.name ?? "STBS Classic"} · wording is frozen now that this is final</span>
              ) : (
                <select id="qs-template" value={q.template?.id ?? q.templateId ?? ""} onChange={(e) => chooseTemplate(e.target.value)}>
                  {templateOptions.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              )}
              <Link href="/admin/quotations/templates" onClick={leave}>Manage templates</Link>
            </div>
          )}
          <fieldset className="qs-fieldset" disabled={isFinal}>
            <Sheet s={s} clients={clients} onPreview={openPreview} />
          </fieldset>
        </main>

        <aside className="qs-rail" aria-label="Quotation status">
          <section className="qs-card">
            <h2>Total</h2>
            <p className="qs-total">{formatINR(totals.grandTotal)}</p>
            <dl className="qs-mini-list">
              <div><dt>Items</dt><dd>{s.validItems.length}</dd></div>
              <div><dt>Pages</dt><dd>{s.pageCount}</dd></div>
              {totals.discount > 0 && <div><dt>Discount</dt><dd>−{formatINR(totals.discount)}</dd></div>}
              {totals.tax > 0 && <div><dt>GST</dt><dd>{formatINR(totals.tax)}</dd></div>}
            </dl>
          </section>

          <section className="qs-card">
            <h2>Before you send</h2>
            <ul className="qs-checks">
              {status.checks.map((c) => (
                <li key={c.key} data-done={c.done || undefined}>
                  <span className="qs-tick" aria-hidden>{c.done ? <Check size={13} /> : <span className="qs-dot" />}</span>
                  {c.done ? <span>{c.label}</span> : <button type="button" onClick={() => jumpTo(c.target)}>{c.label}</button>}
                </li>
              ))}
            </ul>
            {status.incompleteRows > 0 && <p className="qs-note">{status.incompleteRows} incomplete {status.incompleteRows === 1 ? "row is" : "rows are"} not printed.</p>}
          </section>

          <section className="qs-card">
            <h2>Output</h2>
            <div className="qs-stack">
              <button type="button" className="qs-btn" onClick={openPreview}><FileText size={15} aria-hidden /> Preview {s.pageCount} pages</button>
              <button type="button" className="qs-btn" onClick={() => window.print()}><Printer size={15} aria-hidden /> Print</button>
              <button type="button" className="qs-btn" onClick={() => setConfirmFinalize(true)} disabled={!status.ready || !q.id || isFinal || busy.finalize} title={q.id ? exportTitle : "Save the draft first"}><Lock size={15} aria-hidden /> Finalize</button>
            </div>
            <p className="qs-note">Finalizing locks the quotation for good.</p>
          </section>
        </aside>
      </div>

      <div className="qs-mobile-bar" role="toolbar" aria-label="Quotation actions">
        <button type="button" onClick={() => void s.persist("manual")} disabled={s.saveState === "saving" || isFinal}>{s.saveState === "saving" ? "Saving…" : "Save"}</button>
        <button type="button" onClick={openPreview}>Preview</button>
        <ShareQuotation intent="share" subject={shareSubject} getPdf={getPdf} render={({ open }) => (
          <button type="button" onClick={open} disabled={exportDisabled} title={exportTitle}>Share</button>
        )} />
        <ShareQuotation intent="save" subject={shareSubject} getPdf={getPdf} render={({ open }) => (
          <button type="button" className="qs-mobile-primary" onClick={open} disabled={exportDisabled} title={exportTitle}>PDF</button>
        )} />
      </div>

      {preview && (
        <div className="qs-overlay" role="dialog" aria-modal="true" aria-label="Quotation preview">
          <div className="qs-overlay-bar">
            <span>Preview · {s.pageCount} A4 pages{dirty ? " · unsaved edits included" : ""}</span>
            <button type="button" onClick={closePreview} aria-label="Close preview"><X size={16} aria-hidden /> Close</button>
          </div>
          <div className="qs-overlay-scroll">
            <QuotationPreview quotation={previewQ} embedded onPage4Overflow={s.setOverflow} />
          </div>
        </div>
      )}

      {/* Off-screen copy that window.print() prints, and the hidden overflow check that feeds the warning above. */}
      <QuotationPrintDocument quotation={previewQ} />
      {!preview && <div className="qs-offscreen" aria-hidden><QuotationPreview quotation={previewQ} embedded onPage4Overflow={s.setOverflow} /></div>}

      {confirmFinalize && (
        <ConfirmDialog
          title="Finalize this quotation?"
          body="This locks it permanently and it cannot be edited afterwards. Need changes later? Duplicate it from the quotations list."
          confirmLabel="Finalize"
          busy={busy.finalize}
          onConfirm={() => void s.finalize().then((ok) => { setConfirmFinalize(false); if (ok && q.id) router.push(`/admin/quotations/${q.id}`); })}
          onCancel={() => setConfirmFinalize(false)}
        />
      )}
      <Toaster toasts={s.toasts} onDismiss={s.dismiss} />
    </div>
  );
}
