import assert from "node:assert/strict";
import { estimateRowHeight, paginatePriceItems, PRICE_LAYOUT, quotationPageCount, subTotalRowCount, totalsBlockHeight, wrapLines } from "../components/quotation/pagination";
import { buildDraft, calcTotals, type QuotationItem } from "../components/quotation/quotation-model";

let passed = 0;
function check(label: string, fn: () => void) { fn(); passed++; console.log(`  ok  ${label}`); }
const row = (n: number, description = `Item ${n}`): QuotationItem => ({ id: `r${n}`, description, unit: "Nos", quantity: 1, rate: 100 });
const rows = (count: number, description?: string) => Array.from({ length: count }, (_, i) => row(i + 1, description));
const opts = { subRows: 0, service: "Borewell Construction" };
const sum = (p: QuotationItem[][]) => p.reduce((a, b) => a + b.length, 0);

check("estimator matches lines measured in a real render (calibration cases)", () => {
  const W = PRICE_LAYOUT.descWidthPx;
  assert.equal(wrapLines("Line item 14 — supply and fitting of assorted material", W), 1);
  assert.equal(wrapLines("Labour and transport charges for installation, testing and commissioning at site including lowering of column pipe", W), 2);
  assert.equal(wrapLines("Supply of 10 HP submersible pump set including control panel, starter, cable of 100 metre length, and all fittings required for a complete working installation as per the site requirement", W), 4);
  assert.equal(wrapLines("Short item", W), 1);
  assert.equal(wrapLines("", W), 1);
});
check("over-long unbroken words break onto extra lines instead of overflowing", () => {
  assert.ok(wrapLines("x".repeat(200), PRICE_LAYOUT.descWidthPx) >= 4);
});
check("row height grows by one line height per wrapped line", () => {
  const one = estimateRowHeight(row(1));
  const three = estimateRowHeight(row(1, "word ".repeat(30).trim()));
  assert.equal(one, PRICE_LAYOUT.rowChrome + PRICE_LAYOUT.lineHeight);
  assert.ok(three > one + PRICE_LAYOUT.lineHeight);
});
check("no items still produces one (empty) price page", () => {
  assert.deepEqual(paginatePriceItems([], opts).pages, [[]]);
});
check("a typical quotation stays on a single price page, so the document is still 4 pages", () => {
  assert.equal(paginatePriceItems(rows(14), opts).pages.length, 1);
  assert.equal(quotationPageCount(buildDraft({ items: rows(14) })), 4);
});
check("no row is lost or duplicated, and start indexes continue across pages", () => {
  const { pages, starts } = paginatePriceItems(rows(60), opts);
  assert.equal(sum(pages), 60);
  assert.deepEqual(pages.flat().map((r) => r.id), rows(60).map((r) => r.id));
  assert.equal(starts[0], 0);
  pages.forEach((p, i) => { if (i) assert.equal(starts[i], starts[i - 1] + pages[i - 1].length); });
});
check("30 single-line items need more than one price page", () => {
  assert.ok(paginatePriceItems(rows(30), opts).pages.length >= 2);
});
check("every page's rows plus (on the last page) the totals block fit the page body", () => {
  for (const n of [1, 5, 14, 17, 18, 19, 20, 33, 34, 35, 60, 100]) {
    for (const subRows of [0, 2, 5]) {
      const { pages } = paginatePriceItems(rows(n), { ...opts, subRows });
      pages.forEach((p, i) => {
        const h = p.reduce((a, r) => a + estimateRowHeight(r), 0) + (i === pages.length - 1 ? totalsBlockHeight(subRows) : 0);
        assert.ok(h <= PRICE_LAYOUT.bodyPx, `n=${n} subRows=${subRows} page ${i + 1}: ${h}`);
      });
    }
  }
});
check("when the totals block does not fit under the last rows, rows move to a new final page (never a totals-only page)", () => {
  // Find a count where rows alone fit one page but rows + totals do not.
  let found = 0;
  for (let n = 1; n < 40; n++) {
    const rowsOnly = n * estimateRowHeight(row(1));
    if (rowsOnly <= PRICE_LAYOUT.bodyPx && rowsOnly + totalsBlockHeight(5) > PRICE_LAYOUT.bodyPx) {
      const { pages } = paginatePriceItems(rows(n), { ...opts, subRows: 5 });
      assert.equal(pages.length, 2);
      assert.ok(pages.every((p) => p.length > 0));
      found++;
    }
  }
  assert.ok(found > 0, "expected at least one boundary case");
});
check("long wrapping descriptions paginate sooner than short ones", () => {
  const short = paginatePriceItems(rows(12), opts).pages.length;
  const long = paginatePriceItems(rows(12, "supply installation testing and commissioning of the complete assembly including all fittings and site clearance as directed"), opts).pages.length;
  assert.ok(long > short);
});
check("a long service name (wraps in the header) reduces the room per page", () => {
  const roomy = paginatePriceItems(rows(17), opts).pages.length;
  const tight = paginatePriceItems(rows(17), { ...opts, service: "Supply, Installation, Testing and Commissioning of Submersible Pump Sets with Allied Works at Client Premises" }).pages.length;
  assert.ok(tight >= roomy);
});
check("totals rows above FINAL TOTAL: none by default, more with discount and GST", () => {
  const base = buildDraft({ items: rows(1) });
  assert.equal(subTotalRowCount(base, calcTotals(base)), 0);
  const gst = buildDraft({ items: rows(1), gstEnabled: true, gstMode: "CGST_SGST" });
  assert.equal(subTotalRowCount(gst, calcTotals(gst)), 3);
  const igst = buildDraft({ items: rows(1), gstEnabled: true, gstMode: "IGST" });
  assert.equal(subTotalRowCount(igst, calcTotals(igst)), 2);
  const both = buildDraft({ items: rows(1), gstEnabled: true, gstMode: "CGST_SGST", discountType: "PERCENT", discountValue: 5 });
  assert.equal(subTotalRowCount(both, calcTotals(both)), 5);
  const discountOnly = buildDraft({ items: rows(1), discountType: "FLAT", discountValue: 10 });
  assert.equal(subTotalRowCount(discountOnly, calcTotals(discountOnly)), 2);
});
check("total page count is 3 fixed pages plus the price pages", () => {
  const q = buildDraft({ items: rows(60) });
  assert.equal(quotationPageCount(q), 3 + paginatePriceItems(rows(60), { subRows: 0, service: q.serviceType }).pages.length);
});

console.log(`\n${passed} checks passed`);
