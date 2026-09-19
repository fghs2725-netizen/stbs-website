import { z } from "zod";
import { company } from "@/lib/company";

/**
 * Proposal / site-assessment request: one schema for the browser form AND the API route, so
 * the rules a visitor sees inline are exactly the rules the server enforces.
 */
export const SERVICE_CHOICES = [
  "Borewell Drilling",
  "Rainwater Harvesting",
  "Borewell Material Supply",
  "Tubewell Construction",
  "Not sure yet",
] as const;

const oneLine = (max: number) => z.string().trim().max(max).refine((v) => !/[\r\n]/.test(v), "Use a single line");

export const quoteSchema = z.object({
  name: oneLine(100).min(1, "Enter your name"),
  organisation: oneLine(120).optional().or(z.literal("")),
  // Indian numbers with optional +91 / spaces / dashes: 10 digits after the country code.
  phone: z
    .string()
    .trim()
    .min(1, "Enter a phone number")
    .refine((v) => {
      const d = v.replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "").replace(/^0(?=\d{10}$)/, "");
      return /^\d{10}$/.test(d);
    }, "Enter a 10-digit phone number"),
  email: z.string().trim().max(160).email("Enter a valid email address").optional().or(z.literal("")),
  service: z.enum(SERVICE_CHOICES, { message: "Choose a service" }),
  location: oneLine(160).min(1, "Enter the site location"),
  details: z.string().trim().max(2000, "Keep this under 2,000 characters").optional().or(z.literal("")),
  // Honeypot: real visitors never see or fill this. Bots that do are silently dropped.
  website: z.string().max(200).optional().or(z.literal("")),
});

export type QuoteRequest = z.infer<typeof quoteSchema>;
export type QuoteFieldErrors = Partial<Record<keyof QuoteRequest, string>>;

/** First error message per field, for inline display. */
export function fieldErrors(issues: ReadonlyArray<{ path: PropertyKey[]; message: string }>): QuoteFieldErrors {
  const out: QuoteFieldErrors = {};
  for (const i of issues) {
    const key = i.path[0] as keyof QuoteRequest | undefined;
    if (key && !out[key]) out[key] = i.message;
  }
  return out;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Subject and body for the internal notification email. Every visitor-supplied value is escaped. */
export function buildQuoteEmail(q: QuoteRequest) {
  const rows: Array<[string, string]> = [
    ["Name", q.name],
    ["Organisation", q.organisation || "-"],
    ["Phone", q.phone],
    ["Email", q.email || "-"],
    ["Service", q.service],
    ["Site location", q.location],
    ["Details", q.details || "-"],
  ];
  const subject = `New proposal request: ${q.service} - ${q.name}`.slice(0, 200);
  const textBody = ["New proposal request from the website", "", ...rows.map(([k, v]) => `${k}: ${v}`)].join("\n");
  const htmlBody =
    `<p><strong>New proposal request from the website</strong></p><table cellpadding="6" style="border-collapse:collapse">` +
    rows.map(([k, v]) => `<tr><td style="border:1px solid #ddd"><strong>${esc(k)}</strong></td><td style="border:1px solid #ddd;white-space:pre-wrap">${esc(v)}</td></tr>`).join("") +
    `</table>`;
  return { subject, textBody, htmlBody };
}

/** wa.me link with the visitor's details pre-filled: the fallback when online sending is unavailable. */
export function quoteWhatsAppUrl(q: Partial<QuoteRequest>): string {
  const lines = [
    "Hi, I'd like a proposal.",
    q.service ? `Service: ${q.service}` : "",
    q.location ? `Site: ${q.location}` : "",
    q.name ? `Name: ${q.name}` : "",
    q.organisation ? `Organisation: ${q.organisation}` : "",
    q.phone ? `Phone: ${q.phone}` : "",
    q.details ? `Details: ${q.details}` : "",
  ].filter(Boolean);
  return `https://wa.me/91${company.phones[0]}?text=${encodeURIComponent(lines.join("\n"))}`;
}

export type QuoteResult = { ok: true } | { ok: false; status: number; error: string; fields?: QuoteFieldErrors };
export type QuoteSender = (mail: { to: string[]; subject: string; htmlBody: string; textBody: string; metadata: Record<string, unknown> }) => Promise<{ success: boolean; error?: string }>;

/**
 * The server-side logic, with the sender injected so it can be tested without sending anything.
 * Bots (honeypot) get a normal-looking success and nothing is sent.
 */
export async function processQuote(input: unknown, send: QuoteSender, recipient: string): Promise<QuoteResult> {
  const parsed = quoteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, status: 422, error: "Please check the highlighted fields.", fields: fieldErrors(parsed.error.issues) };
  const q = parsed.data;
  if (q.website) return { ok: true };
  const mail = buildQuoteEmail(q);
  const result = await send({ to: [recipient], ...mail, metadata: { source: "website-quote-form", service: q.service } });
  if (!result.success) return { ok: false, status: 503, error: "We could not send your request online." };
  return { ok: true };
}
