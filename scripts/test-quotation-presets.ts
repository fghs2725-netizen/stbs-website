/**
 * Quotation preset logic: the questions a preset needs, and how its wording is filled in.
 *
 * The case that matters most is the one that would reach a client: a placeholder that never got an
 * answer must not print its own braces on a quotation.
 */
import assert from "node:assert/strict";
import {
  SEED_PRESETS, buildPresetItems, fieldsInUse, fillDescription, type Preset,
} from "../lib/quotation-presets";

let failures = 0;
function check(name: string, fn: () => void) {
  try { fn(); console.log(`  ok  ${name}`); } catch (e) {
    failures++;
    console.log(`  FAIL ${name}`);
    console.log(`       ${e instanceof Error ? e.message : String(e)}`);
  }
}

const rwh = SEED_PRESETS.find((p) => p.key === "rwh")!;
const borewell = SEED_PRESETS.find((p) => p.key === "borewell")!;
const known = (p: Preset) => new Set(p.fields.map((f) => f.key));

check("a preset asks only what its wording actually uses", () => {
  assert.deepEqual(fieldsInUse(rwh).map((f) => f.key), ["boreDia", "pipeDia", "chamberSize"]);
  assert.deepEqual(
    fieldsInUse(borewell).map((f) => f.key),
    ["boreDia", "casingDia", "deliveryDia", "cableSize", "pumpHp", "pumpStage"],
  );
});

check("every placeholder in the shipped wording has a question behind it", () => {
  for (const preset of SEED_PRESETS) {
    const keys = known(preset);
    for (const item of preset.items) {
      for (const [, key] of item.description.matchAll(/\{([a-zA-Z][a-zA-Z0-9]*)\}/g)) {
        assert.ok(keys.has(key), `${preset.key}: nothing answers {${key}}`);
      }
    }
  }
});

check("answers are written into the wording", () => {
  assert.equal(
    fillDescription("Drilling of {boreDia} dia recharge bore", { boreDia: "250 mm" }, known(rwh)),
    "Drilling of 250 mm dia recharge bore",
  );
  assert.equal(
    fillDescription("commissioning of {pumpHp} HP, {pumpStage} stage pump", { pumpHp: "5", pumpStage: "20" }, known(borewell)),
    "commissioning of 5 HP, 20 stage pump",
  );
});

check("a custom answer is used exactly as typed", () => {
  assert.equal(
    fillDescription("Drilling of {boreDia} dia bore", { boreDia: "355 mm" }, known(rwh)),
    "Drilling of 355 mm dia bore",
  );
});

check("an unanswered placeholder never prints its own braces", () => {
  const out = fillDescription("Drilling of {boreDia} dia recharge bore", {}, known(rwh));
  assert.ok(!out.includes("{"), `braces reached the line: ${out}`);
  assert.ok(!out.includes("}"), `braces reached the line: ${out}`);
  assert.equal(out, "Drilling of dia recharge bore", "and the gap closes rather than doubling the spaces");
});

check("a brace no question answers is left alone", () => {
  // More likely the owner's own wording than a question anyone forgot to add.
  assert.equal(
    fillDescription("Pump lock {ownNote} fitting", { boreDia: "250 mm" }, known(rwh)),
    "Pump lock {ownNote} fitting",
  );
});

check("a space before punctuation does not survive an empty answer", () => {
  assert.equal(fillDescription("size {chamberSize}, as per site", {}, known(rwh)), "size, as per site");
});

check("building items carries the unit, the last rate and the link back", () => {
  const preset: Preset = {
    key: "t", name: "T",
    fields: [{ key: "dia", label: "Dia", options: ["1"], allowCustom: true }],
    items: [{ id: "pi-1", description: "Bore {dia}", unit: "Rft", lastRate: 145 }],
  };
  const [row] = buildPresetItems(preset, { dia: "200 mm" });
  assert.equal(row.description, "Bore 200 mm");
  assert.equal(row.unit, "Rft");
  assert.equal(row.rate, 145, "the rate it was last quoted at comes back");
  assert.equal(row.quantity, 0, "but never the quantity, which is always this job's");
  assert.equal(row.presetItemId, "pi-1");
});

check("a preset item never quoted yet starts at zero rather than undefined", () => {
  const preset: Preset = { key: "t", name: "T", fields: [], items: [{ description: "Flat line", unit: "LS" }] };
  assert.equal(buildPresetItems(preset, {})[0].rate, 0);
});

check("the owner's wording is carried exactly", () => {
  assert.ok(rwh.items[2].description.includes("jali (mesh), ript and PVC sutli"));
  assert.ok(borewell.items[4].description.includes('3" × 2.5" adapter'));
  assert.equal(rwh.items.length, 8);
  assert.equal(borewell.items.length, 15);
});

console.log(failures ? `\n${failures} check(s) failed` : `\n${10} checks passed`);
process.exit(failures ? 1 : 0);
