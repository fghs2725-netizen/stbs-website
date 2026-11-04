/**
 * Letters on the STBS letterhead: what a letter holds, its number, and where its pages break.
 * Pure (no database, no browser), so `npm run test:letter` checks it on its own.
 */
import { z } from "zod";

const text = (max: number) => z.string().trim().max(max).optional().default("");

export const letterSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose the letter date."),
  to: z.string().trim().min(1, "Enter who the letter is to.").max(400),
  attention: text(120),
  subject: z.string().trim().min(1, "Enter the subject.").max(200),
  salutation: z.string().trim().max(80).optional().default("Dear Sir/Madam,"),
  body: z.string().trim().min(1, "Write the letter.").max(12000),
  closing: z.string().trim().max(80).optional().default("Yours faithfully,"),
  signatory: z.string().trim().max(80).optional().default("Rajesh Saini"),
  designation: z.string().trim().max(80).optional().default("Managing Director"),
  withSignature: z.boolean().optional().default(true),
  /** Filled in by the server when the letter is saved; never typed. */
  reference: text(40),
});
export type LetterDetails = z.infer<typeof letterSchema>;

// ── numbering ────────────────────────────────────────────────────────────────

export function financialYearStart(date: string): number {
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) return new Date().getFullYear();
  return d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
}
export const letterSeriesPrefix = (fy: number) => `STBS/LTR/${fy}-${String((fy + 1) % 100).padStart(2, "0")}/`;
export const formatLetterNumber = (fy: number, n: number) => `${letterSeriesPrefix(fy)}${String(n).padStart(3, "0")}`;

/** The next number from the references already used in that financial year (they lead the saved titles). */
export function nextLetterNumber(titles: string[], fy: number): number {
  const prefix = letterSeriesPrefix(fy);
  let max = 0;
  for (const t of titles) {
    if (!t.startsWith(prefix)) continue;
    const n = parseInt(t.slice(prefix.length), 10);
    if (Number.isInteger(n) && n > max) max = n;
  }
  return max + 1;
}

// ── page breaks ──────────────────────────────────────────────────────────────

/*
 * Counted in printed lines of body text. A body line holds about 92 characters at 10.5pt across the
 * 170 mm text width. The budgets are cautious; `npm run test:letter-snapshot` fails if anything lands
 * below the page box, which is what would catch a budget set too high.
 */
export const LETTER_LINES = { first: 26, next: 40, signature: 8, perLine: 92 } as const;

export const paragraphs = (body: string) => body.replace(/\r\n/g, "\n").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
export const paragraphLines = (p: string) => p.split("\n").reduce((n, line) => n + Math.max(1, Math.ceil(line.length / LETTER_LINES.perLine)), 0) + 0.6;

/** The body's paragraphs split onto pages. A paragraph is never split; one longer than a page sits on a page of its own. */
export function letterPages(l: Pick<LetterDetails, "body" | "to" | "attention">): string[][] {
  const toLines = l.to.split("\n").length + (l.attention ? 1 : 0);
  const pages: string[][] = [[]];
  let budget: number = LETTER_LINES.first - Math.max(0, toLines - 3);
  for (const p of paragraphs(l.body)) {
    const need = paragraphLines(p);
    if (need > budget && pages[pages.length - 1].length > 0) { pages.push([]); budget = LETTER_LINES.next; }
    pages[pages.length - 1].push(p);
    budget -= need;
  }
  if (budget < LETTER_LINES.signature) pages.push([]);
  return pages;
}
export const letterPageCount = (l: Pick<LetterDetails, "body" | "to" | "attention">) => letterPages(l).length;

export const letterFileName = (l: Pick<LetterDetails, "reference" | "subject">) =>
  `STBS Letter ${l.reference ? l.reference.split("/").pop() : ""} - ${l.subject}`.replace(/[\\/\x00-\x1f<>:"|?*]/g, "_").replace(/\s+/g, " ").trim().slice(0, 120) + ".pdf";
