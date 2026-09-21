import assert from "node:assert/strict";
import { DETAILS_MAX_CHARS, DETAILS_MAX_LINES, cleanDetails, decodeItemText, detailsProblem, encodeItemText, limitDetailsInput } from "../components/quotation/item-text";
import { estimateRowHeight, paginatePriceItems } from "../components/quotation/pagination";
import { validateItem, type QuotationItem } from "../components/quotation/quotation-model";

let passed = 0;
function check(label: string, fn: () => void) { fn(); passed++; console.log(`  ok  ${label}`); }
const item = (over: Partial<QuotationItem> = {}): QuotationItem => ({ id: "a", description: "Drilling of 8 inch borewell", unit: "Meter", quantity: 10, rate: 1250, ...over });

/* ---------- old quotations are unaffected ---------- */

check("a row saved before details existed reads back as a name with no details", () => {
  for (const legacy of ["Drilling of 8 inch borewell", "PVC pipe 4\" (ISI)", "", "  spaced  ", "Line — with dash & symbols ₹"]) {
    assert.deepEqual(decodeItemText(legacy), { description: legacy }, JSON.stringify(legacy));
  }
});
check("encoding a name with no details stores exactly the name, so old and new rows look identical in the database", () => {
  assert.equal(encodeItemText("Pipe", undefined), "Pipe");
  assert.equal(encodeItemText("Pipe", ""), "Pipe");
  assert.equal(encodeItemText("Pipe", "   \n \n"), "Pipe");
  assert.equal(encodeItemText("Pipe", null), "Pipe");
});

/* ---------- round trip ---------- */

check("name and details survive a save and a read", () => {
  const stored = encodeItemText("Submersible pump 5 HP", "Kirloskar Brothers\nModel KDS-5\nCopper winding");
  assert.equal(stored, "Submersible pump 5 HP\nKirloskar Brothers\nModel KDS-5\nCopper winding");
  assert.deepEqual(decodeItemText(stored), { description: "Submersible pump 5 HP", details: "Kirloskar Brothers\nModel KDS-5\nCopper winding" });
});
check("decoding what was encoded is the identity, for awkward names and details", () => {
  const cases: Array<[string, string]> = [["A", "b"], ["Name with \"quotes\" & <tags>", "Line ₹5 / 100%"], ["मोटर पंप", "कंपनी: कीर्लोस्कर"], ["😀", "😀\n😀"]];
  for (const [n, d] of cases) assert.deepEqual(decodeItemText(encodeItemText(n, d)), { description: n, details: d });
});
check("a name can never contain a line break (it would swallow the first line of details)", () => {
  assert.equal(encodeItemText("first\nsecond", "d"), "first second\nd");
  assert.deepEqual(decodeItemText(encodeItemText("first\r\nsecond", "d")), { description: "first second", details: "d" });
});
check("encoding twice changes nothing (saving an already-saved row is stable)", () => {
  const once = encodeItemText("Pump", "  Brand X \n\n Model 9  ");
  const d = decodeItemText(once);
  assert.equal(encodeItemText(d.description, d.details), once);
});

/* ---------- tidying ---------- */

check("details are normalised: one line-break style, trimmed lines, no blank lines", () => {
  assert.equal(cleanDetails("  a \r\n\r\n b\r c  \n"), "a\nb\nc");
});
check("control characters are removed but ordinary punctuation and other languages are kept", () => {
  assert.equal(cleanDetails("a\u0000b\u0007c\u007fd"), "abcd");
  assert.equal(cleanDetails("Ø100 mm × 6 m, IS:1239 – Part 1"), "Ø100 mm × 6 m, IS:1239 – Part 1");
});
check("the limits apply: at most 6 lines and 400 characters, counted in characters not bytes", () => {
  assert.equal(cleanDetails(Array.from({ length: 10 }, (_, i) => `l${i}`).join("\n")).split("\n").length, DETAILS_MAX_LINES);
  assert.equal(Array.from(cleanDetails("क".repeat(900))).length, DETAILS_MAX_CHARS);
  assert.equal(Array.from(cleanDetails("😀".repeat(900))).length, DETAILS_MAX_CHARS);
});
check("non-text input becomes empty details rather than throwing", () => {
  for (const bad of [undefined, null, 5, {}, [], true]) assert.equal(cleanDetails(bad), "");
});
check("the editor can tell what is wrong before it is cleaned away", () => {
  assert.equal(detailsProblem("short"), null);
  assert.equal(detailsProblem(undefined), null);
  assert.match(detailsProblem("a\nb\nc\nd\ne\nf\ng")!, /at most 6 lines/);
  assert.match(detailsProblem("x".repeat(DETAILS_MAX_CHARS + 1))!, /Too long/);
  assert.equal(detailsProblem("x".repeat(DETAILS_MAX_CHARS)), null);
});
check("validation reports over-long details, and never blocks an item that has none", () => {
  assert.equal(validateItem(item()).details, undefined);
  assert.equal(validateItem(item({ details: "fine" })).details, undefined);
  assert.match(validateItem(item({ details: "x".repeat(500) })).details!, /Too long/);
});

