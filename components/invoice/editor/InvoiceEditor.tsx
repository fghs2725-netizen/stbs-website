"use client";
/**
 * The invoice editor.
 *
 * Every figure shown here comes from `calcInvoiceTotals`, the same function the printed invoice and
 * the PDF use, so what the owner sees while typing is what will be printed.
 *
 * Which columns appear follows the settings switches, so an owner who has turned the HSN column off
 * is never asked for an HSN code.
 */
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, ChevronUp, ChevronDown, Eye, SlidersHorizontal, X } from "lucide-react";
import {
  calcInvoiceTotals, dueDateFor, formatINR, lineAmount, validateItem, whatIsMissing,
  type InvoiceItem, type InvoiceState,
} from "../invoice-model";
import { effectiveInvoiceSettings, type InvoiceSettings, type InvoiceSettingsOverride } from "../invoice-settings";
import { InvoiceDocument, type InvoiceBusiness } from "../InvoiceDocument";
import { invoicePageCount } from "../invoice-pagination";
import { InvoicePdfActions } from "../share/InvoicePdfActions";
import { shareSubjectFromInvoice } from "../share/invoice-share";
import { SegmentsPanel } from "../segments/SegmentsPanel";
import { UnitPicker } from "@/components/shared/UnitPicker";
import { Button } from "@/components/ui/button";
import "@/components/shared/unit-picker.css";
import "../segments/segments.css";

type Props = {
  initial: InvoiceState;
  settings: InvoiceSettings;
  /** Saves and returns the stored invoice, so a new one picks up its id. */
  save: (inv: InvoiceState) => Promise<InvoiceState>;
  /** Offered for a client's state, so the CGST/SGST vs IGST choice is not typed by hand. */
  gstModeFor: (state: string, gstin?: string) => Promise<"CGST_SGST" | "IGST" | null>;
  /** Bank details, signature and stamp, so the preview shows the invoice the client will receive. */
  business?: InvoiceBusiness;
  /** Every unit on offer: the built-in ones plus whatever the owner has added. */
  units: string[];
  /** Remembers a unit the owner typed, so it is offered on the next document too. */
  onCreateUnit?: (unit: string) => void | Promise<void>;
  /**
   * Where to go after a save. The admin pages leave this out and land on the saved invoice; the
   * dev-only harness passes its own so the editor can be exercised without a database behind it.
   */
  onSaved?: (saved: InvoiceState) => void;
};

const newRow = (): InvoiceItem => ({
  id: `tmp-${Math.random().toString(36).slice(2, 10)}`,
  description: "", unit: "", quantity: 1, rate: 0,
});

const num = (v: string) => (v.trim() === "" ? 0 : Number(v));

