import { quotation as fixed } from "../quotation-data";

/**
 * Quotation templates.
 *
 * A template is the *wording* of a quotation: the cover letter, the company profile, the terms and the
 * small facts printed around them. The page *design* is code, chosen by `layout`, so adding a design is a
 * new layout component and adding wording is just another template row.
 *
 * Everything here is pure (no database, no React) so the server, the browser and the tests all resolve
 * and validate templates identically.
 */

export type TemplateTerm = {
  title: string;
  text: string;
  /** The "Taxes" line is dropped when the totals already state the GST explicitly. */
  hideWhenGst?: boolean;
};

export type TemplateContent = {
  /** Wording for the "validity" line on new quotations made from this template. */
  validity: string;
  preparedBy: { company: string; contact: string; phones: string; email: string };
  letter: {
    greeting: string;
    opening: string;
    annexuresIntro: string;
    annexures: string[];
    closing: string;
    signOff: string;
    signatoryCompany: string;
    signatoryName: string;
    signatoryTitle: string;
  };
  profile: { about: string; mission: string; vision: string; capabilities: string[]; clients: string[] };
  terms: TemplateTerm[];
  /** The four figures in the "At a glance" panel. */
  glance: Array<{ value: string; label: string }>;
};

/** What a quotation carries so it can be rendered without another lookup. */
export type QuotationTemplateRef = { id: string; name: string; layout: string; content: TemplateContent };

/** Page designs available today. A new design is added here and in the layout registry. */
export const TEMPLATE_LAYOUTS = [
  { key: "classic", label: "Classic", description: "Cover letter, company profile, terms and price offer on branded A4 pages." },
] as const;
export const DEFAULT_LAYOUT = "classic";
export const isKnownLayout = (key: string) => TEMPLATE_LAYOUTS.some((l) => l.key === key);

/** The wording every quotation was written with before templates existed. */
export const CLASSIC_CONTENT: TemplateContent = {
  validity: fixed.validity,
  preparedBy: {
    company: "SAINI TUBEWELL BORING SERVICE",
    contact: "Rajesh Saini · Managing Director",
    phones: "9812003001 / 7988024114",
    email: "stbs2025@gmail.com",
  },
  letter: {
    greeting: "Dear Sir,",
    opening: "We are pleased to have the opportunity to serve you and thank you for inviting us to submit our quotation for the above-mentioned work.",
    annexuresIntro: "The following annexures are attached for your reference.",
    annexures: ["Annexure-I · Company Profile", "Annexure-II · Terms and Conditions", "Annexure-III · Price Offer for Subject Job"],
    closing: "We trust that the above proposal meets your requirements. We thank you for the opportunity and assure you of our best services at all times.",
    signOff: "Yours Truly,",
    signatoryCompany: "(For SAINI TUBEWELL BORING SERVICE)",
    signatoryName: "Rajesh Saini",
    signatoryTitle: "Managing Director",
  },
  profile: {
    about: fixed.about,
    mission: fixed.mission,
    vision: fixed.vision,
    capabilities: [...fixed.capabilities],
    clients: [...fixed.clients],
  },
  terms: fixed.terms.map(([title, text]) => ({ title, text, ...(title === "Taxes" ? { hideWhenGst: true } : {}) })),
  glance: [
    { value: "34+", label: "Years Experience" },
    { value: "500+", label: "Projects Delivered" },
    { value: "100%", label: "ISI Certified" },
    { value: "24/7", label: "Site Support" },
  ],
};

/** Id used for the wording that is compiled into the app, for quotations that predate templates. */
export const BUILT_IN_TEMPLATE_ID = "built-in-classic";
export const BUILT_IN_TEMPLATE: QuotationTemplateRef = { id: BUILT_IN_TEMPLATE_ID, name: "STBS Classic", layout: DEFAULT_LAYOUT, content: CLASSIC_CONTENT };

/* ---------- Limits ----------
   These keep a template sane and the database tidy. They are not the real page-fit check: the editor
   measures the actual pages in the browser and refuses to save one that overflows its A4 sheet. */
