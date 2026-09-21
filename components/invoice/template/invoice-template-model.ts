/**
 * The wording an invoice template owns. The page design lives in code and is picked by `layout`;
 * everything a person might want to reword lives here, as the owner asked ("all of it").
 *
 * Mirrors the quotation's template model so the two editors behave the same way. Pure: no database,
 * no browser. A stored row that no longer validates falls back to the built-in wording rather than
 * breaking the document.
 */

export const DEFAULT_LAYOUT = "clean";
export const TEMPLATE_LAYOUTS = [DEFAULT_LAYOUT] as const;
export const isKnownLayout = (v: unknown): v is string => typeof v === "string" && (TEMPLATE_LAYOUTS as readonly string[]).includes(v);

export const LIMITS = { name: 80, title: 60, line: 200, para: 600, terms: 8, termLine: 300 } as const;

export type InvoiceTemplateContent = {
  /** "Tax Invoice", "Invoice", "Proforma Invoice". */
  title: string;
  /** The small line under the title: "Original for recipient". */
  copyMarker: string;
  /** Headings above the closing blocks. */
  paymentHeading: string;
  paymentNote: string;
  termsHeading: string;
  terms: string[];
  declarationHeading: string;
  declaration: string;
  /** The signature block: "For Saini Tubewell Boring Service" and the line under the space. */
  signatureFor: string;
  signatureLine: string;
  footerNote: string;
};

export const CLEAN_CONTENT: InvoiceTemplateContent = {
  title: "Tax Invoice",
  copyMarker: "Original for recipient",
  paymentHeading: "Payment Details",
  paymentNote: "",
  termsHeading: "Terms and Conditions",
  terms: [
    "Payment is due within 14 days of the invoice date, by NEFT, RTGS or UPI to the account shown.",
    "Goods once supplied are covered only by the manufacturer's warranty.",
    "Disputes are subject to Sonipat jurisdiction.",
  ],
  declarationHeading: "Declaration",
  declaration: "We certify that the particulars given above are true and correct, and that the amount indicated represents the price actually charged for the goods and services described.",
  signatureFor: "For Saini Tubewell Boring Service",
  signatureLine: "Authorised Signatory",
  footerNote: "",
};

/** A proforma differs only in wording: same design, and it takes no number from the GST series. */
export const PROFORMA_CONTENT: InvoiceTemplateContent = {
  ...CLEAN_CONTENT,
  title: "Proforma Invoice",
  copyMarker: "Not a tax invoice",
  terms: [
    "This is a proforma invoice for your approval and is not a demand for payment against a completed supply.",
    "A tax invoice will follow once the work is completed or the goods are supplied.",
    "Prices hold for 15 days from the date above.",
  ],
  declaration: "We certify that the particulars given above are true and correct.",
};

export type InvoiceTemplateRef = { id: string; name: string; layout: string; isProforma?: boolean; content: InvoiceTemplateContent };

export const BUILT_IN_TEMPLATE_ID = "built-in-clean";
export const BUILT_IN_TEMPLATE: InvoiceTemplateRef = {
  id: BUILT_IN_TEMPLATE_ID, name: "STBS Invoice", layout: DEFAULT_LAYOUT, isProforma: false, content: CLEAN_CONTENT,
};

const str = (v: unknown, max: number): string | null => {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length <= max ? t : null;
};

/** Validates a stored content blob. Returns null when anything is wrong, so the caller can fall back. */
export function validateContent(raw: unknown): InvoiceTemplateContent | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const title = str(r.title, LIMITS.title);
  if (!title) return null;
  const terms = Array.isArray(r.terms) ? r.terms : null;
  if (!terms || terms.length > LIMITS.terms) return null;
  const cleanTerms: string[] = [];
  for (const t of terms) {
    const line = str(t, LIMITS.termLine);
    if (line === null) return null;
    if (line) cleanTerms.push(line);
  }
  const fields: Array<[keyof InvoiceTemplateContent, number]> = [
    ["copyMarker", LIMITS.line], ["paymentHeading", LIMITS.line], ["paymentNote", LIMITS.para],
    ["termsHeading", LIMITS.line], ["declarationHeading", LIMITS.line], ["declaration", LIMITS.para],
    ["signatureFor", LIMITS.line], ["signatureLine", LIMITS.line], ["footerNote", LIMITS.line],
  ];
  const out: InvoiceTemplateContent = { ...CLEAN_CONTENT, title, terms: cleanTerms };
  for (const [key, max] of fields) {
    const v = str(r[key], max);
    if (v === null) return null;
    (out as Record<string, unknown>)[key] = v;
  }
  return out;
}

export const contentOrNull = (raw: unknown): InvoiceTemplateContent | null => validateContent(raw);

/** The wording to draw with: the invoice's frozen snapshot, then its template, then the built-in. */
export function resolveTemplate(snapshot: unknown, template?: InvoiceTemplateRef | null): InvoiceTemplateRef {
  const frozen = contentOrNull(snapshot);
  if (frozen) return { ...(template ?? BUILT_IN_TEMPLATE), content: frozen };
  if (template && contentOrNull(template.content)) return template;
  return BUILT_IN_TEMPLATE;
}

/** "Name copy", "Name copy 2", … never colliding, whatever the case of the existing names. */
export function copyName(base: string, existing: string[]): string {
  const taken = new Set(existing.map((n) => n.trim().toLowerCase()));
  const root = base.trim().replace(/\s+copy(\s+\d+)?$/i, "").trim() || "Invoice";
  let candidate = `${root} copy`;
  for (let i = 2; taken.has(candidate.toLowerCase()); i++) candidate = `${root} copy ${i}`;
  return candidate.slice(0, LIMITS.name);
}
