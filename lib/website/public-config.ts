import { getPublishedNavigation, getPublishedSettings } from "@/lib/website/queries";
import { company } from "@/lib/company";
import type { CmsSettings } from "@/components/public/sections";

const DEFAULT_LINKS = [
  { label: "About", href: "/about" },
  { label: "Services", href: "/services" },
  { label: "Clients", href: "/clients" },
  { label: "Gallery", href: "/gallery" },
  { label: "Contact", href: "/contact" },
];

export interface PublicSiteConfig {
  navLinks: Array<{ label: string; href: string }>;
  settings: CmsSettings;
  phone: string;
}

/**
 * Resolution rules (single source of truth for CMS-driven contact/brand data):
 *
 *  - No CMS settings row at all      → "not configured" → static fallback may be used.
 *  - Field explicitly set to a value → use that value.
 *  - Field explicitly empty / null   → intentionally cleared → stay blank. A hardcoded
 *    value is NEVER silently restored after an admin clears it.
 *
 * An address, city, state or business hours are never inferred or constructed here.
 */
export async function getPublicSiteConfig(): Promise<PublicSiteConfig> {
  const [nav, settings] = await Promise.all([
    getPublishedNavigation(),
    getPublishedSettings(),
  ]);

  const s = resolveSettings((settings ?? null) as Record<string, unknown> | null);
  const phone = primaryPhone(s);

  const navItems = Array.isArray(nav)
    ? (nav as unknown[]).map(item => ({
        label: String((item as { label?: unknown }).label ?? ""),
        href: String((item as { url?: unknown }).url ?? ""),
      })).filter(n => n.label && n.href.startsWith("/"))
    : [];

  return {
    navLinks: navItems.length > 0 ? navItems : DEFAULT_LINKS,
    settings: s,
    phone,
  };
}

export function resolveSettings(raw: Record<string, unknown> | null): CmsSettings {
  if (!raw) {
    return {
      businessName: company.name,
      shortDescription: company.description,
      phone: company.phones[0],
      phone2: company.phones[1],
      whatsapp: company.phones[0],
      email: company.email,
      founderName: company.managingDirector,
      founderTitle: "Founder & Managing Director",
      founderBio: null,
    };
  }
  return {
    businessName: field(raw, "businessName", company.name),
    shortDescription: field(raw, "shortDescription", company.description),
    phone: field(raw, "phone", company.phones[0]),
    phone2: field(raw, "phone2", company.phones[1]),
    whatsapp: field(raw, "whatsapp", company.phones[0]),
    email: field(raw, "email", company.email),
    address: field(raw, "addressLine1", ""),
    city: field(raw, "city", ""),
    state: field(raw, "state", ""),
    founderName: field(raw, "founderName", company.managingDirector),
    founderTitle: field(raw, "founderTitle", "Founder & Managing Director"),
    founderBio: field(raw, "founderBio", ""),
    primaryLogoUrl: field(raw, "primaryLogoUrl", ""),
    lightLogoUrl: field(raw, "lightLogoUrl", ""),
    darkLogoUrl: field(raw, "darkLogoUrl", ""),
    mobileLogoUrl: field(raw, "mobileLogoUrl", ""),
  };
}

/**
 * Returns
 *   - value   : when `key` is present in the object and is a non-empty string,
 *   - ``       : when `key` is present but empty/null ("intentionally cleared"),
 *   - fallback : when the object is absent or the key was never configured.
 */
export function field(c: Record<string, unknown>, key: string, fallback: string): string {
  if (!(key in c)) return fallback;
  const v = c[key];
  if (typeof v !== "string") return "";
  const trimmed = v.trim();
  return trimmed.length > 0 ? trimmed : "";
}

export function primaryPhone(s: CmsSettings): string {
  if (s.whatsapp && s.whatsapp.length > 0) return s.whatsapp;
  if (s.phone && s.phone.length > 0) return s.phone;
  return "";
}
