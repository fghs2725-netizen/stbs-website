import { getValidItems, type QuotationState } from "../quotation-model";

/* ---------- Dates: the quotation stores DD/MM/YYYY, the browser date input wants YYYY-MM-DD ---------- */

const realDate = (y: number, m: number, d: number) => {
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
};

export function toIsoDate(dmy: string): string {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec((dmy ?? "").trim());
  if (!m) return "";
  const [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
  return realDate(y, mo, d) ? `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}` : "";
}

export function fromIsoDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((iso ?? "").trim());
  return m && realDate(Number(m[1]), Number(m[2]), Number(m[3])) ? `${m[3]}/${m[2]}/${m[1]}` : "";
}

/* ---------- Readiness: what still blocks finalising or a PDF ---------- */

export type Check = { key: "client" | "service" | "subject" | "items"; label: string; done: boolean; target: string };

export function readiness(q: QuotationState) {
  const validCount = getValidItems(q.items).length;
  const customMissing = q.serviceType === "Custom" && !q.customServiceType.trim();
  const checks: Check[] = [
    { key: "client", label: "Client name", done: Boolean(q.client.companyName.trim()), target: "client-company" },
    { key: "service", label: customMissing ? "Custom service name" : "Service type", done: !customMissing && Boolean(q.serviceType.trim()), target: customMissing ? "service-custom" : "service" },
    { key: "subject", label: "Subject line", done: Boolean((q.subject || "").trim()), target: "subject" },
    { key: "items", label: "At least one complete price item", done: validCount > 0, target: "items" },
  ];
  return {
    checks,
    ready: checks.every((c) => c.done),
    missing: checks.filter((c) => !c.done).map((c) => c.label),
    /** Rows that exist but are not complete: they are left off the printed quotation. */
    incompleteRows: q.items.length - validCount,
  };
}

/* ---------- Convenience lists (suggestions only; rates are always entered by the user) ---------- */

export const UNIT_OPTIONS = ["Rft", "Mtr", "Set", "No.", "LS", "Bag", "CFt", "Kg", "Day", "Month"];

export const ITEM_PRESETS: { description: string; unit: string }[] = [
  { description: "Borewell drilling", unit: "Rft" },
  { description: "Supply of casing pipe", unit: "Rft" },
  { description: "Supply and installation of submersible pump with cable and accessories", unit: "Set" },
  { description: "Rainwater harvesting recharge pit construction", unit: "No." },
  { description: "Supply of filter media (sand and gravel)", unit: "CFt" },
  { description: "Borewell flushing and cleaning", unit: "LS" },
  { description: "Transportation and mobilisation of drilling rig to site", unit: "LS" },
  { description: "PVC pipe for collection and drainage network", unit: "Rft" },
  { description: "Cement grouting for borewell sealing", unit: "Bag" },
  { description: "Yield test and water quality report", unit: "No." },
];

export const VALIDITY_PRESETS = ["7 days from date of submission", "15 days from date of submission", "30 days from date of submission"];
