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
  secondaryCtaText: "Download company profile",
  // Placeholder route (app/company-profile/route.ts). When the real capability statement
  // exists, upload it as public/docs/stbs-company-profile.pdf and point this URL at
  // /docs/stbs-company-profile.pdf in Website -> Home -> Hero (no code change needed).
  secondaryCtaUrl: "/company-profile",
  heroImage: "/stbs-drilling-rig-real.png",
  heroImageAlt: "STBS borewell drilling rig on an industrial site, with two crew members in safety gear beside stacked casing pipes",
} as const;
