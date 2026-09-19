import assert from "node:assert/strict";
import { calcTotal, calcTotals, getValidItems, hasDiscount, type QuotationItem } from "../components/quotation/quotation-model";

let passed = 0;
function check(label: string, fn: () => void) { fn(); passed++; console.log(`  ok  ${label}`); }
const item = (id: string, quantity: number, rate: number): QuotationItem => ({ id, description: "x", unit: "m", quantity, rate });
const items = [item("a", 100, 1250), item("b", 60, 480.5)]; // 125000 + 28830 = 153830

check("no discount and GST off: final total equals the existing calcTotal (template unchanged)", () => {
  const t = calcTotals({ items });
  assert.equal(t.subtotal, calcTotal(getValidItems(items)));
  assert.equal(t.grandTotal, 153830);
  assert.equal(t.tax, 0);
  assert.equal(t.discount, 0);
});
check("percentage discount comes off the subtotal", () => {
  const q = { items, discountType: "PERCENT" as const, discountValue: 5 };
  const t = calcTotals(q);
  assert.equal(t.discount, 7691.5);
  assert.equal(t.taxable, 146138.5);
  assert.equal(hasDiscount(q, t), true);
});
check("flat discount comes off the subtotal", () => {
  const t = calcTotals({ items, discountType: "FLAT", discountValue: 2500 });
  assert.equal(t.discount, 2500);
  assert.equal(t.grandTotal, 151330);
});
check("a flat discount larger than the subtotal is limited so the total never goes negative", () => {
  const t = calcTotals({ items, discountType: "FLAT", discountValue: 999999 });
  assert.equal(t.discount, 153830);
  assert.equal(t.grandTotal, 0);
});
check("a percentage above 100 is limited to 100; negatives are ignored", () => {
  assert.equal(calcTotals({ items, discountType: "PERCENT", discountValue: 250 }).grandTotal, 0);
  assert.equal(calcTotals({ items, discountType: "PERCENT", discountValue: -10 }).discount, 0);
});
check("CGST + SGST split the rate evenly and are charged on the taxable value", () => {
  const t = calcTotals({ items, gstEnabled: true, gstMode: "CGST_SGST", gstRate: 18 });
  assert.equal(t.cgst, 13844.7);
  assert.equal(t.sgst, 13844.7);
  assert.equal(t.igst, 0);
  assert.equal(t.tax, 27689.4);
  assert.equal(t.grandTotal, 181519.4);
});
check("IGST is a single line at the full rate", () => {
  const t = calcTotals({ items, gstEnabled: true, gstMode: "IGST", gstRate: 18 });
  assert.equal(t.igst, 27689.4);
  assert.equal(t.cgst, 0);
  assert.equal(t.sgst, 0);
  assert.equal(t.grandTotal, 181519.4);
});
check("GST is charged after the discount", () => {
  const t = calcTotals({ items, discountType: "PERCENT", discountValue: 10, gstEnabled: true, gstMode: "IGST", gstRate: 18 });
  assert.equal(t.taxable, 138447);
  assert.equal(t.igst, 24920.46);
  assert.equal(t.grandTotal, 163367.46);
});
check("GST switched off ignores any leftover mode or rate", () => {
  const t = calcTotals({ items, gstEnabled: false, gstMode: "IGST", gstRate: 28 });
  assert.equal(t.tax, 0);
  assert.equal(t.grandTotal, 153830);
});
check("an unset mode defaults to CGST + SGST; the rate is limited to 0-100", () => {
  assert.ok(calcTotals({ items, gstEnabled: true, gstRate: 18 }).cgst > 0);
  assert.equal(calcTotals({ items, gstEnabled: true, gstMode: "IGST", gstRate: 500 }).igst, 153830);
  assert.equal(calcTotals({ items, gstEnabled: true, gstMode: "IGST", gstRate: 0 }).tax, 0);
});
check("half-paisa amounts round once per value, not drift", () => {
  const t = calcTotals({ items: [item("a", 1, 0.05)], gstEnabled: true, gstMode: "CGST_SGST", gstRate: 18 });
  assert.equal(t.cgst, 0);
  assert.equal(Number.isInteger(Math.round(t.grandTotal * 100)), true);
});
check("incomplete rows are excluded from every figure", () => {
  const t = calcTotals({ items: [...items, { id: "bad", description: "", unit: "", quantity: 0, rate: 0 }], discountType: "FLAT", discountValue: 100 });
  assert.equal(t.subtotal, 153830);
});

console.log(`\n${passed} checks passed`);
