/**
 * Homepage content defaults — the single definition used by the CMS renderer's
 * fallbacks, the seed data and scripts/migrate-homepage.ts, so they cannot drift.
 * Only facts already in the repo (lib/company.ts) appear here; anything else is a
 * clearly marked placeholder.
 */
export const HOME_HERO = {
  eyebrow: "Trusted since 1992",
  heading: "Water infrastructure for industrial & commercial sites",
  headingLine2: "",
  supportingText: "Borewell drilling, tubewell construction and rainwater recharge across Haryana & NCR.",
  primaryCtaText: "Get a site assessment",
  primaryCtaUrl: "/quote",
  // No company profile PDF exists yet (owner, 2026-09-19), so there is no secondary button.
  // To add one later: upload public/docs/stbs-company-profile.pdf and set these two fields in Website -> Home -> Hero.
  secondaryCtaText: "",
  secondaryCtaUrl: "",
  heroImage: "/hero/stbs-drilling-rig-site.webp",
  heroImageAlt: "STBS borewell drilling rig on an industrial site, with two crew members in safety gear beside stacked casing pipes",
} as const;

/**
 * Stats strip. 34 = 2026 - 1992. "20+" comes from the owner's own client list (20 named
 * clients, described as "some of my clients"); it spans industrial, commercial and
 * institutional sites, so the label says so rather than claiming "commercial & industrial" only.
 */
export const HOME_STATS = [
  { value: "34+", label: "Years in operation" },
  { value: "1200+", label: "Projects completed" },
  { value: "20+", label: "Industrial, commercial & institutional clients" },
  { value: "Haryana & NCR", label: "Service area" },
] as const;

/** Sectors served: icon + short label only (no descriptions). Residential is one tile, styled like the rest. */
export const HOME_SECTORS = {
  eyebrow: "Sectors served",
  heading: "Who we build for",
  sectors: [{ name: "Industrial" }, { name: "Real estate" }, { name: "Government & tenders" }, { name: "Residential" }],
} as const;

/** Services cards: icon + short title only. Titles/links come from lib/website/service-pages.ts. */
export const HOME_SERVICES = {
  eyebrow: "Services",
  heading: "What we deliver",
} as const;

/** Closing CTA banner. The supporting line makes no promise about turnaround or price. */
export const HOME_CTA = {
  heading: "Planning a project?",
  text: "Share your site and scope. We will review it and send a written proposal.",
  ctaText: "Request a proposal",
  ctaUrl: "/quote",
} as const;
