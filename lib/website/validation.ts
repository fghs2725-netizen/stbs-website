import { z } from "zod";
import { IMAGE_ALT_FIELDS, SECTION_TYPE_DEFS, type SectionField } from "./section-types";

/**
 * Website CMS validation. Pure (no database, no server-only imports) so the same rules run in the
 * server actions AND in the editor for live feedback. Every function returns owner-friendly messages
 * that name the field; an empty array means valid.
 *
 * Two kinds of limit: a RECOMMENDED maximum (`SectionField.max`, shown as a counter) and a HARD limit
 * at 1.5x that, which is the only one enforced, so content that already exists never starts failing.
 */

export const HARD_LIMIT_FACTOR = 1.5;
export const hardLimit = (max: number) => Math.ceil(max * HARD_LIMIT_FACTOR);

const stripNote = (label: string) => label.replace(/\s*\(.*\)\s*$/, "").trim();
const lower = (s: string) => (s ? s[0].toLowerCase() + s.slice(1) : s);

/** Relative path, anchor, tel:, mailto:, or http(s). Empty is allowed (the field is optional). */
export function isValidLinkUrl(value: string): boolean {
  const v = value.trim();
  if (!v) return true;
  if (/\s/.test(v)) return false;
  if (v.startsWith("/")) return !v.startsWith("//");
  if (v.startsWith("#")) return true;
  if (/^tel:\+?[0-9()\-]{5,20}$/.test(v)) return true;
  if (/^mailto:[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return true;
  try {
    const u = new URL(v);
    return (u.protocol === "https:" || u.protocol === "http:") && Boolean(u.hostname);
  } catch {
    return false;
  }
}

export const isWebUrl = (value: string) => {
  const v = value.trim();
  if (!v) return true;
  try {
    const u = new URL(v);
    return (u.protocol === "https:" || u.protocol === "http:") && Boolean(u.hostname) && !/\s/.test(v);
  } catch {
    return false;
  }
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^\+?[0-9()\s-]{7,20}$/;
export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** True when an alt text is just a file name, e.g. "IMG_2041.jpg" or the image's own file name. */
export function looksLikeFilename(alt: string, imageUrl?: string | null): boolean {
  const a = alt.trim().toLowerCase();
  if (!a) return false;
  if (/\.(jpe?g|png|webp|gif|avif|heic|svg)$/.test(a)) return true;
  if (/^(img|dsc|dscn|image|photo|pic|screenshot|whatsapp image)[-_ ]?\d/.test(a)) return true;
  if (imageUrl) {
    const base = decodeURIComponent(imageUrl.split(/[?#]/)[0].split("/").pop() ?? "").toLowerCase();
    const stem = base.replace(/\.[a-z0-9]+$/, "");
    if (base && (a === base || (stem.length > 3 && a === stem))) return true;
  }
  return false;
}

// ─── Field rules (zod builds each check; messages name the field) ────────────

type Kind = "text" | "long" | "link" | "web" | "email" | "phone" | "pin" | "slug" | "image";
interface Spec {
  key: string;
  label: string;
  kind: Kind;
  /** Recommended max characters (hard limit = 1.5x unless `hard` is given). */
  max?: number;
  hard?: number;
  required?: boolean;
}

function schemaFor(spec: Spec): z.ZodType<string> {
  const name = spec.label;
  let s = z.string({ error: `${name} must be text.` });
  const hard = spec.hard ?? (spec.max ? hardLimit(spec.max) : undefined);
  if (hard) {
    s = s.refine((v) => v.length <= hard, { error: (issue) => `${name} is ${String(issue.input).length} characters; keep it under ${spec.max ?? hard}.` });
  }
  switch (spec.kind) {
    case "link":
    case "image":
      s = s.refine(isValidLinkUrl, { error: `${name} is not a valid link. Use https://…, a page path such as /quote, tel: or mailto:.` });
      break;
    case "web":
      s = s.refine(isWebUrl, { error: `${name} must be a full web address starting with https://.` });
      break;
    case "email":
      s = s.refine((v) => !v.trim() || EMAIL_RE.test(v.trim()), { error: `${name} is not a valid email address.` });
      break;
    case "phone":
      s = s.refine((v) => !v.trim() || PHONE_RE.test(v.trim()), { error: `${name} is not a valid phone number.` });
      break;
    case "pin":
      s = s.refine((v) => !v.trim() || /^\d{6}$/.test(v.trim()), { error: `${name} must be a 6-digit PIN code.` });
      break;
    case "slug":
      s = s.refine((v) => !v.trim() || SLUG_RE.test(v.trim()), { error: `${name} can only use lowercase letters, numbers and single hyphens (for example borewell-drilling).` });
      break;
  }
  return s;
}

/** Check the fields present in `data`. `full` also reports required fields that are absent. */
function checkFields(specs: Spec[], data: Record<string, unknown>, opts: { full?: boolean; prefix?: string } = {}): string[] {
  const out: string[] = [];
  const pre = opts.prefix ? `${opts.prefix}: ` : "";
  for (const spec of specs) {
    let v = data[spec.key];
    if (typeof v === "number" && Number.isFinite(v)) v = String(v); // e.g. a stat value stored as 34
    if (v === undefined || v === null) {
      if (spec.required && opts.full) out.push(`${pre}${spec.label} is required.`);
      continue;
    }
    if (typeof v !== "string") { out.push(`${pre}${spec.label} must be text.`); continue; }
    if (spec.required && !v.trim()) { out.push(`${pre}${spec.label} cannot be left empty.`); continue; }
    const r = schemaFor(spec).safeParse(v);
    if (!r.success) for (const issue of r.error.issues) out.push(`${pre}${issue.message}`);
  }
  return out;
}

const unique = (msgs: string[]) => Array.from(new Set(msgs));
export const joinMessages = (msgs: string[]) => unique(msgs).join(" ");
export function assertValid(msgs: string[]): void {
  if (msgs.length) throw new Error(joinMessages(msgs));
}

// ─── Sections (driven by SECTION_TYPE_DEFS) ─────────────────────────────────

const MAX_SECTION_JSON = 120_000;
const MAX_LIST_ROWS = 60;

function fieldToSpec(f: SectionField, ownerLabel: string): Spec {
  const base = stripNote(f.label);
  const label = `${ownerLabel} ${lower(base)}`;
  const kind: Kind = f.type === "url" ? "link" : f.type === "image" ? "image" : f.type === "textarea" ? "long" : "text";
  return { key: f.key, label, kind, max: f.max, required: f.required };
}

export function validateSectionContent(type: string, content: unknown): string[] {
  if (content === null || typeof content !== "object" || Array.isArray(content)) return ["Section content must be a set of fields."];
  const c = content as Record<string, unknown>;
  const def = SECTION_TYPE_DEFS[type];
  const errors: string[] = [];
  try {
    if (JSON.stringify(c).length > MAX_SECTION_JSON) errors.push("This section has too much content. Remove some text or rows.");
  } catch {
    return ["Section content could not be read."];
  }
  if (!def) return errors;
  const owner = def.label;

  const specs = (def.fields ?? []).filter((f) => f.type !== "number").map((f) => fieldToSpec(f, owner));
  errors.push(...checkFields(specs, c));

  for (const f of def.fields ?? []) {
    const v = c[f.key];
    if (f.type === "number" && v !== undefined && v !== null && v !== "") {
      const n = Number(v);
      if (!Number.isFinite(n) || n < 1 || n > 24) errors.push(`${owner} ${lower(stripNote(f.label))} must be a number from 1 to 24.`);
    }
    if (f.type === "select" && typeof v === "string" && v && f.options && !f.options.some((o) => o.value === v)) {
      errors.push(`${owner} ${lower(stripNote(f.label))} has a value that is not one of the choices.`);
    }
  }

  // Every image needs alt text describing what is visible.
  const altMap = IMAGE_ALT_FIELDS[type] ?? {};
  for (const [imageKey, altKey] of Object.entries(altMap)) {
    const img = c[imageKey];
    if (typeof img === "string" && img.trim()) {
      const alt = c[altKey];
      if (typeof alt !== "string" || !alt.trim()) {
        const altLabel = stripNote((def.fields ?? []).find((f) => f.key === altKey)?.label ?? "alt text");
        const imgLabel = stripNote((def.fields ?? []).find((f) => f.key === imageKey)?.label ?? "image");
        errors.push(`Add ${lower(altLabel)} for the ${lower(imgLabel)}: describe what is actually visible in it.`);
      } else if (looksLikeFilename(alt, img)) {
        errors.push(`${owner} alt text looks like a file name. Describe what is actually visible in the image instead.`);
      }
    }
  }

  for (const list of def.lists ?? []) {
    const rows = c[list.key];
    if (rows === undefined || rows === null) continue;
    if (!Array.isArray(rows)) { errors.push(`${owner} ${lower(list.label)} must be a list.`); continue; }
    if (rows.length > MAX_LIST_ROWS) errors.push(`${owner} ${lower(list.label)} has ${rows.length} rows; keep it to ${MAX_LIST_ROWS} or fewer.`);
    rows.slice(0, MAX_LIST_ROWS).forEach((row, i) => {
      // A list with a single text field is stored as plain strings (e.g. the quote steps).
      if (typeof row === "string" && list.fields.length === 1) {
        errors.push(...checkFields([fieldToSpec(list.fields[0], `${stripNote(list.label)} row ${i + 1}`)], { [list.fields[0].key]: row }));
        return;
      }
      if (row === null || typeof row !== "object" || Array.isArray(row)) { errors.push(`${owner} ${lower(list.label)} row ${i + 1} is not valid.`); return; }
      const rowSpecs = list.fields.map((f) => fieldToSpec(f, `${stripNote(list.label)} row ${i + 1}`));
      errors.push(...checkFields(rowSpecs, row as Record<string, unknown>));
    });
  }
  return unique(errors);
}

// ─── Entities ────────────────────────────────────────────────────────────────

const SERVICE_SPECS: Spec[] = [
  { key: "title", label: "Service title", kind: "text", max: 80, required: true },
  { key: "slug", label: "Service web address", kind: "slug", max: 60, required: true },
  { key: "shortDescription", label: "Service short description", kind: "long", max: 300 },
  { key: "fullDescription", label: "Service full description", kind: "long", max: 5000 },
  { key: "ctaText", label: "Service button text", kind: "text", max: 40 },
  { key: "ctaUrl", label: "Service button link", kind: "link" },
  { key: "image", label: "Service image", kind: "image" },
  { key: "icon", label: "Service icon", kind: "text", max: 40 },
  { key: "seoTitle", label: "Service search title", kind: "text", max: 70, hard: 70 },
  { key: "seoDescription", label: "Service search description", kind: "long", max: 170, hard: 170 },
];

export function validateService(data: Record<string, unknown>, opts: { full?: boolean; name?: string } = {}): string[] {
  const out = checkFields(SERVICE_SPECS, data, { full: opts.full, prefix: opts.name });
  const pre = opts.name ? `${opts.name}: ` : "";
  if (data.features !== undefined && data.features !== null) {
    if (!Array.isArray(data.features)) out.push(`${pre}Service features must be a list.`);
    else data.features.forEach((f, i) => {
      if (typeof f !== "string" || !f.trim()) out.push(`${pre}Service feature ${i + 1} is empty. Fill it in or remove it.`);
      else if (f.length > 180) out.push(`${pre}Service feature ${i + 1} is ${f.length} characters; keep it under 120.`);
    });
  }
  if (data.faqs !== undefined && data.faqs !== null) {
    if (!Array.isArray(data.faqs)) out.push(`${pre}Service FAQs must be a list.`);
    else data.faqs.forEach((f, i) => {
      const q = (f as { question?: unknown })?.question;
      const a = (f as { answer?: unknown })?.answer;
      if (typeof q !== "string" || !q.trim()) out.push(`${pre}FAQ ${i + 1} needs a question. Fill it in or remove the row.`);
      else if (q.length > 300) out.push(`${pre}FAQ ${i + 1} question is ${q.length} characters; keep it under 200.`);
      if (typeof a !== "string" || !a.trim()) out.push(`${pre}FAQ ${i + 1} needs an answer. Fill it in or remove the row.`);
      else if (a.length > 2250) out.push(`${pre}FAQ ${i + 1} answer is ${a.length} characters; keep it under 1500.`);
    });
  }
  return unique(out);
}

const CLIENT_SPECS: Spec[] = [
  { key: "name", label: "Client name", kind: "text", max: 100, required: true },
  { key: "logoUrl", label: "Client logo", kind: "image" },
  { key: "websiteUrl", label: "Client website", kind: "web" },
  { key: "altText", label: "Client logo alt text", kind: "text", max: 150 },
  { key: "description", label: "Client description", kind: "long", max: 300 },
  { key: "sector", label: "Client sector", kind: "text", max: 60 },
];

/** `check.altRequired` is set when the save touches the logo or its alt text (or at publish time). */
export function validateClient(data: Record<string, unknown>, opts: { full?: boolean; name?: string; altRequired?: boolean } = {}): string[] {
  const out = checkFields(CLIENT_SPECS, data, { full: opts.full, prefix: opts.name });
  const pre = opts.name ? `${opts.name}: ` : "";
  const logo = typeof data.logoUrl === "string" ? data.logoUrl.trim() : "";
  const alt = typeof data.altText === "string" ? data.altText.trim() : "";
  if (logo && opts.altRequired !== false && !alt) out.push(`${pre}Add alt text for the client logo (for example "Ashoka University logo").`);
  else if (logo && alt && looksLikeFilename(alt, logo)) out.push(`${pre}Client logo alt text looks like a file name. Describe the logo instead.`);
  return unique(out);
}

const TESTIMONIAL_SPECS: Spec[] = [
  { key: "personName", label: "Testimonial name", kind: "text", max: 100, required: true },
  { key: "quote", label: "Testimonial quote", kind: "long", max: 600, required: true },
  { key: "designation", label: "Testimonial role", kind: "text", max: 100 },
  { key: "company", label: "Testimonial company", kind: "text", max: 100 },
  { key: "location", label: "Testimonial location", kind: "text", max: 100 },
  { key: "project", label: "Testimonial project", kind: "text", max: 100 },
];

export function validateTestimonial(data: Record<string, unknown>, opts: { full?: boolean; name?: string } = {}): string[] {
  const out = checkFields(TESTIMONIAL_SPECS, data, { full: opts.full, prefix: opts.name });
  const pre = opts.name ? `${opts.name}: ` : "";
  const r = data.rating;
  if (r !== undefined && r !== null && !(typeof r === "number" && Number.isInteger(r) && r >= 1 && r <= 5)) out.push(`${pre}Testimonial rating must be a whole number from 1 to 5.`);
  return unique(out);
}

const GALLERY_SPECS: Spec[] = [
  { key: "mediaUrl", label: "Gallery photo", kind: "image", required: true },
  { key: "caption", label: "Gallery caption", kind: "text", max: 200 },
  { key: "altText", label: "Gallery alt text", kind: "text", max: 150 },
  { key: "category", label: "Gallery category", kind: "text", max: 60 },
];

export function validateGalleryItem(data: Record<string, unknown>, opts: { full?: boolean; name?: string; altRequired?: boolean } = {}): string[] {
  const out = checkFields(GALLERY_SPECS, data, { full: opts.full, prefix: opts.name });
  const pre = opts.name ? `${opts.name}: ` : "";
  if (opts.altRequired !== false) {
    const alt = typeof data.altText === "string" ? data.altText.trim() : "";
    const url = typeof data.mediaUrl === "string" ? data.mediaUrl : null;
    if (!alt) out.push(`${pre}Add alt text for this photo: describe what is visible in it.`);
    else if (looksLikeFilename(alt, url)) out.push(`${pre}Alt text "${alt}" is just a file name. Describe what is visible in the photo instead.`);
  }
  return unique(out);
}

const SETTINGS_SPECS: Spec[] = [
  { key: "businessName", label: "Business name", kind: "text", max: 80 },
  { key: "shortDescription", label: "Short description", kind: "long", max: 300 },
  { key: "phone", label: "Phone number", kind: "phone" },
  { key: "phone2", label: "Second phone number", kind: "phone" },
  { key: "whatsapp", label: "WhatsApp number", kind: "phone" },
  { key: "email", label: "Email address", kind: "email" },
  { key: "addressLine1", label: "Address line 1", kind: "text", max: 120 },
  { key: "addressLine2", label: "Address line 2", kind: "text", max: 120 },
  { key: "city", label: "City", kind: "text", max: 60 },
  { key: "state", label: "State", kind: "text", max: 60 },
  { key: "pinCode", label: "PIN code", kind: "pin" },
  { key: "googleMapsUrl", label: "Google Maps link", kind: "web" },
  { key: "googleBusinessUrl", label: "Google Business link", kind: "web" },
  { key: "serviceArea", label: "Service area", kind: "text", max: 200 },
  { key: "websiteUrl", label: "Website address", kind: "web" },
  { key: "primaryLogoUrl", label: "Primary logo", kind: "image" },
  { key: "lightLogoUrl", label: "Light logo", kind: "image" },
  { key: "darkLogoUrl", label: "Dark logo", kind: "image" },
  { key: "mobileLogoUrl", label: "Mobile logo", kind: "image" },
  { key: "faviconUrl", label: "Favicon", kind: "image" },
  { key: "defaultOgImage", label: "Default share image", kind: "image" },
  { key: "footerContent", label: "Footer text", kind: "long", max: 500 },
  { key: "copyrightText", label: "Copyright text", kind: "text", max: 200 },
  { key: "founderName", label: "Founder name", kind: "text", max: 60 },
  { key: "founderTitle", label: "Founder title", kind: "text", max: 60 },
  { key: "founderBio", label: "Founder bio", kind: "long", max: 1200 },
  { key: "founderPhoto", label: "Founder photo", kind: "image" },
  { key: "mission", label: "Mission", kind: "long", max: 600 },
  { key: "vision", label: "Vision", kind: "long", max: 600 },
];

export function validateSettings(data: Record<string, unknown>): string[] {
  const out = checkFields(SETTINGS_SPECS, data);
  const h = data.businessHours;
  if (h !== undefined && h !== null && typeof h !== "object") out.push("Business hours must be a set of days and times.");
  return unique(out);
}

const SEO_SPECS: Spec[] = [
  { key: "globalTitle", label: "Search title", kind: "text", max: 70, hard: 70 },
  { key: "globalDescription", label: "Search description", kind: "long", max: 170, hard: 170 },
  { key: "defaultOgImage", label: "Default share image", kind: "image" },
  { key: "twitterTitle", label: "Social share title", kind: "text", max: 70, hard: 70 },
  { key: "twitterDescription", label: "Social share description", kind: "long", max: 200, hard: 200 },
  { key: "twitterImage", label: "Social share image", kind: "image" },
  { key: "canonicalUrl", label: "Canonical address", kind: "web" },
];

export function validateSeo(data: Record<string, unknown>): string[] {
  const out = checkFields(SEO_SPECS, data);
  const sd = data.structuredData;
  if (sd !== undefined && sd !== null) {
    try { JSON.stringify(sd); } catch { out.push("Structured data is not valid JSON."); }
    if (typeof sd !== "object") out.push("Structured data must be a JSON object.");
  }
  return unique(out);
}

const NAV_SPECS: Spec[] = [
  { key: "label", label: "Menu label", kind: "text", max: 30, required: true },
  { key: "url", label: "Menu link", kind: "link", required: true },
];
export const validateNavItem = (data: Record<string, unknown>, opts: { full?: boolean; name?: string } = {}) => unique(checkFields(NAV_SPECS, data, { full: opts.full, prefix: opts.name }));

/** Page-level search metadata. */
const PAGE_SPECS: Spec[] = [
  { key: "name", label: "Page name", kind: "text", max: 80, required: true },
  { key: "slug", label: "Page web address", kind: "text", max: 60 },
  { key: "seoTitle", label: "Page search title", kind: "text", max: 70, hard: 70 },
  { key: "metaDescription", label: "Page search description", kind: "long", max: 170, hard: 170 },
  { key: "ogTitle", label: "Page share title", kind: "text", max: 70, hard: 70 },
  { key: "ogDescription", label: "Page share description", kind: "long", max: 200, hard: 200 },
  { key: "ogImage", label: "Page share image", kind: "image" },
];
export const validatePageMeta = (data: Record<string, unknown>, opts: { full?: boolean; name?: string } = {}) => unique(checkFields(PAGE_SPECS, data, { full: opts.full, prefix: opts.name }));
