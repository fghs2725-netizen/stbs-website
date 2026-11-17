/** 1 April of the financial year a date (YYYY-MM-DD) falls in. */
export function fyStart(day: string): string {
  const [y, m] = day.split("-").map(Number);
  return `${m >= 4 ? y : y - 1}-04-01`;
}

export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Visitors sometimes type their number or email into the message; neither goes to the AI. */
export const withoutContacts = (text: string) =>
  text.replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "[email]").replace(/\+?\d[\d\s-]{8,}\d/g, "[number]");
