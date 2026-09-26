import { calcTotals, formatINR, serviceLabel, type QuotationState } from "../quotation-model";
import { CLASSIC_CONTENT } from "../template/template-model";
import { quotationFilename } from "@/lib/quotation-filename";
import { invoiceFilename } from "@/lib/invoice-filename";
import { parseInvoiceNumber } from "@/lib/invoice-numbering";
import { formatRupees } from "@/lib/worker-ledger";

/**
 * Sharing a quotation: the words that go with the PDF, the file name, and the links that hand it to WhatsApp
 * or a mail app. Pure (no browser, no network), so the parts that are easy to get subtly wrong can be tested exactly.
 */

/**
 * Everything the message needs. Plain data, so a server page can build it and pass it to the client.
 *
 * Invoices share the same sheet, so `kind` chooses the wording and the file name. It is optional and
 * absent means a quotation, which keeps every existing caller working unchanged.
 */
export type ShareSubject = {
  kind?: "quotation" | "invoice" | "statement" | "summary";
  /** Worker statements only: the period's figures, for the message. */
  statement?: { work: number; paid: number; balanceText: string };
  /** Invoices only: when payment is due, and what is left to pay. */
  dueDate?: string;
  balance?: number;
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

/** "Quotation" or "Invoice", as the document calls itself in a message. */
export const documentLabel = (s: Pick<ShareSubject, "kind">) => (s.kind === "invoice" ? "Invoice" : s.kind === "statement" ? "Statement" : s.kind === "summary" ? "Summary" : "Quotation");

/** The subject line for mail and the title in a share sheet. */
export function shareTitle(s: ShareSubject): string {
  if (s.kind === "statement") return `Statement - ${s.clientName}${s.reference ? ` - ${s.reference}` : ""} - ${s.company}`;
  if (s.kind === "summary") return `${s.clientName}${s.reference ? ` - ${s.reference}` : ""} - ${s.company}`;
  const ref = s.reference ? ` ${s.reference}` : "";
  const svc = s.service ? ` for ${s.service}` : "";
  return `${documentLabel(s)}${ref}${svc} - ${s.company}`;
}

/** The message that goes with the PDF. Editable in the sheet before it is used. */
export function buildShareMessage(s: ShareSubject): string {
  if (s.kind === "summary") {
    const lines = [`${s.clientName}${s.reference ? ` for ${s.reference}` : ""} is attached.`, "", "Regards,", s.company];
    if (s.phones) lines.push(s.phones);
    return lines.join("\n");
  }
  if (s.kind === "statement") {
    // A worker's statement: plain and short, the figures he will check first.
    const lines = [`Namaste ${s.clientName},`, "", `Your work and payment statement${s.reference ? ` for ${s.reference}` : ""} is attached.`];
    if (s.statement) lines.push("", `Work done: ${formatRupees(s.statement.work)}`, `Money given: ${formatRupees(s.statement.paid)}`, `Balance: ${s.statement.balanceText}`);
    lines.push("", "Regards,", s.company);
    if (s.phones) lines.push(s.phones);
    return lines.join("\n");
  }
  const to = s.contact || s.clientName || "Sir/Madam";
  const isInvoice = s.kind === "invoice";
  const noun = isInvoice ? "invoice" : "quotation";
  const lines = [`Dear ${to},`, "", `Please find attached our ${noun}${s.reference ? ` ${s.reference}` : ""}${s.service ? ` for ${s.service}` : ""}.`];

  const facts: string[] = [];
  if (s.total && s.total > 0) facts.push(`Total: ${formatINR(s.total)}`);
  if (isInvoice) {
    // An invoice that has had part payment should ask for what is left, not the whole total again.
    if (typeof s.balance === "number" && s.balance > 0 && s.balance !== s.total) facts.push(`Balance due: ${formatINR(s.balance)}`);
    if (s.dueDate) facts.push(`Due by: ${s.dueDate}`);
  } else if (s.validity) {
    facts.push(`Valid: ${s.validity}`);
  }
  if (facts.length) lines.push("", ...facts);

  lines.push("", isInvoice ? "Thank you for your business." : "Thank you for the opportunity.", "", "Regards,", `${s.signatory}${s.signatoryTitle ? `, ${s.signatoryTitle}` : ""}`, s.company);
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

/** The name the document is saved under unless you change it (without the extension). */
export function defaultFileBase(s: Pick<ShareSubject, "reference" | "clientName" | "kind">): string {
  if (s.kind === "statement") return sanitizeFileBase(`${s.clientName} - Statement${s.reference ? ` - ${s.reference}` : ""}`, "Statement");
  if (s.kind === "summary") return sanitizeFileBase(`${s.clientName}${s.reference ? ` - ${s.reference}` : ""}`, "Summary");
  const name = s.kind === "invoice"
    ? invoiceFilename({ number: parseInvoiceNumber(s.reference) ?? undefined, client: { companyName: s.clientName } })
    : quotationFilename({ quotationReference: s.reference, client: { companyName: s.clientName } }, "pdf");
  return name.replace(/\.pdf$/, "");
}

/** A few one-tap alternatives to the default, in the order most people want them. Duplicates are dropped. */
export function fileNameSuggestions(s: Pick<ShareSubject, "reference" | "clientName" | "service" | "kind">): string[] {
  const fallback = defaultFileBase(s);
  const ref = s.reference ? s.reference.replace(/^STBS\//i, "") : "";
  const client = s.clientName.trim();
  const label = documentLabel(s);
  const raw = [
    fallback,
    client && `${client} - ${label}`,
    client && ref && `${client} - ${label} ${ref}`,
    ref && `${label} ${ref}`,
    client && s.service && `${client} - ${s.service}`,
  ].filter((x): x is string => Boolean(x));
  const seen = new Set<string>();
  return raw
    .map((x) => sanitizeFileBase(x, fallback))
    .filter((x) => (seen.has(x.toLowerCase()) ? false : (seen.add(x.toLowerCase()), true)))
    .slice(0, 4);
}
