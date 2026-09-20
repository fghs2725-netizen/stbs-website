import assert from "node:assert/strict";
import { fromIsoDate, readiness, toIsoDate } from "../components/quotation/studio/studio-logic";
import { buildDraft } from "../components/quotation/quotation-model";

let passed = 0;
function check(label: string, fn: () => void) { fn(); passed++; console.log(`  ok  ${label}`); }

check("date: DD/MM/YYYY <-> ISO round trip", () => {
  assert.equal(toIsoDate("20/09/2026"), "2026-09-20");
  assert.equal(toIsoDate("5/3/2026"), "2026-03-05");
  assert.equal(fromIsoDate("2026-09-20"), "20/09/2026");
});
check("date: impossible or malformed dates are rejected", () => {
  assert.equal(toIsoDate("31/02/2026"), "");
  assert.equal(toIsoDate("2026-09-20"), "");
  assert.equal(toIsoDate(""), "");
  assert.equal(fromIsoDate("2026-13-01"), "");
  assert.equal(fromIsoDate("nope"), "");
});

const item = (over = {}) => ({ id: "a", description: "Pipe", unit: "Rft", quantity: 2, rate: 100, ...over });

check("readiness: an empty draft is blocked on the client and the items", () => {
  const r = readiness(buildDraft());
  assert.equal(r.ready, false);
  assert.deepEqual(r.missing, ["Client name", "At least one complete price item"]);
});
check("readiness: a complete draft is ready", () => {
  const r = readiness(buildDraft({ client: { ...buildDraft().client, companyName: "Acme" }, items: [item()] }));
  assert.equal(r.ready, true);
  assert.deepEqual(r.missing, []);
});
check("readiness: custom service needs a name, and incomplete rows are counted but not blocking on their own", () => {
  const base = buildDraft({ serviceType: "Custom", client: { ...buildDraft().client, companyName: "Acme" }, items: [item(), item({ id: "b", description: "" })] });
  const r = readiness(base);
  assert.deepEqual(r.missing, ["Custom service name"]);
  assert.equal(r.incompleteRows, 1);
});

console.log(`\n${passed} checks passed`);
