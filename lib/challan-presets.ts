/**
 * One-tap material lists for a delivery challan. Short on purpose: no questions, no rates. Tap one
 * and its lines are added with empty quantities, ready to count.
 *
 * The wording is the owner's own, shortened from the quotation presets (lib/quotation-presets.ts),
 * keeping only goods that physically leave on a vehicle — drilling, labour and transport lines are
 * services and do not go on a challan. Sizes are typed onto the line, as they vary per job.
 */
export type ChallanPreset = { key: string; name: string; items: Array<{ description: string; unit: string }> };

const CASING = { description: "uPVC casing pipe, 10 kg/cm², ISI marked", unit: "Rft" };
const FILTER = { description: "Slotted filter pipe with fittings (socket, end cap, jali)", unit: "Rft" };
const GRAVEL = { description: "Double-washed gravel, 4–6 mm", unit: "CFt" };
const DELIVERY = { description: "HDPE delivery pipe", unit: "Rft" };
const CABLE = { description: "3-core copper submersible cable", unit: "Rft" };
const STARTER = { description: "Automatic starter panel", unit: "No." };
const PUMP = { description: "Submersible pump set", unit: "Set" };
const ROPE = { description: "Pump safety wire rope", unit: "Rft" };

export const CHALLAN_PRESETS: ChallanPreset[] = [
  {
    key: "borewell",
    name: "Borewell material",
    items: [
      CASING, FILTER, DELIVERY,
      { description: "Well-head cover plate assembly", unit: "No." },
      { description: "SS nipple with flange", unit: "No." },
      CABLE, STARTER, PUMP,
      { description: "Pump lock with SS nipple and reducer", unit: "No." },
      ROPE, GRAVEL,
    ],
  },
  { key: "rwh", name: "Rainwater harvesting", items: [{ ...CASING, description: "uPVC pipe, 10 kg/cm², ISI marked" }, FILTER, GRAVEL] },
  { key: "pump", name: "Pump set", items: [PUMP, CABLE, STARTER, DELIVERY, ROPE] },
  { key: "gravel", name: "Gravel only", items: [GRAVEL] },
];