export const LIMITS = {
  name: 80,
  short: 120,
  line: 200,
  paragraph: 700,
  profileParagraph: 900,
  annexures: 5,
  capabilities: 8,
  capability: 100,
  clients: 40,
  client: 90,
  terms: 10,
  termTitle: 60,
  termText: 420,
  glanceValue: 8,
  glanceLabel: 30,
} as const;

const str = (v: unknown) => (typeof v === "string" ? v.replace(/\r\n/g, "\n").trim() : "");
const list = (v: unknown) => (Array.isArray(v) ? v.map(str).filter(Boolean) : []);

export type Validated = { ok: true; content: TemplateContent } | { ok: false; errors: string[] };

/**
 * Turns untrusted input (a form, a JSON column) into a well-formed `TemplateContent`, or says what is
 * wrong with it. Strings are trimmed and empty list entries dropped, so what is stored is what prints.
 */
export function validateContent(input: unknown): Validated {
  const errors: string[] = [];
  const o = (input && typeof input === "object" ? input : {}) as Record<string, any>;
  const pb = (o.preparedBy ?? {}) as Record<string, unknown>;
  const lt = (o.letter ?? {}) as Record<string, unknown>;
  const pf = (o.profile ?? {}) as Record<string, unknown>;

  const need = (label: string, value: string, max: number) => {
    if (!value) errors.push(`${label} is required.`);
    else if (value.length > max) errors.push(`${label} is too long (${value.length}/${max} characters).`);
    return value;
  };
  const cap = (label: string, value: string, max: number) => {
    if (value.length > max) errors.push(`${label} is too long (${value.length}/${max} characters).`);
    return value;
  };
  const many = (label: string, items: string[], maxItems: number, maxLen: number) => {
    if (items.length > maxItems) errors.push(`${label}: at most ${maxItems} entries.`);
    items.forEach((it, i) => { if (it.length > maxLen) errors.push(`${label} ${i + 1} is too long (${it.length}/${maxLen} characters).`); });
    return items;
  };

  const terms: TemplateTerm[] = (Array.isArray(o.terms) ? o.terms : [])
    .map((t: any) => ({ title: str(t?.title), text: str(t?.text), hideWhenGst: t?.hideWhenGst === true }))
    .filter((t: TemplateTerm) => t.title || t.text)
    .map((t: TemplateTerm) => (t.hideWhenGst ? t : { title: t.title, text: t.text }));
  if (terms.length === 0) errors.push("Add at least one term.");
  if (terms.length > LIMITS.terms) errors.push(`Terms: at most ${LIMITS.terms}.`);
  terms.forEach((t, i) => {
    if (!t.title) errors.push(`Term ${i + 1} needs a title.`);
    else if (t.title.length > LIMITS.termTitle) errors.push(`Term ${i + 1} title is too long (${t.title.length}/${LIMITS.termTitle}).`);
    if (!t.text) errors.push(`Term ${i + 1} needs its wording.`);
    else if (t.text.length > LIMITS.termText) errors.push(`Term ${i + 1} is too long (${t.text.length}/${LIMITS.termText} characters).`);
  });

  const glanceIn = Array.isArray(o.glance) ? o.glance : [];
  const glance = glanceIn.map((g: any) => ({ value: str(g?.value), label: str(g?.label) })).filter((g: { value: string; label: string }) => g.value || g.label);
  if (glance.length !== 4) errors.push("“At a glance” needs exactly four figures.");
  glance.forEach((g: { value: string; label: string }, i: number) => {
    if (!g.value || !g.label) errors.push(`Figure ${i + 1} needs both a value and a label.`);
    cap(`Figure ${i + 1} value`, g.value, LIMITS.glanceValue);
    cap(`Figure ${i + 1} label`, g.label, LIMITS.glanceLabel);
  });

  const content: TemplateContent = {
    validity: need("Validity wording", str(o.validity), LIMITS.line),
    preparedBy: {
      company: need("Company name", str(pb.company), LIMITS.short),
      contact: cap("Contact line", str(pb.contact), LIMITS.short),
      phones: cap("Phone numbers", str(pb.phones), LIMITS.short),
      email: cap("Email", str(pb.email), LIMITS.short),
    },
    letter: {
      greeting: need("Greeting", str(lt.greeting), LIMITS.short),
      opening: need("Opening paragraph", str(lt.opening), LIMITS.paragraph),
      annexuresIntro: cap("Annexure line", str(lt.annexuresIntro), LIMITS.line),
      annexures: many("Annexure", list(lt.annexures), LIMITS.annexures, LIMITS.line),
      closing: need("Closing paragraph", str(lt.closing), LIMITS.paragraph),
      signOff: need("Sign-off", str(lt.signOff), LIMITS.short),
      signatoryCompany: cap("Signing company", str(lt.signatoryCompany), LIMITS.short),
      signatoryName: need("Signatory name", str(lt.signatoryName), LIMITS.short),
      signatoryTitle: cap("Signatory title", str(lt.signatoryTitle), LIMITS.short),
    },
    profile: {
      about: need("About us", str(pf.about), LIMITS.profileParagraph),
      mission: need("Mission", str(pf.mission), LIMITS.profileParagraph),
      vision: need("Vision", str(pf.vision), LIMITS.profileParagraph),
      capabilities: many("Capability", list(pf.capabilities), LIMITS.capabilities, LIMITS.capability),
      clients: many("Client", list(pf.clients), LIMITS.clients, LIMITS.client),
    },
    terms,
    glance,
  };

  return errors.length ? { ok: false, errors } : { ok: true, content };
}

