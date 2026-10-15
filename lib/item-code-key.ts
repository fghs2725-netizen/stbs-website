/**
 * The key a saved HSN/SAC code is matched on. Quotation lines carry their size in the wording
 * ("Drilling of 300 mm dia borewell"), so the same item at 160, 250 or 300 mm is one item with one
 * code. Every number becomes "#" and the rest is compared case-insensitively with spaces collapsed:
 * "Drilling of 300 mm dia borewell" and "drilling of  250 MM dia borewell" share a key. Words are
 * never touched, so a pipe and a cable stay different items.
 */
export function itemCodeKey(description: string): string {
  return (description ?? "")
    .toLowerCase()
    .replace(/\d+(?:[.,]\d+)*/g, "#")
    .replace(/[″”“′]/g, '"') // typographic inch marks
    .replace(/\s+/g, " ")
    .replace(/[\s.,;:]+$/g, "")
    .trim();
}

type Saved = { description: string; hsn: string; unit: string | null };

/**
 * The saved code for a line: an exact name wins; otherwise the code saved for the same item at any
 * size. If sizes of the item were saved with different codes the answer is ambiguous, so none is
 * returned (a blank code is visible; a wrong one on an invoice is not).
 */
export function findItemCode(description: string, saved: Saved[]): Saved | undefined {
  const exact = description.trim().toLowerCase();
  const direct = saved.find((s) => s.description.trim().toLowerCase() === exact);
  if (direct) return direct;
  const key = itemCodeKey(description);
  if (!key) return undefined;
  const sameItem = saved.filter((s) => itemCodeKey(s.description) === key);
  if (!sameItem.length) return undefined;
  return new Set(sameItem.map((s) => s.hsn)).size === 1 ? sameItem[0] : undefined;
}
