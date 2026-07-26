// ─────────────────────────────────────────────────────────────────────────────
// BOQ / Financial Calculations — Decimal-safe arithmetic for GST-compliant
// documents with Indian tax structure (CGST + SGST / IGST).
// ─────────────────────────────────────────────────────────────────────────────

import type { DocumentItemData, DocumentState } from "./types";

/** Round to 2 decimal places using integer arithmetic to avoid float drift */
export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Calculate line item amount (qty × rate) */
export function calcItemAmount(quantity: number, rate: number): number {
  return round2(quantity * rate);
}

/** Calculate GST amount for a single item */
export function calcItemGST(amount: number, gstPercent: number): number {
  return round2((amount * gstPercent) / 100);
}

/** Recalculate a single item's derived fields */
export function recalcItem(item: DocumentItemData): DocumentItemData {
  const amount = calcItemAmount(item.quantity, item.rate);
  const gstAmount = calcItemGST(amount, item.gstPercent);
  return { ...item, amount, gstAmount };
}

/** Recalculate all items and return updated array */
export function recalcAllItems(items: DocumentItemData[]): DocumentItemData[] {
  return items.map(recalcItem);
}

/** Financial summary for a set of items */
export interface FinancialSummary {
  subtotal: number;
  totalGST: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  discountAmount: number;
  taxableAmount: number;
  totalAmount: number;
}

/** Calculate complete financial summary */
export function calcFinancialSummary(
  items: DocumentItemData[],
  discountPercent: number = 0,
  isInterState: boolean = false,
): FinancialSummary {
  const subtotal = items.reduce((sum, item) => round2(sum + item.amount), 0);
  const discountAmount = round2((subtotal * discountPercent) / 100);
  const taxableAmount = round2(subtotal - discountAmount);

  // Total GST across all items (recalculated on taxable proportions)
  const totalGST = items.reduce((sum, item) => {
    const proportion = subtotal > 0 ? item.amount / subtotal : 0;
    const itemTaxable = round2(taxableAmount * proportion);
    return round2(sum + calcItemGST(itemTaxable, item.gstPercent));
  }, 0);

  // Split into CGST/SGST (intra-state) or IGST (inter-state)
  const cgstAmount = isInterState ? 0 : round2(totalGST / 2);
  const sgstAmount = isInterState ? 0 : round2(totalGST / 2);
  const igstAmount = isInterState ? totalGST : 0;

  const totalAmount = round2(taxableAmount + totalGST);

  return {
    subtotal,
    totalGST,
    cgstAmount,
    sgstAmount,
    igstAmount,
    discountAmount,
    taxableAmount,
    totalAmount,
  };
}

/** Apply financial summary to document state */
export function applyFinancials(doc: DocumentState, isInterState: boolean = false): DocumentState {
  const items = recalcAllItems(doc.items);
  const summary = calcFinancialSummary(items, doc.discountPercent, isInterState);

  return {
    ...doc,
    items,
    subtotal: summary.subtotal,
    discountAmount: summary.discountAmount,
    taxableAmount: summary.taxableAmount,
    cgstAmount: summary.cgstAmount,
    sgstAmount: summary.sgstAmount,
    igstAmount: summary.igstAmount,
    totalAmount: summary.totalAmount,
  };
}

// ─── Currency Formatting ─────────────────────────────────────────────────────

const INR_FORMATTER = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Format number as Indian Rupees */
export function formatINR(n: number): string {
  return INR_FORMATTER.format(n);
}

/** Format number with commas (Indian system) */
export function formatNumber(n: number, decimals: number = 2): string {
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

// ─── Amount in Words (Indian system) ─────────────────────────────────────────

const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function convertGroup(n: number): string {
  if (n === 0) return "";
  if (n < 20) return ONES[n];
  if (n < 100) return `${TENS[Math.floor(n / 10)]} ${ONES[n % 10]}`.trim();
  return `${ONES[Math.floor(n / 100)]} Hundred ${convertGroup(n % 100)}`.trim();
}

/** Convert number to Indian amount in words */
export function amountInWords(amount: number): string {
  if (amount === 0) return "Zero Rupees Only";

  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);

  let result = "";
  let remaining = rupees;

  // Crores
  if (remaining >= 10000000) {
    result += `${convertGroup(Math.floor(remaining / 10000000))} Crore `;
    remaining %= 10000000;
  }

  // Lakhs
  if (remaining >= 100000) {
    result += `${convertGroup(Math.floor(remaining / 100000))} Lakh `;
    remaining %= 100000;
  }

  // Thousands
  if (remaining >= 1000) {
    result += `${convertGroup(Math.floor(remaining / 1000))} Thousand `;
    remaining %= 1000;
  }

  // Hundreds and below
  if (remaining > 0) {
    result += convertGroup(remaining);
  }

  result = `${result.trim()} Rupees`;

  if (paise > 0) {
    result += ` and ${convertGroup(paise)} Paise`;
  }

  return `${result} Only`;
}

// ─── Percentage helpers ──────────────────────────────────────────────────────

/** Format percentage */
export function formatPercent(n: number): string {
  return `${n.toFixed(2)}%`;
}

/** GST breakdown display */
export function gstBreakdown(gstPercent: number, isInterState: boolean): string {
  if (isInterState) return `IGST @ ${gstPercent}%`;
  const half = round2(gstPercent / 2);
  return `CGST @ ${half}% + SGST @ ${half}%`;
}
