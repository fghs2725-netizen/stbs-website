import assert from "node:assert/strict";
import {
  BUILT_IN_TEMPLATE,
  CLASSIC_CONTENT,
  LIMITS,
  contentOrNull,
  copyName,
  isKnownLayout,
  resolveTemplate,
  validateContent,
  visibleTerms,
  type TemplateContent,
} from "../components/quotation/template/template-model";

let passed = 0;
function check(label: string, fn: () => void) { fn(); passed++; console.log(`  ok  ${label}`); }

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
const edited = (fn: (c: TemplateContent) => void): TemplateContent => { const c = clone(CLASSIC_CONTENT); fn(c); return c; };
const row = (id: string, name: string, content: unknown = CLASSIC_CONTENT, layout = "classic") => ({ id, name, layout, content });

/* ---------- The built-in wording is the wording every quotation was written with ---------- */

check("the built-in wording is itself a valid template", () => {
  const v = validateContent(CLASSIC_CONTENT);
  assert.equal(v.ok, true, v.ok ? "" : v.errors.join("; "));
});
check("the built-in wording carries the six original terms, in order, with the tax line flagged", () => {
  assert.deepEqual(CLASSIC_CONTENT.terms.map((t) => t.title), ["Taxes", "Payment Terms", "Electricity & Water", "Storage", "JCB Work", "Validity"]);
  assert.equal(CLASSIC_CONTENT.terms[0].hideWhenGst, true);
  assert.equal(CLASSIC_CONTENT.terms.filter((t) => t.hideWhenGst).length, 1);
});
check("the four “at a glance” figures and three annexures match what was printed", () => {
  assert.deepEqual(CLASSIC_CONTENT.glance.map((g) => g.value), ["34+", "500+", "100%", "24/7"]);
  assert.equal(CLASSIC_CONTENT.letter.annexures.length, 3);
});

/* ---------- Which wording a quotation prints ---------- */

const draftChosen = row("t2", "Short form", edited((c) => { c.letter.signatoryName = "Someone Else"; }));
const theDefault = row("t1", "STBS Classic");

check("a draft prints the template it is pinned to", () => {
  const r = resolveTemplate({ status: "DRAFT", chosen: draftChosen, fallback: theDefault });
  assert.equal(r.id, "t2");
  assert.equal(r.content.letter.signatoryName, "Someone Else");
});
check("a draft with no template follows the current default", () => {
  assert.equal(resolveTemplate({ status: "DRAFT", chosen: null, fallback: theDefault }).id, "t1");
});
check("with nothing in the database at all, a draft still prints the built-in wording", () => {
  const r = resolveTemplate({ status: "DRAFT", chosen: null, fallback: null });
  assert.equal(r.id, BUILT_IN_TEMPLATE.id);
  assert.deepEqual(r.content, CLASSIC_CONTENT);
});
check("a pinned template that is corrupt falls through to the default instead of breaking the render", () => {
  const broken = row("t9", "Broken", { letter: "not an object" });
  assert.equal(resolveTemplate({ status: "DRAFT", chosen: broken, fallback: theDefault }).id, "t1");
});
check("a FINAL quotation prints its frozen snapshot, not the template's current wording", () => {
  const snapshot = row("t2", "Short form", edited((c) => { c.letter.signatoryName = "Frozen Name"; }));
  const changedLater = row("t2", "Short form", edited((c) => { c.letter.signatoryName = "Edited Afterwards"; }));
  const r = resolveTemplate({ status: "FINAL", snapshot, chosen: changedLater, fallback: theDefault });
  assert.equal(r.content.letter.signatoryName, "Frozen Name");
});
check("a FINAL quotation is unaffected by a change of default template", () => {
  const snapshot = row("t1", "STBS Classic");
  const newDefault = row("t3", "New default", edited((c) => { c.letter.opening = "Completely different wording."; }));
  const r = resolveTemplate({ status: "FINAL", snapshot, chosen: null, fallback: newDefault });
  assert.equal(r.content.letter.opening, CLASSIC_CONTENT.letter.opening);
});
check("a FINAL quotation from before templates existed prints the original built-in wording, never the current default", () => {
  const newDefault = row("t3", "New default", edited((c) => { c.letter.opening = "Completely different wording."; }));
  const r = resolveTemplate({ status: "FINAL", snapshot: null, chosen: null, fallback: newDefault });
  assert.deepEqual(r.content, CLASSIC_CONTENT);
  assert.equal(r.id, BUILT_IN_TEMPLATE.id);
});
check("an unknown layout name is rendered with the classic layout rather than failing", () => {
  const r = resolveTemplate({ status: "DRAFT", chosen: row("t5", "Future", CLASSIC_CONTENT, "not-built-yet"), fallback: theDefault });
  assert.equal(r.layout, "classic");
  assert.equal(isKnownLayout("classic"), true);
  assert.equal(isKnownLayout("not-built-yet"), false);
});

