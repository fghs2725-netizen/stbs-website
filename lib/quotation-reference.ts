/**
 * Quotation numbers: STBS/{financial year}/{running number}, e.g. STBS/2026-27/0142.
 * The Indian financial year runs 1 April to 31 March, judged in IST regardless of the server's timezone.
 * The running number continues from the existing per-year counter, so it never restarts mid-year.
 */
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** First calendar year of the financial year containing `now` (2026 for 15 Sep 2026 and for 10 Feb 2027). */
export function financialYearStart(now: Date = new Date()): number {
  const ist = new Date(now.getTime() + IST_OFFSET_MS);
  const month = ist.getUTCMonth();
  const year = ist.getUTCFullYear();
  return month >= 3 ? year : year - 1;
}

export const financialYearLabel = (startYear: number) => `${startYear}-${String((startYear + 1) % 100).padStart(2, "0")}`;

export const formatQuotationReference = (startYear: number, n: number) => `STBS/${financialYearLabel(startYear)}/${String(n).padStart(4, "0")}`;
