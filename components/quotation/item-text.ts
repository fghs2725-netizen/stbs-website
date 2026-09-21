/**
 * A price row has an item name and, optionally, details (the brand or company, model, size, material...).
 *
 * The database keeps one text column for a row's wording. The item name is the first line of it and any
 * details follow after a line break. That is safe for every quotation already saved: the editor has never
 * let a line break into an item name, so an existing row reads back as "this name, no details". Nothing in
 * the database had to change, and the two halves are only ever joined and split here.
 *
 * Pure (no browser, no database), so the rules that keep saved text and printed text identical are tested.
 */

export const DETAILS_MAX_CHARS = 400;
export const DETAILS_MAX_LINES = 6;

/** A message for details that are too long or have too many lines, or null when they fit. */
export function detailsProblem(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const lines = raw.replace(/\r\n?/g, "\n").split("\n").map((l) => l.trim()).filter(Boolean);
  const chars = Array.from(lines.join("\n")).length;
  if (lines.length > DETAILS_MAX_LINES) return `Use at most ${DETAILS_MAX_LINES} lines (you have ${lines.length}).`;
  if (chars > DETAILS_MAX_CHARS) return `Too long: ${chars} of ${DETAILS_MAX_CHARS} characters.`;
  return null;
}

/**
 * Tidies details for printing and saving: one consistent line break, each line trimmed, blank lines dropped,
 * control characters removed, and the limits applied. The same function runs when the quotation is drawn and
 * when it is saved, so the preview, the PDF and what is stored can never disagree.
 */
export function cleanDetails(raw: unknown): string {
  if (typeof raw !== "string") return "";
  const lines = raw
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((l) => l.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim())
    .filter(Boolean)
    .slice(0, DETAILS_MAX_LINES);
  return Array.from(lines.join("\n")).slice(0, DETAILS_MAX_CHARS).join("").trimEnd();
}

/**
 * Applied as details are typed, so the box simply stops accepting more than fits: at most 6 lines and 400
 * characters. Blank lines are kept while typing (you may be about to fill one in); they are dropped when the
 * details are saved and printed.
 */
export function limitDetailsInput(raw: string): string {
  const lines = (raw ?? "").replace(/\r\n?/g, "\n").split("\n").slice(0, DETAILS_MAX_LINES);
  return Array.from(lines.join("\n")).slice(0, DETAILS_MAX_CHARS).join("");
}

/** Joins an item name and its details into the one stored string. */
export function encodeItemText(name: string, details?: string | null): string {
  const n = (name ?? "").replace(/[\r\n]+/g, " "); // a name never contains a line break: it is the first line
  const d = cleanDetails(details);
  return d ? `${n}\n${d}` : n;
}

/** Splits a stored string back into name and details. A row without a line break has no details. */
export function decodeItemText(stored: string): { description: string; details?: string } {
  const text = stored ?? "";
  const at = text.indexOf("\n");
  if (at === -1) return { description: text };
  const details = cleanDetails(text.slice(at + 1));
  return details ? { description: text.slice(0, at), details } : { description: text.slice(0, at) };
}