/* ---------- The tax line ---------- */

check("the flagged tax term is hidden only when GST is shown in the totals", () => {
  assert.equal(visibleTerms(CLASSIC_CONTENT, false).length, 6);
  const withGst = visibleTerms(CLASSIC_CONTENT, true);
  assert.equal(withGst.length, 5);
  assert.ok(!withGst.some((t) => t.title === "Taxes"));
});
check("a term is hidden by its flag, not by its name (so renaming it cannot break the rule)", () => {
  const c = edited((x) => { x.terms[0].title = "GST"; });
  assert.equal(visibleTerms(c, true).some((t) => t.title === "GST"), false);
  const other = edited((x) => { x.terms[1].title = "Taxes"; });
  assert.equal(visibleTerms(other, true).some((t) => t.title === "Taxes"), true);
});

/* ---------- Validation ---------- */

check("validation trims text, drops blank list entries and normalises line endings", () => {
  const v = validateContent(edited((c) => {
    c.letter.opening = "  Hello\r\nthere  ";
    c.profile.clients = ["  Acme  ", "", "   ", "Beta"];
    c.terms.push({ title: "", text: "" });
  }));
  assert.ok(v.ok);
  if (v.ok) {
    assert.equal(v.content.letter.opening, "Hello\nthere");
    assert.deepEqual(v.content.profile.clients, ["Acme", "Beta"]);
    assert.equal(v.content.terms.length, 6);
  }
});
check("required wording cannot be left empty", () => {
  for (const [label, mutate] of [
    ["opening paragraph", (c: TemplateContent) => { c.letter.opening = "  "; }],
    ["closing paragraph", (c: TemplateContent) => { c.letter.closing = ""; }],
    ["signatory name", (c: TemplateContent) => { c.letter.signatoryName = ""; }],
    ["company name", (c: TemplateContent) => { c.preparedBy.company = ""; }],
    ["about us", (c: TemplateContent) => { c.profile.about = ""; }],
  ] as const) {
    const v = validateContent(edited(mutate));
    assert.equal(v.ok, false, `${label} should be required`);
  }
});
check("a template needs at least one term, and every term needs a title and its wording", () => {
  assert.equal(validateContent(edited((c) => { c.terms = []; })).ok, false);
  assert.equal(validateContent(edited((c) => { c.terms[1].text = ""; })).ok, false);
  assert.equal(validateContent(edited((c) => { c.terms[1].title = ""; })).ok, false);
});
check("“at a glance” must have exactly four complete figures", () => {
  assert.equal(validateContent(edited((c) => { c.glance.pop(); })).ok, false);
  assert.equal(validateContent(edited((c) => { c.glance.push({ value: "1", label: "Extra" }); })).ok, false);
  assert.equal(validateContent(edited((c) => { c.glance[0].label = ""; })).ok, false);
});
check("over-long and over-many entries are rejected with a message that says which and by how much", () => {
  const long = validateContent(edited((c) => { c.letter.opening = "x".repeat(LIMITS.paragraph + 1); }));
  assert.ok(!long.ok && long.errors.some((e) => e.includes("Opening paragraph") && e.includes(`/${LIMITS.paragraph}`)));
  assert.equal(validateContent(edited((c) => { c.terms = Array.from({ length: LIMITS.terms + 1 }, (_, i) => ({ title: `T${i}`, text: "x" })); })).ok, false);
  assert.equal(validateContent(edited((c) => { c.profile.clients = Array.from({ length: LIMITS.clients + 1 }, (_, i) => `C${i}`); })).ok, false);
});
check("garbage in is an error, not a crash", () => {
  for (const bad of [null, undefined, 5, "text", [], {}, { letter: 1, terms: "no", glance: {} }]) {
    assert.equal(validateContent(bad).ok, false);
  }
  assert.equal(contentOrNull({ nope: true }), null);
  assert.deepEqual(contentOrNull(CLASSIC_CONTENT), CLASSIC_CONTENT);
});
check("validation never lets a non-string through into printed wording", () => {
  const v = validateContent(edited((c) => { (c.letter as unknown as Record<string, unknown>).opening = { evil: "<script>" }; }));
  assert.equal(v.ok, false);
});

/* ---------- Naming ---------- */

check("duplicates are named “… copy”, “… copy 2”, … and never collide, whatever the case", () => {
  assert.equal(copyName("STBS Classic", ["STBS Classic"]), "STBS Classic copy");
  assert.equal(copyName("STBS Classic", ["STBS Classic", "STBS Classic copy"]), "STBS Classic copy 2");
  assert.equal(copyName("STBS Classic copy", ["STBS Classic", "STBS Classic copy"]), "STBS Classic copy 2");
  assert.equal(copyName("STBS Classic", ["stbs classic COPY"]), "STBS Classic copy 2");
  assert.ok(copyName("y".repeat(LIMITS.name), []).length <= LIMITS.name);
});

console.log(`\n${passed} checks passed`);
