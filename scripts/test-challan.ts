/**
 * Delivery challan logic: numbering, completeness, totals, page breaks, raising from an invoice.
 *   npm run test:challan
 */
import assert from "node:assert/strict";
import {
  challanFromInvoice, challanPageCount, challanPages, challanTotals, draftReference, emptyChallan, emptyItem,
  financialYearStart, formatChallanNumber, isDraftReference, nextChallanNumber, quantityByUnit, whatIsMissing,
  PAGE_LINES, savedItems, type ChallanState,
} from "../lib/challan";
import { CHALLAN_PRESETS } from "../lib/challan-presets";
import { CHALLAN_FIXTURES } from "../lib/challan-fixtures";

let passed = 0;
const check = (name: string, fn: () => void) => { fn(); passed++; console.log(`  ok  ${name}`); };

check("financial year starts in April", () => {
  assert.equal(financialYearStart("2026-04-01"), 2026);
  assert.equal(financialYearStart("2027-03-31"), 2026);
  assert.equal(financialYearStart("2026-03-31"), 2025);
});

check("numbers read STBS/DC/2026-27/0001 and roll over at 2099-00", () => {
  assert.equal(formatChallanNumber(2026, 1), "STBS/DC/2026-27/0001");
  assert.equal(formatChallanNumber(2099, 12), "STBS/DC/2099-00/0012");
});

check("next number continues the year's series and ignores other years and drafts", () => {
  const taken = ["STBS/DC/2026-27/0001", "STBS/DC/2026-27/0004", "STBS/DC/2025-26/0090", draftReference("x"), "STBS-DEL-2026-0001"];
  assert.equal(nextChallanNumber(taken, 2026), 5);
  assert.equal(nextChallanNumber(taken, 2027), 1);
  assert.equal(nextChallanNumber([], 2026), 1);
});

check("draft references are recognised and never look like a number", () => {
  assert.ok(isDraftReference(draftReference("abc")));
  assert.ok(!isDraftReference("STBS/DC/2026-27/0001"));
});

check("an empty challan says what is missing", () => {
  const c = emptyChallan("2026-11-02");
  assert.deepEqual(whatIsMissing(c), ["the client's name", "at least one item with a quantity"]);
  c.client.name = "Client"; c.items = [{ ...emptyItem(), description: "Pipe", quantity: 2 }];
  assert.deepEqual(whatIsMissing(c), []);
  c.deliverToSame = false;
  assert.deepEqual(whatIsMissing(c), ["the delivery address"]);
});

check("blank rows and zero quantities are left out of the challan", () => {
  const c: ChallanState = { ...emptyChallan(), items: [
    { ...emptyItem(), description: "Pipe", quantity: 3, unit: "m", rate: 10 },
    { ...emptyItem(), description: "", quantity: 5 },
    { ...emptyItem(), description: "Cap", quantity: 0 },
  ] };
  assert.equal(challanTotals(c).lines, 1);
  assert.equal(challanTotals(c).value, 30);
});

check("quantities are summed per unit, never across units", () => {
  const c: ChallanState = { ...emptyChallan(), items: [
    { ...emptyItem(), description: "Pipe", quantity: 40, unit: "m" },
    { ...emptyItem(), description: "Screen", quantity: 12.5, unit: "m" },
    { ...emptyItem(), description: "Cap", quantity: 2, unit: "Nos" },
  ] };
  assert.equal(quantityByUnit(c), "52.5 m · 2 Nos");
});

check("a short challan is one page; a long one breaks and keeps every item", () => {
  assert.equal(challanPageCount(CHALLAN_FIXTURES.basic), 1);
  const many = CHALLAN_FIXTURES["many-items"];
  const pages = challanPages(many);
  assert.ok(pages.length > 1);
  assert.equal(pages.flat().length, many.items.length);
});

check("a page that cannot fit the signatures hands them a page of their own", () => {
  const fill = Array.from({ length: PAGE_LINES.first - PAGE_LINES.footer + 1 }, (_, n) => ({ ...emptyItem(), description: `Line ${n}`, quantity: 1 }));
  const pages = challanPages({ items: fill, showRates: false });
  assert.equal(pages.length, 2);
  assert.equal(pages[1].length, 0);
});

check("raising from an invoice copies client, site and lines, and links back", () => {
  const c = challanFromInvoice({
    id: "inv1",
    client: { companyName: " Client Co ", city: "Sonipat", state: "", phone: "98", gstin: "06X" },
    shipTo: { sameAsBilling: false, companyName: "Site A", addressLine1: "Plot 4", city: "Kundli" },
    items: [{ description: "Drilling", quantity: 150, unit: "ft", rate: 90, hsn: "9954" }, { description: "", quantity: 1, rate: 0 }],
  }, "STBS/INV/0765", "2026-11-02");
  assert.equal(c.client.name, "Client Co");
  assert.equal(c.client.state, "Haryana");
  assert.equal(c.deliverToSame, false);
  assert.equal(c.deliverTo.name, "Site A");
  assert.equal(c.items.length, 1);
  assert.equal(c.items[0].hsn, "9954");
  assert.equal(c.invoiceId, "inv1");
  assert.equal(c.invoiceRef, "STBS/INV/0765");
  assert.equal(c.showRates, false);
});

check("an invoice billed and shipped to the same place leaves 'deliver to' on same", () => {
  const c = challanFromInvoice({ client: { companyName: "X" }, shipTo: { sameAsBilling: true }, items: [] }, "Draft invoice");
  assert.equal(c.deliverToSame, true);
  assert.equal(c.items.length, 1); // one empty row to start typing into
});

check("a line with words but no quantity blocks issuing, and is still kept by a save", () => {
  const c: ChallanState = { ...emptyChallan(), client: { ...emptyChallan().client, name: "X" }, items: [
    { ...emptyItem(), description: "Pipe", quantity: 4 },
    { ...emptyItem(), description: "Gravel", quantity: 0 },
  ] };
  assert.deepEqual(whatIsMissing(c), ["a quantity on every line (or remove the empty ones)"]);
  assert.equal(savedItems(c.items).length, 2);
  assert.equal(challanTotals(c).lines, 1); // the printout counts only lines with a quantity
});

check("challan presets are goods only, each with a unit, and keys are unique", () => {
  assert.ok(CHALLAN_PRESETS.length >= 3);
  assert.equal(new Set(CHALLAN_PRESETS.map((p) => p.key)).size, CHALLAN_PRESETS.length);
  for (const p of CHALLAN_PRESETS) {
    assert.ok(p.items.length > 0, p.name);
    for (const i of p.items) {
      assert.ok(i.description.trim() && i.unit.trim(), `${p.name}: ${i.description}`);
      assert.ok(!/drilling|labour|transportation|development/i.test(i.description), `${p.name} holds a service line: ${i.description}`);
      assert.ok(!/[{}]/.test(i.description), `${p.name} has an unfilled placeholder: ${i.description}`);
    }
  }
});

check("a new challan starts with no quotation link", () => {
  assert.equal(emptyChallan().quotationRef, "");
  assert.equal(emptyChallan().quotationId, undefined);
});

console.log(`\n${passed} checks passed.`);
