/** Sample letters for `npm run test:letter-snapshot`. Placeholder text only; the route refuses to run in production. */
import { letterSchema, type LetterDetails } from "@/lib/letter";

const base = (body: string, extra: Partial<LetterDetails> = {}): LetterDetails => letterSchema.parse({
  date: "2026-11-04", to: "The Manager\nSample Company Pvt. Ltd.\nKundli, Sonipat", subject: "Sample subject line",
  body, reference: "STBS/LTR/2026-27/001", ...extra,
});
const para = (n: number) => `Paragraph ${n}. ` + "This is placeholder text that fills the line so the page break can be checked against a real width. ".repeat(3);

export const LETTER_FIXTURES: Record<string, LetterDetails | null> = {
  blank: null,
  short: base("This is a short sample letter.\n\nIt has two paragraphs and a signature."),
  "no-signature": base(para(1), { withSignature: false, attention: "Accounts department" }),
  long: base(Array.from({ length: 22 }, (_, i) => para(i + 1)).join("\n\n")),
};
