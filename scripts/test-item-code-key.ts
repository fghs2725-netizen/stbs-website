import assert from "node:assert/strict";
import { findItemCode, itemCodeKey } from "../lib/item-code-key";

let failed = 0;
function check(name: string, fn: () => void) {
  try { fn(); console.log(`  ok  ${name}`); } catch (e) { failed++; console.log(`  FAIL ${name}\n       ${(e as Error).message}`); }
}

const saved = [
  { description: "Drilling of 250 mm dia borewell with rotary rig, including machine and labour charges", hsn: "995434", unit: "Rft" },
  { description: "Supply and laying of 4 sq. mm 3-core copper submersible cable", hsn: "854449", unit: null },
  { description: "Supply and lowering of 180 mm dia uPVC casing pipe, 10 kg/cm² pressure rating, ISI marked", hsn: "391723", unit: "Rft" },
];

check("one item at any size shares a key", () => {
  assert.equal(itemCodeKey("Drilling of 300 mm dia borewell"), itemCodeKey("drilling of  160 MM dia borewell"));
  assert.equal(itemCodeKey("Drilling of 7.5 mm dia"), itemCodeKey("Drilling of 300 mm dia"));
});
check("different words are different items: a pipe is not a cable", () => {
  assert.notEqual(itemCodeKey("Supply of 4 mm pipe"), itemCodeKey("Supply of 4 mm cable"));
});
check("a code saved at 250 mm fills in the 300 mm line", () => {
  const hit = findItemCode("Drilling of 300 mm dia borewell with rotary rig, including machine and labour charges", saved);
  assert.equal(hit?.hsn, "995434");
});
check("a code saved at 180 mm fills in 225 mm, whatever the pressure rating figures", () => {
  assert.equal(findItemCode("Supply and lowering of 225 mm dia uPVC casing pipe, 10 kg/cm² pressure rating, ISI marked", saved)?.hsn, "391723");
});
check("an exact name wins over a same-item match at another size", () => {
  const both = [...saved, { description: "Drilling of 300 mm dia borewell with rotary rig, including machine and labour charges", hsn: "995432", unit: null }];
  assert.equal(findItemCode("Drilling of 300 mm dia borewell with rotary rig, including machine and labour charges", both)?.hsn, "995432");
  assert.equal(findItemCode("Drilling of 200 mm dia borewell with rotary rig, including machine and labour charges", both)?.hsn, undefined, "two sizes saved with different codes is ambiguous: leave it blank");
});
check("sizes saved with the same code are not ambiguous", () => {
  const same = [...saved, { description: "Drilling of 300 mm dia borewell with rotary rig, including machine and labour charges", hsn: "995434", unit: null }];
  assert.equal(findItemCode("Drilling of 200 mm dia borewell with rotary rig, including machine and labour charges", same)?.hsn, "995434");
});
check("an unknown item and an empty line get nothing", () => {
  assert.equal(findItemCode("Transportation of rig", saved), undefined);
  assert.equal(findItemCode("  ", saved), undefined);
});

console.log(failed ? `\n${failed} failed` : "\nall passed");
process.exit(failed ? 1 : 0);
