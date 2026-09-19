import type { QuotationItem } from "./quotation-model";

/* ---------- Numeric cells ---------- */

// Column limits mirror the database (quantity Decimal(10,2), rate Decimal(12,2)).
export const MAX_QUANTITY = 99_999_999;
export const MAX_RATE = 9_999_999_999;

/** Keep only digits and a single decimal point (max 2 decimals). Commas typed or pasted are ignored. */
export function sanitizeNumericText(text: string): string {
  const cleaned = text.replace(/[^0-9.]/g, "");
  const dot = cleaned.indexOf(".");
  if (dot === -1) return cleaned;
  return cleaned.slice(0, dot + 1) + cleaned.slice(dot + 1).replace(/\./g, "").slice(0, 2);
}

/** Parse committed text into a finite number within [0, max]; empty text is 0. */
export function parseNumeric(text: string, max: number): number {
  const cleaned = sanitizeNumericText(text.replace(/,/g, ""));
  if (cleaned === "" || cleaned === ".") return 0;
  return Math.min(Number(cleaned), max);
}

/** Indian digit grouping (1,20,000), up to 2 decimals, no trailing zeros. */
export function formatCell(n: number): string {
  if (!Number.isFinite(n)) return "";
  return n.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

/* ---------- Row operations ---------- */

export function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) return items;
  const next = items.slice();
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

export function duplicateItem(items: QuotationItem[], id: string, newId: string): QuotationItem[] {
  const at = items.findIndex((i) => i.id === id);
  if (at === -1) return items;
  const next = items.slice();
  next.splice(at + 1, 0, { ...items[at], id: newId });
  return next;
}

export const isPopulatedItem = (i: QuotationItem) => i.description.trim() !== "" || i.unit.trim() !== "" || i.rate > 0;

/* ---------- Undo / redo ---------- */

export type History<T> = { past: T[]; present: T; future: T[]; lastKey: string; lastAt: number };
export const HISTORY_LIMIT = 100;
export const COALESCE_MS = 800;

export const createHistory = <T,>(present: T): History<T> => ({ past: [], present, future: [], lastKey: "", lastAt: 0 });

/** Rapid edits that share a key (typing in one field) collapse into one undo step. */
export function pushHistory<T>(h: History<T>, value: T, key: string | undefined, now: number): History<T> {
  if (Object.is(value, h.present)) return h;
  const coalesce = Boolean(key) && h.lastKey === key && now - h.lastAt < COALESCE_MS;
  const past = coalesce ? h.past : [...h.past, h.present].slice(-HISTORY_LIMIT);
  return { past, present: value, future: [], lastKey: key ?? "", lastAt: now };
}

export function undoHistory<T>(h: History<T>): History<T> {
  if (!h.past.length) return h;
  return { past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future], lastKey: "", lastAt: 0 };
}

export function redoHistory<T>(h: History<T>): History<T> {
  if (!h.future.length) return h;
  return { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1), lastKey: "", lastAt: 0 };
}

/** Replace the present value without creating an undo step (e.g. after the server assigns an id). */
export const replaceHistoryPresent = <T,>(h: History<T>, value: T): History<T> => ({ ...h, present: value });
