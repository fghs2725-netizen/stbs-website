/** Ten-digit Indian mobile number from any common input ("+91 98120-03001", "9812003001"). */
function digits(raw: string): string {
  return raw.replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "");
}

/** "9812003001" -> "+91 98120 03001" (falls back to the input if it is not a 10-digit number). */
export function formatIndianPhone(raw: string): string {
  const d = digits(raw);
  return d.length === 10 ? `+91 ${d.slice(0, 5)} ${d.slice(5)}` : raw;
}

export function telHref(raw: string): string {
  const d = digits(raw);
  return d.length === 10 ? `tel:+91${d}` : `tel:${raw.replace(/[^\d+]/g, "")}`;
}
