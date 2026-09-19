/**
 * The four service pages and their routes: one explicit table, so a card can never
 * link to a route by list position (reordering services used to silently break links)
 * and a CMS service with an unknown slug degrades to /services instead of a 404.
 * Routes are unchanged from the live site.
 */
export type ServiceIconKey = "drill" | "rain" | "supply" | "tubewell";

export interface ServicePage {
  slug: string;
  href: string;
  /** Short card title (matches the CMS service title). */
  title: string;
  icon: ServiceIconKey;
}

export const SERVICE_PAGES: ReadonlyArray<ServicePage> = [
  { slug: "borewell-drilling", href: "/borewell-drilling", title: "Borewell Drilling", icon: "drill" },
  { slug: "rainwater-harvesting", href: "/rainwater-harvesting", title: "Rainwater Harvesting", icon: "rain" },
  { slug: "borewell-material-supply", href: "/borewell-material-supply", title: "Material Supply", icon: "supply" },
  { slug: "tubewell-construction", href: "/tubewell-construction", title: "Tubewell Construction", icon: "tubewell" },
];

/** CMS slugs are stored bare ("borewell-drilling"); accept a leading slash too. */
function clean(slug: string | null | undefined): string {
  return (slug ?? "").trim().replace(/^\/+/, "").replace(/\/+$/, "");
}

export function servicePageFor(slug: string | null | undefined): ServicePage | undefined {
  const s = clean(slug);
  return SERVICE_PAGES.find((p) => p.slug === s);
}

/** Route for a service card: its dedicated page, or the services index if it has none. */
export function serviceHref(slug: string | null | undefined): string {
  return servicePageFor(slug)?.href ?? "/services";
}
