import assert from "node:assert/strict";
import { COALESCE_MS, createHistory, duplicateItem, formatCell, isPopulatedItem, moveItem, parseNumeric, pushHistory, redoHistory, replaceHistoryPresent, sanitizeNumericText, undoHistory, MAX_QUANTITY, MAX_RATE } from "../components/quotation/editor-logic";

let passed = 0;
function check(label: string, fn: () => void) { fn(); passed++; console.log(`  ok  ${label}`); }

check("numeric cells drop letters and extra dots, keep at most 2 decimals", () => {
  assert.equal(sanitizeNumericText("12ab.3.456"), "12.34");
  assert.equal(sanitizeNumericText("abc"), "");
});
check("parse: commas ignored, empty is 0, capped to the database limit", () => {
  assert.equal(parseNumeric("1,20,000", MAX_RATE), 120000);
  assert.equal(parseNumeric("", MAX_RATE), 0);
  assert.equal(parseNumeric(".", MAX_RATE), 0);
  assert.equal(parseNumeric("99999999999", MAX_QUANTITY), MAX_QUANTITY);
  assert.equal(parseNumeric("12.5", MAX_QUANTITY), 12.5);
});
check("Indian grouping on blur", () => {
  assert.equal(formatCell(120000), "1,20,000");
  assert.equal(formatCell(12345678), "1,23,45,678");
  assert.equal(formatCell(1234.5), "1,234.5");
  assert.equal(formatCell(0), "0");
});
check("moveItem reorders and ignores out-of-range moves without mutating", () => {
  const a = [1, 2, 3, 4];
  assert.deepEqual(moveItem(a, 0, 2), [2, 3, 1, 4]);
  assert.deepEqual(a, [1, 2, 3, 4]);
  assert.equal(moveItem(a, 0, 9), a);
  assert.equal(moveItem(a, 1, 1), a);
});
check("duplicateItem inserts a copy with a new id right after the source", () => {
  const items = [{ id: "a", description: "x", unit: "m", quantity: 1, rate: 2 }, { id: "b", description: "y", unit: "m", quantity: 1, rate: 2 }];
  const out = duplicateItem(items, "a", "c");
  assert.deepEqual(out.map((i) => i.id), ["a", "c", "b"]);
  assert.equal(out[1].description, "x");
  assert.equal(duplicateItem(items, "zzz", "c"), items);
});
check("blank row is not 'populated' (no confirmation needed to delete it)", () => {
  assert.equal(isPopulatedItem({ id: "a", description: "", unit: "", quantity: 1, rate: 0 }), false);
  assert.equal(isPopulatedItem({ id: "a", description: "Pipe", unit: "", quantity: 1, rate: 0 }), true);
});
check("undo / redo walk the history and a new edit clears the redo stack", () => {
  let h = createHistory("a");
  h = pushHistory(h, "b", undefined, 0);
  h = pushHistory(h, "c", undefined, 10);
  h = undoHistory(h); assert.equal(h.present, "b");
  h = undoHistory(h); assert.equal(h.present, "a");
  h = undoHistory(h); assert.equal(h.present, "a");
  h = redoHistory(h); assert.equal(h.present, "b");
  h = pushHistory(h, "d", undefined, 20);
  assert.equal(h.future.length, 0);
  assert.equal(redoHistory(h), h);
});
check("typing bursts on one field collapse into a single undo step; a different field does not", () => {
  let h = createHistory("");
  h = pushHistory(h, "a", "desc", 0);
  h = pushHistory(h, "ab", "desc", 100);
  h = pushHistory(h, "abc", "desc", 200);
  assert.equal(h.past.length, 1);
  h = pushHistory(h, "abcd", "unit", 300);
  assert.equal(h.past.length, 2);
  h = pushHistory(h, "abcde", "unit", 300 + COALESCE_MS + 1);
  assert.equal(h.past.length, 3);
  assert.equal(undoHistory(h).present, "abcd");
});
check("history is capped and identical values add no step", () => {
  let h = createHistory(0);
  for (let i = 1; i <= 150; i++) h = pushHistory(h, i, undefined, i);
  assert.equal(h.past.length, 100);
  assert.equal(pushHistory(h, 150, undefined, 999), h);
});
check("replacing the present (server-assigned id) does not add an undo step", () => {
  let h = pushHistory(createHistory("a"), "b", undefined, 0);
  const before = h.past.length;
  h = replaceHistoryPresent(h, "b+id");
  assert.equal(h.past.length, before);
  assert.equal(undoHistory(h).present, "a");
});

console.log(`\n${passed} checks passed`);
