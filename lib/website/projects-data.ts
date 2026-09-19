/**
 * Featured projects: the default data, the CMS content shape, and the parser both the
 * homepage section and /projects use. The list lives in the CMS (home -> Featured Projects),
 * so the owner edits it in one place; these defaults seed it and back it up.
 *
 * SOURCE: four client-issued documents supplied by the owner (BigBasket PO, two Sobha work
 * orders for Ashoka University, EOC Polymers PO). Only publishable facts are used: place, year,
 * sizes and scope as ORDERED. Deliberately excluded: order values/rates, PAN/GSTIN, bank
 * details, client staff names/phones/emails, and commercial terms.
 *
 * The documents state ordered scope, not outcomes, so `summary` describes what was scoped
 * and there is no `outcome` until the owner supplies verified results (yield, handover date).
 */
export interface ProjectCase {
  /** Where the work was done: area + town. */
  location: string;
  /** Sector as a short label (matches the sectors served tiles where possible). */
  sector: string;
  title: string;
  /** One line shown on the homepage card: what was delivered. */
  summary: string;
  /** Optional detail for /projects, one item per line. */
  scope?: string;
  /** Optional, e.g. "Up to 40 m". Only when the documents state a depth. */
  depth?: string;
  /** Optional, e.g. a measured yield. None of the source documents state one. */
  output?: string;
  /** Optional year the work was ORDERED (the documents give order dates, not completion dates). */
  year?: string;
}

export const PROJECTS: ReadonlyArray<ProjectCase> = [
  {
    title: "Rainwater harvesting system, BigBasket distribution centre",
    location: "Kundli, Sonipat",
    sector: "Warehousing & distribution",
    summary: "220 ft of 250 mm drilling with 225 mm PVC pipe, gravel pack and bore cleaning by heavy-duty pump.",
    scope: [
      "250 mm borewell drilling, 220 ft",
      "225 mm PVC pipe, 10 kg/cm² pressure rating",
      "Filter assembly with fittings and end caps",
      "Gravel pack, 200 ft",
      "Bore cleaning with machine and heavy-duty pump",
    ].join("\n"),
    year: "2022",
  },
  {
    title: "Rainwater harvesting boreholes, Ashoka University North Campus",
    location: "Rajiv Gandhi Education City, Sonipat",
    sector: "Institutional campus",
    summary: "Four sets of paired 300 mm percolation boreholes, up to 40 m deep, with slotted UPVC casing and pea-gravel pack.",
    scope: [
      "Two boreholes per recharge pit, 300 mm, reverse rotary drilling in all soil types",
      "Slotted UPVC casing, 6 kg/cm² (IS 12818 perforated slotted)",
      "Pea-gravel pack, 3–6 mm, around the casing",
      "Rig mobilisation and site restoration on completion",
      "Ordered across two work orders, July and December 2022",
    ].join("\n"),
    depth: "Up to 40 m",
    year: "2022",
  },
  {
    title: "Rainwater harvesting pit, EOC Polymers",
    location: "HSIIDC Industrial Estate, Barhi, Sonipat",
    sector: "Industrial",
    summary: "80 m of 300 mm drilling with 225 mm PVC pipe, gravel pack and a 5.5 × 9 ft recharge pit including civil works.",
    scope: [
      "300 mm borewell drilling, 80 m",
      "225 mm PVC pipe, about 216 ft",
      "Filter assembly and gravel pack (4–6 mm, 250 ft)",
      "Bore cleaning with machine and heavy-duty pump",
      "Recharge pit 5.5 × 9 ft with labour, material and civil work",
    ].join("\n"),
    year: "2022",
  },
];

export const HOME_PROJECTS = {
  eyebrow: "Projects",
  heading: "Selected projects",
  ctaText: "View all projects",
  ctaUrl: "/projects",
} as const;

const s = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

/** Parse CMS `projects` list rows; drop rows without the two required fields (title, location). */
export function parseProjects(raw: unknown): ProjectCase[] {
  if (!Array.isArray(raw)) return [];
  const out: ProjectCase[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const title = s(r.title);
    const location = s(r.location);
    if (!title || !location) continue;
    out.push({
      title,
      location,
      sector: s(r.sector),
      summary: s(r.summary),
      ...(s(r.scope) ? { scope: s(r.scope) } : {}),
      ...(s(r.depth) ? { depth: s(r.depth) } : {}),
      ...(s(r.output) ? { output: s(r.output) } : {}),
      ...(s(r.year) ? { year: s(r.year) } : {}),
    });
  }
  return out;
}

/** CMS rows if any are valid, otherwise the built-in defaults. */
export function resolveProjects(raw: unknown): ProjectCase[] {
  const parsed = parseProjects(raw);
  return parsed.length > 0 ? parsed : [...PROJECTS];
}

/** Scope text -> bullet lines. */
export function scopeLines(scope: string | undefined): string[] {
  return (scope ?? "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
}
