import assert from "node:assert/strict";
import { invoiceKey, workLabel, yearSpan } from "../lib/website/area-work";

let passed = 0;
function check(label: string, fn: () => void) {
  fn();
  passed++;
  console.log(`  ok  ${label}`);
}

check("invoice names match regardless of case and spacing", () => {
  assert.equal(invoiceKey("  Jain  Electroplast pvt ltd "), "JAIN ELECTROPLAST PVT LTD");
});
check("work label: borewell and recharge together wins over pumps and pipes", () => {
  assert.equal(workLabel(["300 mm borewell drilling", "PVC pipe", "Recharge chamber", "Submersible pump"]), "Borewell and rainwater harvesting");
});
check("work label: each single kind of work", () => {
  assert.equal(workLabel(["Rainwater harvesting pit"]), "Rainwater harvesting");
  assert.equal(workLabel(["Boring 150 ft", "Submersible pump 5 HP"]), "Borewell and pump installation");
  assert.equal(workLabel(["Bore capti cleaning"]), "Borewell");
  assert.equal(workLabel(["Motor rewinding", "Cable 4 sq mm"]), "Pump installation and material supply");
  assert.equal(workLabel(["Pump repair"]), "Pump installation and repair");
  assert.equal(workLabel(["PVC pipe 4.5 in"]), "Material supply");
  assert.equal(workLabel(["Transport"]), "");
});
check("year span from invoice dates", () => {
  assert.equal(yearSpan(["2024-05-01", "2024-11-30"]), "2024");
  assert.equal(yearSpan(["2025-01-02", "2021-04-28", "2023-07-07"]), "2021–2025");
  assert.equal(yearSpan([]), "");
});

console.log(`\n${passed} checks passed`);
