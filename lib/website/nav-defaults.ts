/**
 * Single source of truth for navigation fallbacks and filtering. Used by the header,
 * the footer, the public config resolver and the visual editor preview, so the four
 * can never drift apart again.
 */
export interface NavLink {
  label: string;
  href: string;
}

/** Main navbar, in display order. Used when no nav rows are published in the CMS. */
export const DEFAULT_NAV_LINKS: NavLink[] = [
  { label: "Services", href: "/services" },
  { label: "Clients", href: "/clients" },
  { label: "Projects", href: "/projects" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

/** Live pages that are not in the navbar but stay reachable from the footer. */
export const FOOTER_ONLY_LINKS: NavLink[] = [
  { label: "Gallery", href: "/gallery" },
];

/**
 * About is always in the navbar, even when published CMS nav rows predate it,
 * so it sits just before Contact (or last if there is no Contact link).
 */
export function ensureAboutLink(links: NavLink[]): NavLink[] {
  if (links.some((l) => l.href === "/about")) return links;
  const about: NavLink = { label: "About", href: "/about" };
  const at = links.findIndex((l) => l.href === "/contact");
  return at === -1 ? [...links, about] : [...links.slice(0, at), about, ...links.slice(at)];
}

/** The four service pages all belong to the "Services" nav item. */
const SERVICE_PATHS = ["/services", "/borewell-drilling", "/rainwater-harvesting", "/borewell-material-supply", "/tubewell-construction"];

/** Never render admin links or the quote page (that is the CTA button) as nav items. */
export function isPublicNavLink(l: NavLink): boolean {
  const label = l.label.trim().toLowerCase();
  return l.href.startsWith("/") && !l.href.startsWith("/admin") && !l.href.startsWith("/quote") && label !== "admin" && !label.includes("quote") && !label.includes("proposal");
}

export function isActiveNavLink(href: string, pathname: string): boolean {
  if (href === "/services") return SERVICE_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  return pathname === href || pathname.startsWith(`${href}/`);
}
