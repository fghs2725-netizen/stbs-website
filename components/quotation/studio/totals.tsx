"use client";
import { Plus, X } from "lucide-react";
import { DEFAULT_GST_RATE, formatINR, hasDiscount, type GstMode, type QuotationState, type QuotationTotals } from "../quotation-model";
import { amountInWords } from "@/lib/amount-in-words";

type Patch = (changes: Partial<QuotationState>, key?: string) => void;

const numeric = (raw: string, max: number) => {
  const cleaned = raw.replace(/[^0-9.]/g, "");
  const dot = cleaned.indexOf(".");
  const text = dot === -1 ? cleaned : cleaned.slice(0, dot + 1) + cleaned.slice(dot + 1).replace(/\./g, "").slice(0, 2);
  return Math.min(Number(text) || 0, max);
};

function Segmented<T extends string>({ value, options, label, onChange }: { value: T; options: { value: T; label: string }[]; label: string; onChange: (v: T) => void }) {
  return (
    <span className="qs-seg" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value} data-on={value === o.value || undefined} onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </span>
  );
}

/** Subtotal, optional discount, optional GST and the final total, edited right where they print. */
export function Totals({ q, totals, patch, hasItems }: { q: QuotationState; totals: QuotationTotals; patch: Patch; hasItems: boolean }) {
  const discountOn = Boolean(q.discountType);
  const gstOn = Boolean(q.gstEnabled);
  const rate = q.gstRate ?? DEFAULT_GST_RATE;
  const mode: GstMode = q.gstMode ?? "CGST_SGST";
  const showDiscountRow = hasDiscount(q, totals);

  return (
    <section className="qs-totals" aria-label="Totals" data-qs-target="totals">
      <dl>
        <div className="qs-t-row"><dt>Subtotal</dt><dd>{formatINR(totals.subtotal)}</dd></div>

        {discountOn ? (
          <div className="qs-t-row qs-t-edit">
            <dt>
              Discount
              <Segmented label="Discount type" value={q.discountType ?? "PERCENT"} options={[{ value: "PERCENT", label: "%" }, { value: "FLAT", label: "₹" }]} onChange={(discountType) => patch({ discountType, discountValue: 0 })} />
              <input className="qs-mini" inputMode="decimal" aria-label="Discount value" value={q.discountValue ? String(q.discountValue) : ""} placeholder="0" onChange={(e) => patch({ discountValue: numeric(e.target.value, q.discountType === "PERCENT" ? 100 : 9_999_999_999) }, "discount")} />
              <button type="button" className="qs-x" aria-label="Remove discount" onClick={() => patch({ discountType: null, discountValue: 0 })}><X size={14} /></button>
            </dt>
            <dd>{showDiscountRow ? `−${formatINR(totals.discount)}` : "—"}</dd>
          </div>
        ) : (
          <div className="qs-t-row qs-t-add"><button type="button" onClick={() => patch({ discountType: "PERCENT", discountValue: 0 })}><Plus size={13} aria-hidden /> Add discount</button></div>
        )}

        {showDiscountRow && gstOn && <div className="qs-t-row"><dt>Taxable value</dt><dd>{formatINR(totals.taxable)}</dd></div>}

        {gstOn ? (
          <>
            <div className="qs-t-row qs-t-edit">
              <dt>
                GST
                <Segmented label="GST type" value={mode} options={[{ value: "CGST_SGST", label: "CGST + SGST" }, { value: "IGST", label: "IGST" }]} onChange={(gstMode) => patch({ gstMode })} />
                <input className="qs-mini" inputMode="decimal" aria-label="GST rate" value={String(rate)} onChange={(e) => patch({ gstRate: numeric(e.target.value, 100) }, "gstRate")} />
                <span className="qs-unit">%</span>
                <button type="button" className="qs-x" aria-label="Remove GST" onClick={() => patch({ gstEnabled: false })}><X size={14} /></button>
              </dt>
              <dd>{formatINR(totals.tax)}</dd>
            </div>
            <div className="qs-t-split">
              {mode === "IGST" ? <span>IGST @ {rate}% · {formatINR(totals.igst)}</span> : <><span>CGST @ {rate / 2}% · {formatINR(totals.cgst)}</span><span>SGST @ {rate / 2}% · {formatINR(totals.sgst)}</span></>}
            </div>
          </>
        ) : (
          <div className="qs-t-row qs-t-add"><button type="button" onClick={() => patch({ gstEnabled: true, gstMode: q.gstMode ?? "CGST_SGST", gstRate: q.gstRate ?? DEFAULT_GST_RATE })}><Plus size={13} aria-hidden /> Add GST</button></div>
        )}

        <div className="qs-t-row qs-t-grand"><dt>Final total</dt><dd>{formatINR(totals.grandTotal)}</dd></div>
      </dl>
      {hasItems && totals.grandTotal > 0 && <p className="qs-words">{amountInWords(totals.grandTotal)}</p>}
    </section>
  );
}
