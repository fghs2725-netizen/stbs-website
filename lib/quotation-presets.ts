/**
 * Quotation presets: the two jobs the owner quotes over and over, and the questions that fill them
 * in.
 *
 * Every part of a line that changes between quotations is a hole in the wording — the owner's own
 * borewell item reads "___ HP, ___ stage". So a preset item stores its description with named
 * placeholders and the preset stores the questions beside it. Adding a question later means writing
 * a placeholder into an item on the setup page, not changing this file.
 */

export type PresetField = {
  key: string;
  label: string;
  options: string[];
  allowCustom: boolean;
};

export type PresetItem = {
  id?: string;
  description: string;
  unit: string;
  lastRate?: number | null;
  /** Last rate per size, keyed by `rateKey` (e.g. "boreDia=300 mm"). See `rateFor`. */
  lastRates?: Record<string, number> | null;
};

export type Preset = {
  key: string;
  name: string;
  subject?: string;
  fields: PresetField[];
  items: PresetItem[];
};

const PLACEHOLDER = /\{([a-zA-Z][a-zA-Z0-9]*)\}/g;

/** Which questions a preset actually needs: the placeholders its items use, in the fields' order. */
export function fieldsInUse(preset: Preset): PresetField[] {
  const used = new Set<string>();
  for (const item of preset.items) {
    for (const [, key] of item.description.matchAll(PLACEHOLDER)) used.add(key);
  }
  return preset.fields.filter((f) => used.has(f.key));
}

/**
 * Fills a description in from the answers.
 *
 * A placeholder with no answer collapses to nothing rather than printing its own braces: a quotation
 * that reached a client reading "Drilling of {boreDia} dia" would be far worse than one reading
 * "Drilling of dia", which is visibly unfinished. A placeholder no field defines is left exactly as
 * written, because it is more likely to be the owner's own brace than a question anyone forgot.
 */
export function fillDescription(description: string, answers: Record<string, string>, known?: Set<string>): string {
  const filled = description.replace(PLACEHOLDER, (whole, key: string) => {
    if (known && !known.has(key)) return whole;
    return (answers[key] ?? "").trim();
  });
  // Substituting nothing leaves doubled spaces and a space before punctuation; tidy both.
  return filled.replace(/[ \t]{2,}/g, " ").replace(/\s+([,;.])/g, "$1").trim();
}

/* ────────────────────────── remembered rates ────────────────────────── */

/*
 * A line's price depends on the size it was quoted for: drilling a 300 mm bore costs more per foot
 * than a 160 mm one, a 10 HP pump more than a 2 HP one. So a rate is remembered per size as well as
 * per line. The "size" of a line is the answers to the placeholders its own wording uses, nothing
 * else: the drilling line keys on {boreDia} alone, so a change of pump does not hide its rate.
 */

const norm = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();

/** "300 mm", "300mm" and "300" are one size: the first number decides; text without a number is kept whole. */
const sizeOf = (v: string) => { const t = norm(v); return t.match(/\d+(?:\.\d+)?/)?.[0] ?? t; };

function placeholdersOf(template: string): string[] {
  return [...template.matchAll(PLACEHOLDER)].map((m) => m[1]);
}

function keyFrom(pairs: Array<[string, string]>): string | null {
  const seen = new Set<string>();
  const parts: string[] = [];
  for (const [k, v] of pairs) {
    if (seen.has(k)) continue;
    seen.add(k);
    parts.push(`${k}=${sizeOf(v)}`);
  }
  return parts.length ? parts.join("|") : null;
}

/** The size key a line gets from the wizard's answers; null for a line with no placeholders. */
export function rateKey(template: string, answers: Record<string, string>): string | null {
  return keyFrom(placeholdersOf(template).map((k) => [k, answers[k] ?? ""]));
}

/**
 * Reads the size key back out of a quotation line's wording, by matching it against the preset's
 * template. Returns null when the owner has reworded the line beyond recognition: that rate is
 * then remembered for the line only, never filed under a wrong size.
 */
export function rateKeyFromText(template: string, text: string): string | null {
  const keys = placeholdersOf(template);
  if (!keys.length) return null;
  const tidy = (s: string) => s.replace(/\s+/g, " ").trim();
  const t = tidy(template);
  let pattern = "";
  let last = 0;
  for (const m of t.matchAll(PLACEHOLDER)) {
    pattern += t.slice(last, m.index).replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(.*?)";
    last = (m.index ?? 0) + m[0].length;
  }
  const tail = t.slice(last).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // A template that ends in a placeholder must match to the end; one that ends in fixed words may
  // have a brand or note typed after them.
  const re = new RegExp("^" + pattern + tail + (tail ? "" : "$"), "i");
  const hit = re.exec(tidy(text));
  if (!hit) return null;
  return keyFrom(keys.map((k, i) => [k, hit[i + 1] ?? ""]));
}

/** The rate a new line starts at: the last rate for this size, else the last rate for the line. */
export function rateFor(item: PresetItem, key: string | null): number {
  const bySize = key && item.lastRates ? item.lastRates[key] : undefined;
  if (typeof bySize === "number" && Number.isFinite(bySize)) return bySize;
  return item.lastRate ?? 0;
}

/** What a finalised line adds to its preset item's memory. Returns null when there is nothing to record. */
export function rememberedRates(template: string, lineText: string, rate: number, existing: unknown): { lastRate: number; lastRates: Record<string, number> } | null {
  if (!(rate > 0)) return null;
  const lastRates: Record<string, number> = existing && typeof existing === "object" && !Array.isArray(existing) ? { ...(existing as Record<string, number>) } : {};
  const key = rateKeyFromText(template, lineText);
  if (key) lastRates[key] = rate;
  return { lastRate: rate, lastRates };
}

