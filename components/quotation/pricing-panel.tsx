"use client";
import { amountInWords } from "@/lib/amount-in-words";
import { NumberCell } from "./items-table";
import { DEFAULT_GST_RATE, formatINR, hasDiscount, type DiscountType, type GstMode, type QuotationState, type QuotationTotals } from "./quotation-model";
import { MAX_RATE } from "./editor-logic";

type Patch = Partial<Pick<QuotationState, "discountType" | "discountValue" | "gstEnabled" | "gstMode" | "gstRate">>;

export function PricingPanel({ q, totals, pageCount, onChange }: {
  q: QuotationState; totals: QuotationTotals; pageCount: number; onChange: (patch: Patch, key: string) => void;
}) {
  const discountType = q.discountType ?? "";
  const gstOn = Boolean(q.gstEnabled);
  const mode: GstMode = q.gstMode === "IGST" ? "IGST" : "CGST_SGST";
  const rate = q.gstRate ?? DEFAULT_GST_RATE;
  const discounted = hasDiscount(q, totals);
  const clamped = discountType === "FLAT" && (q.discountValue ?? 0) > totals.subtotal && totals.subtotal > 0;

  return (
    <section className="pricing-panel" aria-label="Pricing and tax">
      <h4>Discount &amp; GST</h4>

      <div className="pp-row">
        <label>Discount
          <select value={discountType} onChange={(e) => onChange({ discountType: (e.target.value || null) as DiscountType | null, discountValue: 0 }, "discount:type")}>
            <option value="">None</option>
            <option value="PERCENT">Percentage (%)</option>
            <option value="FLAT">Flat amount (₹)</option>
          </select>
        </label>
        {discountType && (
          <label>{discountType === "PERCENT" ? "Percent off" : "Amount off (₹)"}
            <NumberCell cellId="discount-value" label="Discount value" value={q.discountValue ?? 0} max={discountType === "PERCENT" ? 100 : MAX_RATE} invalid={false} onCommit={(n) => onChange({ discountValue: n }, "discount:value")} onKeyDown={() => undefined} />
          </label>
        )}
      </div>
      {clamped && <p className="validation-msg">The discount is larger than the subtotal, so it is limited to the subtotal.</p>}

      <label className="pp-check">
        <input type="checkbox" checked={gstOn} onChange={(e) => onChange({ gstEnabled: e.target.checked, gstMode: mode, gstRate: rate }, "gst:on")} />
        Charge GST on this quotation
      </label>
      {gstOn && (
        <div className="pp-row">
          <label>Type
            <select value={mode} onChange={(e) => onChange({ gstMode: e.target.value as GstMode }, "gst:mode")}>
              <option value="CGST_SGST">CGST + SGST (within Haryana)</option>
              <option value="IGST">IGST (outside Haryana)</option>
            </select>
          </label>
          <label>Rate (%)
            <NumberCell cellId="gst-rate" label="GST rate" value={rate} max={100} invalid={false} onCommit={(n) => onChange({ gstRate: n }, "gst:rate")} onKeyDown={() => undefined} />
          </label>
        </div>
      )}

      <dl className="pp-summary">
        <div><dt>Subtotal</dt><dd>{formatINR(totals.subtotal)}</dd></div>
        {discounted && <div><dt>Discount</dt><dd>−{formatINR(totals.discount)}</dd></div>}
        {gstOn && mode === "CGST_SGST" && <><div><dt>CGST @ {rate / 2}%</dt><dd>{formatINR(totals.cgst)}</dd></div><div><dt>SGST @ {rate / 2}%</dt><dd>{formatINR(totals.sgst)}</dd></div></>}
        {gstOn && mode === "IGST" && <div><dt>IGST @ {rate}%</dt><dd>{formatINR(totals.igst)}</dd></div>}
        <div className="total"><dt>Final total</dt><dd>{formatINR(totals.grandTotal)}</dd></div>
      </dl>
      {totals.grandTotal > 0 && <p className="pp-words">{amountInWords(totals.grandTotal)}</p>}
      <p className="pp-pages">{pageCount} page{pageCount === 1 ? "" : "s"} in the PDF{pageCount > 4 ? ". The price table continues onto extra pages automatically." : "."}</p>
    </section>
  );
}
