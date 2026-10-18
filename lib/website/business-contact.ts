/** Owner-selected website contact order. Business-document contacts are configured separately. */
export const WEBSITE_PHONES = ["7988814808", "9812003001", "8708128632"];
export const PRIMARY_WEBSITE_PHONE = WEBSITE_PHONES[0];

const LEGACY_PRIMARY = "9812003001";
const mobileDigits = (value: string) => value.replace(/\D/g, "").replace(/^(?:91|0)(?=\d{10}$)/, "");

/**
 * Older published CMS snapshots still select the former primary. Upgrade only that known value;
 * intentionally cleared fields, secondary numbers and other admin-selected contacts stay intact.
 * This compatibility read does not write to the CMS or change historical documents.
 */
export function currentPrimaryPhone(value: string): string {
  return mobileDigits(value) === LEGACY_PRIMARY ? PRIMARY_WEBSITE_PHONE : value;
}

export function currentBusinessSettings<T extends Record<string, unknown>>(settings: T): T {
  const next = { ...settings };
  for (const key of ["phone", "whatsapp"] as const) {
    if (typeof settings[key] === "string") Object.assign(next, { [key]: currentPrimaryPhone(settings[key]) });
  }
  return next;
}

/** Only used for business metadata, not arbitrary CMS text or customer records. */
export function currentBusinessContactText(value: string): string {
  // A list already containing the current primary can legitimately retain the former number.
  if (/79888[\s.-]*14808/.test(value)) return value;
  return value.replace(/(?<!\d)(?:\+?91[\s.-]*)?98120[\s.-]*03001(?!\d)/g, (old) => {
    const country = old.replace(/\D/g, "").startsWith("91");
    const formatted = /\s/.test(old) ? "79888 14808" : /-/.test(old) ? "79888-14808" : PRIMARY_WEBSITE_PHONE;
    return country ? `${old.startsWith("+") ? "+" : ""}91${/\s/.test(old) ? " " : ""}${formatted}` : formatted;
  });
}

/** Update only an old business call/WhatsApp destination, leaving other links untouched. */
export function currentBusinessCtaUrl(value: string): string {
  if (value.startsWith("tel:") && mobileDigits(value.slice(4)) === LEGACY_PRIMARY) return `tel:+91${PRIMARY_WEBSITE_PHONE}`;
  if (/^https:\/\/(?:wa\.me|api\.whatsapp\.com)\//i.test(value)) {
    const url = new URL(value);
    if (url.hostname === "wa.me" && mobileDigits(url.pathname.slice(1)) === LEGACY_PRIMARY) url.pathname = `/91${PRIMARY_WEBSITE_PHONE}`;
    if (url.hostname === "api.whatsapp.com" && mobileDigits(url.searchParams.get("phone") ?? "") === LEGACY_PRIMARY) url.searchParams.set("phone", `91${PRIMARY_WEBSITE_PHONE}`);
    return url.toString();
  }
  return value;
}

/** Published public section links only. Phone lists and visible secondary contact text are untouched. */
export function currentBusinessCtaLinks<T>(value: T): T {
  if (Array.isArray(value)) return value.map(currentBusinessCtaLinks) as T;
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [
    key,
    typeof item === "string" && /(?:url|href)$/i.test(key) ? currentBusinessCtaUrl(item) : currentBusinessCtaLinks(item),
  ])) as T;
}