/** The line items a preset produces once its questions are answered. */
export function buildPresetItems(preset: Preset, answers: Record<string, string>) {
  const known = new Set(preset.fields.map((f) => f.key));
  return preset.items.map((item, n) => ({
    id: `preset-${n + 1}-${Math.random().toString(36).slice(2, 8)}`,
    description: fillDescription(item.description, answers, known),
    unit: item.unit,
    quantity: 0,
    rate: rateFor(item, rateKey(item.description, answers)),
    presetItemId: item.id,
  }));
}

/* ────────────────────────── what ships ────────────────────────── */

const DIA = ["150 mm", "200 mm", "250 mm", "300 mm"];
const PIPE = ["140 mm", "180 mm", "200 mm", "225 mm"];

/**
 * The seeded presets, in the owner's own wording.
 *
 * Only the parts that genuinely change between jobs are placeholders. The well-head 9" casing, the
 * 3" × 2.5" adapter and the 3" × 4" reducer are written out: they have not varied, and a question
 * per fitting would make the wizard longer than typing the quotation. Any of them can become a
 * question later by writing a placeholder into the item and adding a field.
 */
export const SEED_PRESETS: Preset[] = [
  {
    key: "rwh",
    name: "Rainwater harvesting",
    subject: "Quotation for rainwater harvesting recharge bore",
    fields: [
      { key: "boreDia", label: "Recharge bore diameter", options: DIA, allowCustom: true },
      { key: "pipeDia", label: "Pipe diameter", options: PIPE, allowCustom: true },
      { key: "chamberSize", label: "Chamber size", options: ["2 m", "3 m"], allowCustom: true },
    ],
    items: [
      { description: "Drilling of {boreDia} dia recharge bore, including machine and labour charges", unit: "Rft" },
      { description: "Supply and lowering of {pipeDia} dia uPVC pipe, 10 kg/cm² pressure rating, ISI marked", unit: "Rft" },
      { description: "Supply and installation of {pipeDia} dia slotted filter pipe, complete with solvent cement, reducer socket, socket, end cap, jali (mesh), ript and PVC sutli", unit: "Rft" },
      { description: "Supply and filling of double-washed gravel, 4–6 mm, as filter media around the recharge pipe", unit: "CFt" },
      { description: "Development and cleaning of recharge bore cavity with heavy-duty pump", unit: "LS" },
      { description: "Transportation of drilling rig, equipment and materials to and from site", unit: "LS" },
      { description: "Transportation of gravel and labour for gravel packing", unit: "LS" },
      { description: "Construction of RCC rain water harvesting chamber with RCC cover slab, including overflow pipe connection to outside drain / water body; size {chamberSize} as per site requirement", unit: "No." },
    ],
  },
  {
    key: "borewell",
    name: "Borewell construction",
    subject: "Quotation for borewell construction",
    fields: [
      { key: "boreDia", label: "Borewell diameter", options: DIA, allowCustom: true },
      { key: "casingDia", label: "Casing pipe diameter", options: PIPE, allowCustom: true },
      { key: "deliveryDia", label: "Delivery pipe", options: ['2" (50 mm)', '2.5" (63 mm)', '3" (75 mm)'], allowCustom: true },
      { key: "cableSize", label: "Cable size", options: ["4 sq. mm", "6 sq. mm", "10 sq. mm"], allowCustom: true },
      { key: "pumpHp", label: "Pump HP", options: ["1", "1.5", "2", "3", "5", "7.5", "10"], allowCustom: true },
      { key: "pumpStage", label: "Pump stage", options: ["10", "15", "20", "25"], allowCustom: true },
    ],
    items: [
      { description: "Drilling of {boreDia} dia borewell with rotary rig, including machine and labour charges", unit: "Rft" },
      { description: "Supply and lowering of {casingDia} dia uPVC casing pipe, 10 kg/cm² pressure rating, ISI marked", unit: "Rft" },
      { description: "Supply and installation of {casingDia} dia slotted filter pipe, complete with solvent cement, reducer socket, socket, end cap, jali (mesh), ript and PVC sutli", unit: "Rft" },
      { description: "Supply and installation of {deliveryDia} HDPE delivery pipe / rising main", unit: "Rft" },
      { description: 'Supply and fixing of 3" well-head cover plate assembly (to cap 9" casing), complete with nut bolts, rubber gasket, clamp band, flange, fack and 3" × 2.5" adapter', unit: "No." },
      { description: "SS nipple with flange welding, including nut bolts and rubber packing", unit: "No." },
      { description: "Supply and laying of {cableSize} 3-core copper submersible cable", unit: "Rft" },
      { description: "Supply and installation of fully automatic starter panel with voltmeter, ammeter and auto operator", unit: "No." },
      { description: "Supply, installation and commissioning of {pumpHp} HP, {pumpStage} stage stainless steel submersible pump set", unit: "Set" },
      { description: 'Pump lock with SS nipple and SS reducer (3" × 4"), including welding', unit: "No." },
      { description: "Supply and fixing of pump safety wire rope", unit: "Rft" },
      { description: "Supply and packing of double-washed gravel, 4–6 mm, around casing", unit: "CFt" },
      { description: "Development of bore cavity with heavy-duty pump until clear, sand-free discharge is obtained", unit: "LS" },
      { description: "Transportation of drilling rig, equipment and materials to and from site", unit: "LS" },
      { description: "Transportation of gravel and labour for gravel packing", unit: "LS" },
    ],
  },
];
