/**
 * The four service pages and their routes: one explicit table, so a card can never
 * link to a route by list position (reordering services used to silently break links)
 * and a CMS service with an unknown slug degrades to /services instead of a 404.
 * Routes are unchanged from the live site.
 */
export type ServiceIconKey = "testing" | "drill" | "rain" | "supply" | "tubewell";

export interface ServicePage {
  slug: string;
  href: string;
  /** Short card title (matches the CMS service title). */
  title: string;
  /** Full name, for pages that have room (the /services index). */
  fullTitle: string;
  /** One-line description shown on the /services index (existing site copy). */
  summary: string;
  icon: ServiceIconKey;
}

export const SERVICE_PAGES: ReadonlyArray<ServicePage> = [
  { slug: "water-testing", href: "/water-testing", title: "Water Testing", fullTitle: "Water Testing (up to 800 m)", summary: "Ground survey up to 800 m before drilling; yield and water-quality tests after.", icon: "testing" },
  { slug: "borewell-drilling", href: "/borewell-drilling", title: "Borewell Drilling", fullTitle: "Borewell Drilling", summary: "Precision drilling planned around access, ground conditions and water requirements.", icon: "drill" },
  { slug: "rainwater-harvesting", href: "/rainwater-harvesting", title: "Rainwater Harvesting", fullTitle: "Rainwater Harvesting", summary: "Practical recharge systems for responsible rainwater management.", icon: "rain" },
  { slug: "borewell-material-supply", href: "/borewell-material-supply", title: "Material Supply", fullTitle: "Borewell Material Supply", summary: "Borewell components selected around durability and fit for the installation.", icon: "supply" },
  { slug: "tubewell-construction", href: "/tubewell-construction", title: "Tubewell Construction", fullTitle: "Tubewell Construction", summary: "Coordinated execution from planning to installation and handover.", icon: "tubewell" },
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

export const SERVICE_CARD_IMAGES: Record<string, { src: string; alt: string }> = {
  "water-testing": { src: "/services/water-testing-survey.webp", alt: "A surveyor with a resistivity meter and electrodes laid along a field, explaining the survey to a farmer" },
  "borewell-drilling": { src: "/services/borewell-rig-factory-site.webp", alt: "Crew handling drill pipe beside a truck-mounted drilling rig at a factory under construction" },
  "rainwater-harvesting": { src: "/services/rainwater-harvesting-recharge.webp", alt: "Precast concrete rings beside an excavated recharge pit at a commercial site" },
  "tubewell-construction": { src: "/services/tubewell-rig-pipes.webp", alt: "A worker carrying white uPVC casing pipe past a drilling rig at an industrial site" },
  "borewell-material-supply": { src: "/services/material-supply-yard-stock.webp", alt: "uPVC and steel casing pipes, a submersible cable drum and a row of submersible pumps in a supply yard" },
};

/** Real job order: test the ground, drill, build the tubewell, supply the materials, recharge. */
export const SERVICE_FLOW = ["water-testing", "borewell-drilling", "tubewell-construction", "borewell-material-supply", "rainwater-harvesting"];
export const SERVICE_ACCENTS: Record<string, string> = {
  "water-testing": "Survey up to 800 m before we drill.",
  "borewell-drilling": "Own rigs. 150\u2013300 mm bores.",
  "tubewell-construction": "Planned, cased and handed over.",
  "borewell-material-supply": "uPVC pipes and submersible pumps.",
  "rainwater-harvesting": "Recharge what the site sheds.",
};