/* ---------- typing into the box ---------- */

check("the box stops accepting a seventh line and a 401st character, so nothing is silently cut later", () => {
  assert.equal(limitDetailsInput("a\nb\nc\nd\ne\nf\ng\nh").split("\n").length, DETAILS_MAX_LINES);
  assert.equal(Array.from(limitDetailsInput("x".repeat(900))).length, DETAILS_MAX_CHARS);
  assert.equal(Array.from(limitDetailsInput("😀".repeat(900))).length, DETAILS_MAX_CHARS);
});
check("what is typed is left alone while typing: a trailing line break and spaces are kept until saving", () => {
  assert.equal(limitDetailsInput("Brand X\n"), "Brand X\n");
  assert.equal(limitDetailsInput("Brand X "), "Brand X ");
  assert.equal(limitDetailsInput("a\r\nb"), "a\nb");
  assert.equal(limitDetailsInput(""), "");
});
check("whatever the box accepts always passes the checks, and cleaning it never loses a visible line", () => {
  for (const typed of ["Kirloskar\nModel KDS-5\nCopper", "x".repeat(400), "a\nb\nc\nd\ne\nf", "line\n\n\nline two"]) {
    const kept = limitDetailsInput(typed);
    assert.equal(detailsProblem(kept), null, JSON.stringify(typed));
    assert.equal(cleanDetails(kept).split("\n").length, kept.split("\n").filter((l) => l.trim()).length);
  }
});

/* ---------- page layout: details take room ---------- */

check("a row with no details is measured exactly as before (existing quotations paginate identically)", () => {
  const plain = item();
  assert.equal(estimateRowHeight(plain), estimateRowHeight({ ...plain, details: undefined }));
  assert.equal(estimateRowHeight({ ...plain, details: "  \n " }), estimateRowHeight(plain));
});
check("each line of details makes the row taller, and long lines wrap into more lines", () => {
  const base = estimateRowHeight(item());
  const one = estimateRowHeight(item({ details: "Kirloskar" }));
  const three = estimateRowHeight(item({ details: "Kirloskar\nModel 5\nCopper" }));
  const wrapped = estimateRowHeight(item({ details: "Kirloskar Brothers Limited, Pune, submersible pump set with copper winding and thermal cut-out, 5 HP, 3 phase" }));
  assert.ok(one > base && three > one && wrapped > one, `${base} < ${one} < ${three}, wrapped ${wrapped}`);
});
check("rows with details push later rows onto more pages, and every row is still placed exactly once", () => {
  const rows = Array.from({ length: 12 }, (_, i) => item({ id: `r${i}`, details: "Brand X\nModel 100\nGrade A\nWarranty 1 year\nISI marked" }));
  const plain = paginatePriceItems(rows.map((r) => ({ ...r, details: undefined })), { subRows: 0, service: "Borewell" });
  const withDetails = paginatePriceItems(rows, { subRows: 0, service: "Borewell" });
  assert.ok(withDetails.pages.length > plain.pages.length, `${withDetails.pages.length} pages vs ${plain.pages.length}`);
  assert.equal(withDetails.pages.flat().length, rows.length);
  assert.deepEqual(withDetails.pages.flat().map((r) => r.id), rows.map((r) => r.id));
});

console.log(`\n${passed} checks passed`);
