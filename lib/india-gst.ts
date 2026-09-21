/**
 * Indian GST state codes, and the one rule that decides CGST+SGST vs IGST.
 *
 * A tax invoice must name the place of supply, and the tax split follows from it: a supply inside the
 * seller's own state is CGST+SGST, a supply to any other state is IGST. Getting that wrong is the mistake
 * most often made when invoices are typed by hand, so the software decides it and lets the user override.
 *
 * Pure (no database, no browser): the editor, the preview and the PDF all read the same answer.
 */

/** GST state codes: the first two digits of every GSTIN. */
export const STATE_CODES: Record<string, string> = {
  "Jammu and Kashmir": "01", "Himachal Pradesh": "02", "Punjab": "03", "Chandigarh": "04",
  "Uttarakhand": "05", "Haryana": "06", "Delhi": "07", "Rajasthan": "08", "Uttar Pradesh": "09",
  "Bihar": "10", "Sikkim": "11", "Arunachal Pradesh": "12", "Nagaland": "13", "Manipur": "14",
  "Mizoram": "15", "Tripura": "16", "Meghalaya": "17", "Assam": "18", "West Bengal": "19",
  "Jharkhand": "20", "Odisha": "21", "Chhattisgarh": "22", "Madhya Pradesh": "23", "Gujarat": "24",
  "Dadra and Nagar Haveli and Daman and Diu": "26", "Maharashtra": "27", "Karnataka": "29",
  "Goa": "30", "Lakshadweep": "31", "Kerala": "32", "Tamil Nadu": "33", "Puducherry": "34",
  "Andaman and Nicobar Islands": "35", "Telangana": "36", "Andhra Pradesh": "37", "Ladakh": "38",
};

/** Spellings people actually type, mapped to the official name above. */
const ALIASES: Record<string, string> = {
  "j&k": "Jammu and Kashmir", "jammu & kashmir": "Jammu and Kashmir",
  "new delhi": "Delhi", "nct of delhi": "Delhi", "delhi ncr": "Delhi",
  "orissa": "Odisha", "pondicherry": "Puducherry", "uttaranchal": "Uttarakhand",
  "tamilnadu": "Tamil Nadu", "andhra": "Andhra Pradesh", "up": "Uttar Pradesh",
  "mp": "Madhya Pradesh", "hp": "Himachal Pradesh", "wb": "West Bengal",
  "daman and diu": "Dadra and Nagar Haveli and Daman and Diu",
  "dadra and nagar haveli": "Dadra and Nagar Haveli and Daman and Diu",
};

const CODE_TO_NAME: Record<string, string> = Object.fromEntries(
  Object.entries(STATE_CODES).map(([name, code]) => [code, name]),
);

const norm = (s: unknown) => (typeof s === "string" ? s.trim().toLowerCase().replace(/\s+/g, " ") : "");

/** The official state name for whatever the user typed, or null when it is not a state we know. */
export function canonicalState(input: unknown): string | null {
  const n = norm(input);
  if (!n) return null;
  if (ALIASES[n]) return ALIASES[n];
  for (const name of Object.keys(STATE_CODES)) if (norm(name) === n) return name;
  return null;
}

/** The two-digit code for a state name, or null. */
export function stateCode(input: unknown): string | null {
  const name = canonicalState(input);
  return name ? STATE_CODES[name] : null;
}

/**
 * The state a GSTIN belongs to, read from its first two digits. A GSTIN is the more reliable source
 * than a typed address, so callers prefer it when the client has supplied one.
 */
export function stateFromGstin(gstin: unknown): { code: string; name: string } | null {
  const g = typeof gstin === "string" ? gstin.trim().toUpperCase() : "";
  if (!/^[0-9]{2}[A-Z0-9]{13}$/.test(g)) return null;
  const code = g.slice(0, 2);
  const name = CODE_TO_NAME[code];
  return name ? { code, name } : null;
}

/** "Haryana (06)" for the invoice, or "" when the state is unknown — never a guess. */
export function placeOfSupply(state: unknown, gstin?: unknown): string {
  const fromGstin = stateFromGstin(gstin);
  if (fromGstin) return `${fromGstin.name} (${fromGstin.code})`;
  const name = canonicalState(state);
  return name ? `${name} (${STATE_CODES[name]})` : "";
}

export type GstMode = "CGST_SGST" | "IGST";

/**
 * CGST+SGST when the buyer is in the seller's state, IGST otherwise.
 *
 * When the buyer's state cannot be determined at all we return null rather than assume: the editor then
 * leaves the choice to the user instead of quietly picking a split that could be wrong on a tax document.
 */
export function inferGstMode(sellerState: unknown, buyerState: unknown, buyerGstin?: unknown): GstMode | null {
  const seller = stateCode(sellerState);
  const buyer = stateFromGstin(buyerGstin)?.code ?? stateCode(buyerState);
  if (!seller || !buyer) return null;
  return seller === buyer ? "CGST_SGST" : "IGST";
}
