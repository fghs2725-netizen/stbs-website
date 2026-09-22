/**
 * The units a line item can be priced in, shared by quotations and invoices so the same job is not
 * billed in "Rft" on one document and "Running feet" on the other.
 *
 * One spelling per unit, deliberately: a list offering both "Mtr" and "Meter" only moves the
 * inconsistency into the dropdown. Anything missing is added by the owner as a custom unit, which is
 * remembered and offered alongside these from then on.
 */
export const BUILT_IN_UNITS = [
  "Rft",
  "Mtr",
  "Sq.ft",
  "Sq.m",
  "CFt",
  "Cu.m",
  "No.",
  "Pair",
  "Set",
  "LS",
  "Job",
  "Bag",
  "Kg",
  "Quintal",
  "Ton",
  "Litre",
  "Hour",
  "Day",
  "Month",
  "Trip",
  "Roll",
  "Box",
] as const;

/**
 * The built-ins followed by the owner's own, with anything already built in dropped from the custom
 * side. Case-insensitive, because "rft" typed once should not sit in the list beside "Rft".
 */
export function mergeUnits(custom: string[]): string[] {
  const seen = new Set(BUILT_IN_UNITS.map((u) => u.toLowerCase()));
  const extra: string[] = [];
  for (const name of custom) {
    const key = name.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    extra.push(name.trim());
  }
  return [...BUILT_IN_UNITS, ...extra];
}
