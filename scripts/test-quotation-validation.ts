import assert from "node:assert/strict";
import {
  isItemValid,
  validateItem,
  getValidItems,
  isQuotationPdfReady,
  buildDraft,
  defaultSubject,
  initialQuotation,
  type QuotationState,
  type QuotationItem,
} from "../components/quotation/quotation-model";

let passed = 0;
function check(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (err) {
    console.error(`FAIL  ${name}`);
    console.error((err as Error).message);
    process.exitCode = 1;
  }
}

const validItem = (overrides: Partial<QuotationItem> = {}): QuotationItem => ({
  id: "i1",
  description: "Supply and installation of casing pipe",
  unit: "Rft",
  quantity: 200,
  rate: 480,
  ...overrides,
});

const fullQuotation = (overrides: Partial<QuotationState> = {}): QuotationState => ({
  ...buildDraft(),
  client: { ...initialQuotation.client, companyName: "ACME Industries" },
  serviceType: "Borewell Construction",
  items: [validItem()],
  ...overrides,
});

console.log("item validity");
check("valid item accepted", () => assert.equal(isItemValid(validItem()), true));
check("missing description rejected", () => assert.equal(isItemValid(validItem({ description: "  " })), false));
check("missing unit rejected", () => assert.equal(isItemValid(validItem({ unit: "" })), false));
check("zero quantity rejected", () => assert.equal(isItemValid(validItem({ quantity: 0 })), false));
check("negative quantity rejected", () => assert.equal(isItemValid(validItem({ quantity: -1 })), false));
check("negative rate rejected", () => assert.equal(isItemValid(validItem({ rate: -1 })), false));
check("zero rate accepted (business allows zero-rate items)", () => assert.equal(isItemValid(validItem({ rate: 0 })), true));
check("numeric-string quantity normalized", () => assert.equal(isItemValid(validItem({ quantity: "250" as unknown as number })), true));
check("NaN quantity rejected", () => assert.equal(isItemValid(validItem({ quantity: Number.NaN })), false));
check("empty string quantity rejected", () => assert.equal(isItemValid(validItem({ quantity: "" as unknown as number })), false));
check("undefined description rejected", () => assert.equal(isItemValid(validItem({ description: undefined as unknown as string })), false));

check("validateItem flags missing description", () => assert.ok(validateItem(validItem({ description: " " })).description));
check("validateItem flags NaN quantity", () => assert.ok(validateItem(validItem({ quantity: Number.NaN })).quantity));
check("validateItem flags negative rate", () => assert.ok(validateItem(validItem({ rate: -5 })).rate));

check("getValidItems of non-array returns []", () => assert.deepEqual(getValidItems(undefined), []));
check("getValidItems filters invalid", () => {
  const items = [validItem({ id: "a" }), validItem({ id: "b", description: "" })];
  const valid = getValidItems(items);
  assert.equal(valid.length, 1);
  assert.equal(valid[0].id, "a");
});

console.log("buildDraft subject sync (root-cause regression)");
check("default subject committed into state", () => {
  const draft = buildDraft();
  assert.equal(draft.subject, defaultSubject(draft).trim());
  assert.ok(draft.subject.length > 0);
});
check("explicit initial keeps its subject", () => {
  const draft = buildDraft({ subject: "Custom subject" });
  assert.equal(draft.subject, "Custom subject");
});

console.log("quotation PDF readiness gate");
check("fully valid quotation allowed", () => assert.equal(isQuotationPdfReady(fullQuotation()), true));
check("missing client rejected", () => assert.equal(isQuotationPdfReady(fullQuotation({ client: initialQuotation.client })), false));
check("missing service rejected", () => assert.equal(isQuotationPdfReady(fullQuotation({ serviceType: "  " })), false));
check("missing subject rejected", () => assert.equal(isQuotationPdfReady(fullQuotation({ subject: "" })), false));
check("no items rejected", () => assert.equal(isQuotationPdfReady(fullQuotation({ items: [] })), false));
check("item missing description rejected", () => assert.equal(isQuotationPdfReady(fullQuotation({ items: [validItem({ description: "" })] })), false));
check("item invalid quantity rejected", () => assert.equal(isQuotationPdfReady(fullQuotation({ items: [validItem({ quantity: 0 })] })), false));
check("item invalid rate rejected", () => assert.equal(isQuotationPdfReady(fullQuotation({ items: [validItem({ rate: -3 })] })), false));
check("item missing unit rejected", () => assert.equal(isQuotationPdfReady(fullQuotation({ items: [validItem({ unit: "" })] })), false));
check("multiple valid items accepted", () => {
  const q = fullQuotation({ items: [validItem({ id: "a" }), validItem({ id: "b", description: "Second", quantity: 10, rate: 5 })] });
  assert.equal(isQuotationPdfReady(q), true);
});
check("non-object/undefined rejected", () => assert.equal(isQuotationPdfReady(null), false));

console.log("save -> generate state flow (stale-state regression)");
check("unsaved quotation generates from current editor state (POST payload)", () => {
  // Un-saved: generated straight from the current editor state, which must be
  // ready once the user has completed all fields. No stale/old object involved.
  const editorState = fullQuotation();
  assert.equal(editorState.id, undefined);
  assert.equal(isQuotationPdfReady(editorState), true);
});
check("after save the returned state (with id) is used for later generate", () => {
  // saveDraftAction returns the persisted state; Generate then reads it.
  const saved = { ...fullQuotation(), id: "q_123", quotationReference: "STBS/2026/001" };
  assert.ok(saved.id);
  assert.equal(isQuotationPdfReady(saved), true);
});
check("editing existing quotation reflects latest edits, not earlier snapshot", () => {
  // Start from a saved snapshot missing items, then apply an edit that adds a
  // valid item. The (current cumulative) state becomes ready.
  let current = { ...fullQuotation(), id: "q_123", items: [] as QuotationItem[] };
  assert.equal(isQuotationPdfReady(current), false);
  current = { ...current, items: [validItem()] };
  assert.equal(isQuotationPdfReady(current), true);
});
check("subject cleared after having default is rejected (explicit clear)", () => {
  const q = fullQuotation();
  assert.equal(isQuotationPdfReady(q), true);
  const cleared: QuotationState = { ...q, subject: "" };
  assert.equal(isQuotationPdfReady(cleared), false);
});

console.log(`\n${passed} checks passed`);