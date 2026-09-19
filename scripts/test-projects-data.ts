import assert from "node:assert/strict";
import { PROJECTS, parseProjects, resolveProjects, scopeLines } from "../lib/website/projects-data";

let passed = 0;
function check(label: string, fn: () => void) {
  fn();
  passed++;
  console.log(`  ok  ${label}`);
}

// ── leak guard: the source documents contained all of these; none may reach the site ──
const everything = JSON.stringify(PROJECTS);
const FORBIDDEN: Array<[string, RegExp]> = [
  ["GSTIN pattern", /\b\d{2}[A-Z]{5}\d{4}[A-Z]\d[A-Z0-9][A-Z0-9]\b/],
  ["PAN pattern", /\b[A-Z]{5}\d{4}[A-Z]\b/],
  ["email address", /[\w.+-]+@[\w-]+\.[\w.]+/],
  ["phone number (7+ digits in a row)", /\d{7,}/],
  ["rupee amount / currency", /₹|\bRs\.?\s?\d|\bINR\b|\blakh/i],
  ["bank details", /\b(IFSC|account number|RTGS|NEFT)\b/i],
  ["order / voucher numbers", /\b\d{2}-WO\/|\b22POBS|NF273\b/i],
];
for (const [name, rx] of FORBIDDEN) check(`no ${name} in project data`, () => assert.doesNotMatch(everything, rx));

check("three real projects with the required fields", () => {
  assert.equal(PROJECTS.length, 3);
  for (const p of PROJECTS) {
    assert.ok(p.title && p.location && p.sector && p.summary, `${p.title} incomplete`);
    assert.ok(p.summary.length <= 140, `summary too long for a card: ${p.summary.length}`);
  }
});
check("no invented outcomes: output is absent until the owner supplies a verified figure", () => {
  for (const p of PROJECTS) assert.equal(p.output, undefined);
});
check("only Ashoka states a depth (the others state drilling lengths, not depth)", () => {
  assert.deepEqual(PROJECTS.filter((p) => p.depth).map((p) => p.title.includes("Ashoka")), [true]);
});

check("parseProjects drops rows missing title or location", () => {
  const rows = parseProjects([{ title: "A", location: "B" }, { title: "only title" }, { location: "only location" }, null, "x", 3]);
  assert.equal(rows.length, 1);
});
check("parseProjects trims text and omits empty optionals", () => {
  const [p] = parseProjects([{ title: "  T ", location: " L ", sector: " S ", summary: " M ", depth: "  ", year: "2022" }]);
  assert.deepEqual(p, { title: "T", location: "L", sector: "S", summary: "M", year: "2022" });
});
check("parseProjects tolerates non-array input", () => {
  assert.deepEqual(parseProjects(undefined), []);
  assert.deepEqual(parseProjects("nope"), []);
  assert.deepEqual(parseProjects({}), []);
});
check("resolveProjects falls back to the defaults when the CMS has no valid rows", () => {
  assert.equal(resolveProjects(undefined).length, 3);
  assert.equal(resolveProjects([{ title: "x" }]).length, 3);
});
check("resolveProjects prefers valid CMS rows over the defaults", () => {
  const r = resolveProjects([{ title: "CMS one", location: "Sonipat" }]);
  assert.deepEqual(r.map((p) => p.title), ["CMS one"]);
});
check("scopeLines splits on newlines, trims, and drops blanks", () => {
  assert.deepEqual(scopeLines("a\r\n  b  \n\n c"), ["a", "b", "c"]);
  assert.deepEqual(scopeLines(undefined), []);
});

console.log(`\n${passed} checks passed`);
