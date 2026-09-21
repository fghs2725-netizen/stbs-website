/**
 * Invoice numbering.
 *
 * The owner's existing invoice book runs to 764, so this series continues at 765 and never restarts —
 * a plain running number, printed bare, with no prefix and no financial-year segment. That is deliberate
 * and different from the quotation series (`STBS/2026-27/0142`), which does restart each April.
 *
 * A number is taken only when an invoice is ISSUED, never when a draft is created, so an abandoned draft
 * cannot leave a gap. Under GST the series must be unbroken for the financial year, so the one rule that
 * matters here is: allocate late, and never reuse.
 *
 * Pure (no database). The atomic allocation against the counter row lives in lib/invoice-management.ts.
 */

/** The number the owner's existing book has already reached. The first invoice issued here is 765. */
export const CONTINUES_FROM = 764;

/** How the number prints. Bare, exactly as the owner writes it today. */
export function formatInvoiceNumber(n: number): string {
  return String(Math.trunc(n));
}

/** Reads a printed number back, or null when it is not one of ours. */
export function parseInvoiceNumber(s: unknown): number | null {
  const t = typeof s === "string" ? s.trim() : typeof s === "number" ? String(s) : "";
  if (!/^[0-9]{1,9}$/.test(t)) return null;
  const n = Number(t);
  return n > 0 ? n : null;
}

/** The next number after whatever the counter holds. */
export function nextNumber(last: unknown): number {
  const n = typeof last === "number" && Number.isFinite(last) ? Math.trunc(last) : 0;
  return Math.max(n, CONTINUES_FROM) + 1;
}