/** The terms that print: the "Taxes" style line is hidden when the totals state GST explicitly. */
export function visibleTerms(content: TemplateContent, gstEnabled: boolean): TemplateTerm[] {
  return content.terms.filter((t) => !(gstEnabled && t.hideWhenGst));
}

/** Validates a stored snapshot/row; anything malformed is treated as absent rather than trusted. */
export function contentOrNull(input: unknown): TemplateContent | null {
  const v = validateContent(input);
  return v.ok ? v.content : null;
}

export type TemplateSources = {
  status?: "DRAFT" | "FINAL";
  /** Frozen copy stored when the quotation was finalised. */
  snapshot?: { id?: string; name?: string; layout?: string; content?: unknown } | null;
  /** The template the quotation points at (may be archived: archived templates still render). */
  chosen?: { id: string; name: string; layout: string; content: unknown } | null;
  /** The current default template. */
  fallback?: { id: string; name: string; layout: string; content: unknown } | null;
};

const ref = (t: { id?: string; name?: string; layout?: string; content?: unknown } | null | undefined): QuotationTemplateRef | null => {
  if (!t) return null;
  const content = contentOrNull(t.content);
  if (!content) return null;
  return { id: t.id ?? BUILT_IN_TEMPLATE_ID, name: t.name ?? BUILT_IN_TEMPLATE.name, layout: t.layout && isKnownLayout(t.layout) ? t.layout : DEFAULT_LAYOUT, content };
};

/**
 * Which wording a quotation renders with.
 *  - FINAL: exactly what it was sent with. Its snapshot, or, for quotations finalised before templates
 *    existed, the built-in wording those were written with. Never the live default, so editing a template
 *    can never change a document that has already gone out.
 *  - DRAFT: the template it is pinned to, else the current default, else the built-in wording.
 */
export function resolveTemplate({ status, snapshot, chosen, fallback }: TemplateSources): QuotationTemplateRef {
  if (status === "FINAL") return ref(snapshot) ?? BUILT_IN_TEMPLATE;
  return ref(chosen) ?? ref(fallback) ?? BUILT_IN_TEMPLATE;
}

/** "Name copy", "Name copy 2", ... so a duplicate never collides with an existing name. */
export function copyName(name: string, existing: string[]): string {
  const base = name.replace(/ copy( \d+)?$/i, "").slice(0, LIMITS.name - 8);
  const taken = new Set(existing.map((n) => n.toLowerCase()));
  let candidate = `${base} copy`;
  for (let n = 2; taken.has(candidate.toLowerCase()); n++) candidate = `${base} copy ${n}`;
  return candidate;
}