export function InvoiceEditor({ initial, settings, save, gstModeFor, business, units, onCreateUnit, onSaved }: Props) {
  const [inv, setInv] = useState<InvoiceState>(initial);
  const [saving, startSaving] = useTransition();
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(false);
  const [segments, setSegments] = useState(false);
  const router = useRouter();

  /*
   * What this invoice is actually drawn with: the global switches, with whatever it adds or removes
   * for itself laid over them. Everything below reads this rather than `settings`, or the editor
   * would total and paginate against one set of switches and print with another.
   */
  const effective = useMemo(
    () => effectiveInvoiceSettings(settings, inv.settingsOverride),
    [settings, inv.settingsOverride],
  );
  const totals = useMemo(() => calcInvoiceTotals(inv, effective), [inv, effective]);
  const missing = useMemo(() => whatIsMissing(inv, effective), [inv, effective]);
  const col = effective.columns;
  const issued = inv.status !== "DRAFT";

  const patch = (p: Partial<InvoiceState>) => setInv((s) => ({ ...s, ...p }));
  const patchClient = (p: Partial<InvoiceState["client"]>) =>
    setInv((s) => ({ ...s, client: { ...s.client, ...p } }));

  /**
   * When the client's state changes, offer the split that state implies rather than leaving a stale
   * one. The lookup runs on the server, so the typed value is applied straight away and the split
   * follows when it resolves — a slow round trip must never swallow a keystroke.
   */
  const onStateChange = (value: string) => {
    setInv((s) => ({ ...s, client: { ...s.client, state: value } }));
    if (!effective.gstModeAuto) return;
    void gstModeFor(value, inv.client.gstin).then((mode) => {
      if (mode) setInv((s) => (s.client.state === value ? { ...s, gstMode: mode } : s));
    });
  };

  const setItem = (id: string, p: Partial<InvoiceItem>) =>
    setInv((s) => ({ ...s, items: s.items.map((i) => (i.id === id ? { ...i, ...p } : i)) }));

  const move = (index: number, by: -1 | 1) =>
    setInv((s) => {
      const next = [...s.items];
      const target = index + by;
      if (target < 0 || target >= next.length) return s;
      [next[index], next[target]] = [next[target], next[index]];
      return { ...s, items: next };
    });

  /** What was last written to the database, so the preview can say whether it is showing more. */
  const persisted = useRef(JSON.stringify(initial));
  const dirty = JSON.stringify(inv) !== persisted.current;

  const persist = useCallback(async () => {
    const saved = await save(inv);
    setInv(saved);
    persisted.current = JSON.stringify(saved);
    return saved;
  }, [inv, save]);

  const onSave = () =>
    startSaving(async () => {
      setError("");
      try {
        const saved = await persist();
        if (onSaved) onSaved(saved);
        else router.push(`/admin/invoices/${saved.id}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not save this invoice.");
      }
    });

  /*
   * The PDF route renders the stored invoice, so an export from the preview saves first. Without
   * that, the file would quietly be the last save rather than the document on screen.
   */
  const beforePdf = useCallback(async () => { if (dirty) await persist(); }, [dirty, persist]);

  const pageCount = useMemo(() => invoicePageCount(inv, effective), [inv, effective]);
  // A draft has no number, and `GET /api/invoices/[id]/pdf` refuses one.
  const canExport = Boolean(inv.id && inv.number);
  const shareSubject = useMemo(
    () => shareSubjectFromInvoice(inv, effective, { grandTotal: totals.grandTotal, balance: totals.balance }),
    [inv, effective, totals.grandTotal, totals.balance],
  );

  // Escape closes the preview, and focus returns to the button that opened it.
  const previewButton = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (!preview) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setPreview(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [preview]);
  const closePreview = () => { setPreview(false); previewButton.current?.focus(); };

  return (
    <div className="flex flex-col gap-4">
      {error && <p role="alert" className="a-card p-4 text-[0.9375rem]" style={{ color: "var(--a-danger)" }}>{error}</p>}

      {issued && (
        <p className="a-card p-4 text-[0.875rem]" style={{ color: "var(--a-body)" }}>
          This invoice has been issued as number {inv.number}. You can still change it, and every change
          is recorded in its edit history.
        </p>
      )}

      <section className="a-card p-4">
        <h2 className="a-h2">Client</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="a-label">Company name
            <input className="a-input mt-1" value={inv.client.companyName} onChange={(e) => patchClient({ companyName: e.target.value })} />
          </label>
          <label className="a-label">Contact person
            <input className="a-input mt-1" value={inv.client.contactPerson} onChange={(e) => patchClient({ contactPerson: e.target.value })} />
          </label>
          <label className="a-label">Address line 1
            <input className="a-input mt-1" value={inv.client.addressLine1} onChange={(e) => patchClient({ addressLine1: e.target.value })} />
          </label>
          <label className="a-label">Address line 2
            <input className="a-input mt-1" value={inv.client.addressLine2} onChange={(e) => patchClient({ addressLine2: e.target.value })} />
          </label>
          <label className="a-label">City
            <input className="a-input mt-1" value={inv.client.city} onChange={(e) => patchClient({ city: e.target.value })} />
          </label>
          <label className="a-label">State
            <input className="a-input mt-1" value={inv.client.state} onChange={(e) => onStateChange(e.target.value)} placeholder="Haryana" />
          </label>
          <label className="a-label">PIN code
            <input className="a-input mt-1" value={inv.client.pinCode} onChange={(e) => patchClient({ pinCode: e.target.value })} />
          </label>
          <label className="a-label">Phone
            <input className="a-input mt-1" value={inv.client.phone} onChange={(e) => patchClient({ phone: e.target.value })} />
          </label>
          <label className="a-label">GSTIN
            <input className="a-input mt-1" value={inv.client.gstin} onChange={(e) => patchClient({ gstin: e.target.value })} placeholder="06ABCDE1234F1Z5" />
          </label>
          <label className="a-label">Their order number
            <input className="a-input mt-1" value={inv.purchaseOrder ?? ""} onChange={(e) => patch({ purchaseOrder: e.target.value })} />
          </label>
        </div>
      </section>

      <section className="a-card p-4">
        <h2 className="a-h2">Items</h2>

        {inv.items.length === 0 ? (
          <p className="a-sub mt-3">No items yet. Add the first one.</p>
        ) : (
          <ul className="a-divide mt-3">
            {inv.items.map((item, index) => {
              const errors = validateItem(item);
              return (
                <li key={item.id} className="py-3 first:pt-0">
                  <div className="flex flex-wrap items-start gap-2">
                    <span className="a-num pt-2 text-[0.8125rem]" style={{ color: "var(--a-faint)" }}>{index + 1}</span>
                    <div className="min-w-[200px] flex-1">
                      <input
                        className="a-input" placeholder="Item name"
                        value={item.description} onChange={(e) => setItem(item.id, { description: e.target.value })}
                      />
                      {col.details && (
                        <textarea
                          className="a-input mt-1" rows={2} placeholder="Details: brand, model, size (optional)"
                          value={item.details ?? ""} onChange={(e) => setItem(item.id, { details: e.target.value })}
                        />
                      )}
                      {errors.description && <p className="mt-1 text-[0.8125rem]" style={{ color: "var(--a-danger)" }}>{errors.description}</p>}
                    </div>

                    {col.hsn && (
                      <label className="a-label w-24">HSN/SAC
                        <input className="a-input mt-1" value={item.hsn ?? ""} onChange={(e) => setItem(item.id, { hsn: e.target.value })} />
                        {errors.hsn && <span className="text-[0.75rem]" style={{ color: "var(--a-danger)" }}>{errors.hsn}</span>}
                      </label>
                    )}
                    {col.unit && (
                      <div className="a-label w-24">Unit
                        <UnitPicker
                          className="mt-1"
                          value={item.unit}
                          units={units}
                          onCreate={onCreateUnit}
                          onChange={(unit) => setItem(item.id, { unit })}
                        />
                      </div>
                    )}
                    <label className="a-label w-20">Qty
                      <input type="number" step="0.01" className="a-input mt-1" value={item.quantity} onChange={(e) => setItem(item.id, { quantity: num(e.target.value) })} />
                    </label>
                    <label className="a-label w-28">Rate
                      <input type="number" step="0.01" className="a-input mt-1" value={item.rate} onChange={(e) => setItem(item.id, { rate: num(e.target.value) })} />
                    </label>
                    {col.lineDiscount && (
                      <label className="a-label w-20">Disc %
                        <input type="number" step="0.01" className="a-input mt-1" value={item.discountPercent ?? 0} onChange={(e) => setItem(item.id, { discountPercent: num(e.target.value) })} />
                      </label>
                    )}
                    {col.lineGst && (
                      <label className="a-label w-20">GST %
                        <input type="number" step="0.01" className="a-input mt-1" value={item.gstRate ?? inv.gstRate} onChange={(e) => setItem(item.id, { gstRate: num(e.target.value) })} />
                      </label>
                    )}

                    <div className="flex flex-col items-end gap-1 pt-5">
                      <span className="a-num text-[0.875rem]" style={{ color: "var(--a-ink)" }}>
                        {formatINR(lineAmount(item, col.lineDiscount))}
                      </span>
                      <span className="flex gap-1">
                        <button type="button" aria-label="Move up" className="a-link" onClick={() => move(index, -1)}><ChevronUp className="size-4" /></button>
                        <button type="button" aria-label="Move down" className="a-link" onClick={() => move(index, 1)}><ChevronDown className="size-4" /></button>
                        <button
                          type="button" aria-label="Remove item" className="a-link"
                          onClick={() => setInv((s) => ({ ...s, items: s.items.filter((i) => i.id !== item.id) }))}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <Button
          type="button" size="sm" variant="secondary" className="mt-3"
          onClick={() => setInv((s) => ({ ...s, items: [...s.items, newRow()] }))}
        >
          <Plus className="size-4" /> Add item
        </Button>
      </section>

      <section className="a-card p-4">
        <h2 className="a-h2">Dates, discount and GST</h2>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="a-label">Invoice date
            <input
              type="date" className="a-input mt-1 w-auto" value={inv.date}
              onChange={(e) => patch({ date: e.target.value, dueDate: dueDateFor(e.target.value, effective.creditDays) })}
            />
          </label>
          <label className="a-label">Due date
            <input type="date" className="a-input mt-1 w-auto" value={inv.dueDate ?? ""} onChange={(e) => patch({ dueDate: e.target.value })} />
          </label>
          <label className="a-label">Discount
            <select className="a-input mt-1 w-auto" value={inv.discountType ?? ""} onChange={(e) => patch({ discountType: (e.target.value || null) as InvoiceState["discountType"] })}>
              <option value="">None</option>
              <option value="PERCENT">Percent</option>
              <option value="FLAT">Flat amount</option>
            </select>
          </label>
          {inv.discountType && (
            <label className="a-label">Value
              <input type="number" step="0.01" min="0" className="a-input mt-1 w-28" value={inv.discountValue ?? 0} onChange={(e) => patch({ discountValue: num(e.target.value) })} />
            </label>
          )}
          <label className="flex items-center gap-2 pb-2 text-[0.875rem]" style={{ color: "var(--a-ink)" }}>
            <input type="checkbox" checked={inv.gstEnabled} onChange={(e) => patch({ gstEnabled: e.target.checked })} /> Charge GST
          </label>
          {inv.gstEnabled && (
            <>
              <label className="a-label">Rate %
                <input type="number" step="0.01" min="0" max="100" className="a-input mt-1 w-24" value={inv.gstRate} onChange={(e) => patch({ gstRate: num(e.target.value) })} />
              </label>
              <label className="a-label">Split
                <select className="a-input mt-1 w-auto" value={inv.gstMode} onChange={(e) => patch({ gstMode: e.target.value as InvoiceState["gstMode"] })}>
                  <option value="CGST_SGST">CGST + SGST (within Haryana)</option>
                  <option value="IGST">IGST (other states)</option>
                </select>
              </label>
            </>
          )}
          <label className="flex items-center gap-2 pb-2 text-[0.875rem]" style={{ color: "var(--a-ink)" }}>
            <input type="checkbox" checked={Boolean(inv.reverseCharge)} onChange={(e) => patch({ reverseCharge: e.target.checked })} /> Reverse charge
          </label>
        </div>
      </section>

      <section className="a-card p-4">
        <h2 className="a-h2">Totals</h2>
        <dl className="a-num mt-3 grid max-w-sm grid-cols-2 gap-y-1 text-[0.875rem]">
          <dt style={{ color: "var(--a-faint)" }}>Subtotal</dt>
          <dd className="text-right">{formatINR(totals.subtotal)}</dd>
          {totals.discount > 0 && (<><dt style={{ color: "var(--a-faint)" }}>Discount</dt><dd className="text-right">−{formatINR(totals.discount)}</dd></>)}
          {inv.gstEnabled && inv.gstMode === "IGST" && (<><dt style={{ color: "var(--a-faint)" }}>IGST</dt><dd className="text-right">{formatINR(totals.igst)}</dd></>)}
          {inv.gstEnabled && inv.gstMode !== "IGST" && (
            <><dt style={{ color: "var(--a-faint)" }}>CGST</dt><dd className="text-right">{formatINR(totals.cgst)}</dd>
              <dt style={{ color: "var(--a-faint)" }}>SGST</dt><dd className="text-right">{formatINR(totals.sgst)}</dd></>
          )}
          {totals.roundOff !== 0 && effective.blocks.roundOff && (<><dt style={{ color: "var(--a-faint)" }}>Round off</dt><dd className="text-right">{formatINR(totals.roundOff)}</dd></>)}
          <dt className="font-semibold" style={{ color: "var(--a-ink)" }}>Total</dt>
          <dd className="text-right font-semibold" style={{ color: "var(--a-ink)" }}>{formatINR(totals.grandTotal)}</dd>
        </dl>
      </section>

      {missing.length > 0 && (
        <div className="a-card p-4">
          <p className="text-[0.9375rem] font-semibold" style={{ color: "var(--a-ink)" }}>Before this can be issued</p>
          <ul className="mt-2 list-disc pl-5 text-[0.875rem]" style={{ color: "var(--a-body)" }}>
            {missing.map((m) => <li key={m}>Add {m}.</li>)}
          </ul>
          <p className="mt-2 text-[0.8125rem]" style={{ color: "var(--a-faint)" }}>You can still save it as a draft.</p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" onClick={onSave} disabled={saving}>{saving ? "Saving…" : "Save invoice"}</Button>
        <Button
          type="button" variant="secondary" ref={previewButton}
          onClick={() => setPreview(true)}
          title="See the invoice exactly as it will print"
        >
          <Eye className="size-4" /> Preview
        </Button>
      </div>

      {preview && (
        <div className="inv-overlay" role="dialog" aria-modal="true" aria-label="Invoice preview">
          <div className="inv-overlay-bar">
            <span>
              Preview · {pageCount} A4 page{pageCount === 1 ? "" : "s"}
              {dirty ? " · unsaved edits included" : ""}
            </span>
            <div className="inv-overlay-actions">
              {!canExport && (
                <span className="inv-overlay-note">Issue this invoice to export a PDF</span>
              )}
              <InvoicePdfActions
                id={inv.id ?? ""}
                subject={shareSubject}
                beforePdf={beforePdf}
                saveLabel="Save PDF"
                disabled={!canExport}
                disabledReason="Issue this invoice to export a PDF"
              />
              <button type="button" className="inv-overlay-close" onClick={() => setSegments(true)}>
                <SlidersHorizontal size={15} aria-hidden /> Segments
              </button>
              <button type="button" className="inv-overlay-close" onClick={closePreview} aria-label="Close preview">
                <X size={16} aria-hidden /> Close
              </button>
            </div>
          </div>
          <div className="inv-overlay-scroll">
            <div className="inv-stage">
              <InvoiceDocument invoice={inv} settings={effective} business={business} isEditorPreview />
            </div>
          </div>

          {segments && (
            <>
              <button type="button" className="seg-scrim" aria-label="Close segments" onClick={() => setSegments(false)} />
              <SegmentsPanel
                base={settings}
                value={inv.settingsOverride ?? {}}
                onChange={(settingsOverride) => patch({ settingsOverride })}
                onClose={() => setSegments(false)}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}
