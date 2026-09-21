import { calcTotals, formatINR, serviceLabel, type QuotationState } from "../quotation-model";
import { CLASSIC_CONTENT } from "../template/template-model";
import { quotationFilename } from "@/lib/quotation-filename";

/**
 * Sharing a quotation: the words that go with the PDF, the file name, and the links that hand it to WhatsApp
 * or a mail app. Pure (no browser, no network), so the parts that are easy to get subtly wrong can be tested exactly.
 */

/** Everything the message needs. Plain data, so a server page can build it and pass it to the client. */
export type ShareSubject = {
  reference: string;
  clientName: string;
  contact?: string;
  phone?: string;
  email?: string;
  service?: string;
  total?: number;
  validity?: string;
  company: string;
  signatory: string;
  signatoryTitle?: string;
  phones?: string;
};

/** The template stores the company name the way it prints on the letterhead (capitals). A message reads better in normal case. */
export function friendlyCompany(name: string): string {
  const n = name.trim();
  if (n && n === n.toUpperCase() && /[A-Z]/.test(n)) return n.toLowerCase().replace(/(^|[\s(&-])([a-z])/g, (_m, sep: string, ch: string) => sep + ch.toUpperCase());
  return n;
}

/** Builds the subject from a quotation. `grandTotal` may be passed when the items are not on hand (list rows). */
export function shareSubjectFrom(q: Pick<QuotationState, "quotationReference" | "client" | "serviceType" | "customServiceType" | "validity" | "items" | "discountType" | "discountValue" | "gstEnabled" | "gstMode" | "gstRate" | "template">, grandTotal?: number): ShareSubject {
  const t = q.template?.content ?? CLASSIC_CONTENT;
  return {
    reference: q.quotationReference?.trim() ?? "",
    clientName: q.client.companyName?.trim() ?? "",
    contact: q.client.contactPerson?.trim() || undefined,
    phone: q.client.phone?.trim() || undefined,
    email: q.client.email?.trim() || undefined,
    service: serviceLabel(q as QuotationState) || undefined,
    total: grandTotal ?? calcTotals(q).grandTotal,
    validity: q.validity?.trim() || undefined,
    company: friendlyCompany(t.preparedBy.company),
    signatory: t.letter.signatoryName,
    signatoryTitle: t.letter.signatoryTitle || undefined,
    phones: t.preparedBy.phones || undefined,
  };
}

/** The subject line for mail and the title in a share sheet. */
export function shareTitle(s: ShareSubject): string {
  const ref = s.reference ? ` ${s.reference}` : "";
  const svc = s.service ? ` for ${s.service}` : "";
  return `Quotation${ref}${svc} - ${s.company}`;
}

/** The message that goes with the PDF. Editable in the sheet before it is used. */
export function buildShareMessage(s: ShareSubject): string {
  const to = s.contact || s.clientName || "Sir/Madam";
  const lines = [`Dear ${to},`, "", `Please find attached our quotation${s.reference ? ` ${s.reference}` : ""}${s.service ? ` for ${s.service}` : ""}.`];
  const facts: string[] = [];
  if (s.total && s.total > 0) facts.push(`Total: ${formatINR(s.total)}`);
  if (s.validity) facts.push(`Valid: ${s.validity}`);
  if (facts.length) lines.push("", ...facts);
  lines.push("", "Thank you for the opportunity.", "", "Regards,", `${s.signatory}${s.signatoryTitle ? `, ${s.signatoryTitle}` : ""}`, s.company);
  if (s.phones) lines.push(s.phones);
  return lines.join("\n");
}

/**
 * A number wa.me accepts (country code, digits only), or null. A bare 10-digit Indian mobile gets 91;
 * a leading 0 is dropped; anything already carrying a country code is kept. Anything else is refused,
 * so a typo never opens a chat with a stranger.
 */
export function whatsappNumber(raw: string | undefined | null): string | null {
  const d = (raw ?? "").replace(/\D/g, "");
  if (/^[6-9]\d{9}$/.test(d)) return `91${d}`;
  if (/^0[6-9]\d{9}$/.test(d)) return `91${d.slice(1)}`;
  if (/^91[6-9]\d{9}$/.test(d)) return d;
  if (/^[1-9]\d{10,14}$/.test(d)) return d;
  return null;
}

/** Opens WhatsApp with the message ready: to the client's number when it is usable, otherwise to a chat picker. */
export function whatsappHref(phone: string | undefined | null, text: string): string {
  const n = whatsappNumber(phone);
  return `https://wa.me/${n ?? ""}?text=${encodeURIComponent(text)}`;
}

/** Opens the mail app with recipient, subject and body filled. Mail clients want CRLF line breaks. */
export function mailtoHref(email: string | undefined | null, subject: string, body: string): string {
  const to = (email ?? "").trim();
  const safeTo = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]{2,}$/.test(to) ? encodeURIComponent(to).replace(/%40/g, "@") : "";
  return `mailto:${safeTo}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body.replace(/\r?\n/g, "\r\n"))}`;
}

/* ---------- the file name ---------- */

const RESERVED_WINDOWS = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;

/**
 * Turns whatever was typed into a name every device will accept, without the ".pdf" (that is added once, at
 * the end). Characters Windows and macOS refuse are replaced, control characters dropped, spaces collapsed,
 * and dots or dashes trimmed from the ends. Letters from any language are kept, so a Hindi client name works.
 * An empty result falls back to `fallback`, so the file is never nameless.
 */
export function sanitizeFileBase(input: string, fallback: string, max = 100): string {
  let n = (input ?? "")
    .replace(/[\t\r\n]+/g, " ") // a pasted line break separates words; it must not glue them together
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/(\.pdf)+$/i, "")
    .replace(/^[\s.\-]+|[\s.\-]+$/g, "");
  n = Array.from(n).slice(0, max).join("").replace(/[\s.\-]+$/g, "");
  if (!n) return fallback;
  return RESERVED_WINDOWS.test(n) ? `_${n}` : n;
}

/** Every file gets exactly one .pdf, however the base was typed. */
export const withPdfExtension = (base: string) => `${base}.pdf`;

/** The name a quotation is saved under unless you change it (without the extension). */
export function defaultFileBase(s: Pick<ShareSubject, "reference" | "clientName">): string {
  return quotationFilename({ quotationReference: s.reference, client: { companyName: s.clientName } }, "pdf").replace(/\.pdf$/, "");
}

/** A few one-tap alternatives to the default, in the order most people want them. Duplicates are dropped. */
export function fileNameSuggestions(s: Pick<ShareSubject, "reference" | "clientName" | "service">): string[] {
  const fallback = defaultFileBase(s);
  const ref = s.reference ? s.reference.replace(/^STBS\//i, "") : "";
  const client = s.clientName.trim();
  const raw = [
    fallback,
    client && `${client} - Quotation`,
    client && ref && `${client} - Quotation ${ref}`,
    ref && `Quotation ${ref}`,
    client && s.service && `${client} - ${s.service}`,
  ].filter((x): x is string => Boolean(x));
  const seen = new Set<string>();
  return raw
    .map((x) => sanitizeFileBase(x, fallback))
    .filter((x) => (seen.has(x.toLowerCase()) ? false : (seen.add(x.toLowerCase()), true)))
    .slice(0, 4);
}
