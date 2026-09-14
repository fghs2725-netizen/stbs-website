// ─── Section Content Types ───────────────────────────────────────────────────
// Each type defines the structured JSON content for a WebsiteSection.type value.

export interface HeroContent {
  eyebrow?: string;
  heading?: string;
  headingLine2?: string;
  supportingText?: string;
  primaryCtaText?: string;
  primaryCtaUrl?: string;
  secondaryCtaText?: string;
  secondaryCtaUrl?: string;
  heroImage?: string;
  heroImageAlt?: string;
  mobileImage?: string;
}

export interface StatsContent {
  items: Array<{ label: string; value: string }>;
}

export interface WhyChooseContent {
  heading?: string;
  items: Array<{ title: string; text: string }>;
}

export interface ProcessContent {
  eyebrow?: string;
  heading?: string;
  headingLine2?: string;
  description?: string;
  steps: Array<{ step: string; title: string; text: string }>;
}

export interface ServicesSectionContent {
  eyebrow?: string;
  heading?: string;
  headingHighlight?: string;
  description?: string;
}

export interface TestimonialsSectionContent {
  eyebrow?: string;
  heading?: string;
  description?: string;
}

export interface GallerySectionContent {
  eyebrow?: string;
  heading?: string;
  linkText?: string;
  maxItems?: number;
}

export interface CtaContent {
  heading?: string;
  ctaText?: string;
  ctaUrl?: string;
  backgroundText?: string;
}

export interface TextImageContent {
  eyebrow?: string;
  heading?: string;
  headingLine2?: string;
  body?: string;
  body2?: string;
  image?: string;
  imageAlt?: string;
  layout?: "left-image" | "right-image" | "center";
  badgeText?: string;
  badgeSubtext?: string;
}

export interface MissionVisionContent {
  missionEyebrow?: string;
  missionHeading?: string;
  missionText?: string;
  visionEyebrow?: string;
  visionHeading?: string;
  visionText?: string;
}

export interface FounderContent {
  eyebrow?: string;
  heading?: string;
  headingLine2?: string;
  bio?: string;
  additionalText?: string;
  name?: string;
  title?: string;
  photo?: string;
}

export interface WhyStbsContent {
  eyebrow?: string;
  heading?: string;
  items: Array<{ title: string; subtitle: string; description: string }>;
}

export interface ExperienceCultureContent {
  heading?: string;
  headingLine2?: string;
  sections: Array<{ title: string; body: string }>;
  values: string[];
  image?: string;
  imageAlt?: string;
  badgeText?: string;
  badgeSubtext?: string;
}

export interface SectorsSectionContent {
  heading?: string;
  description?: string;
  sectors: Array<{ name: string; icon?: string; description?: string }>;
}

export interface FeaturedClientsContent {
  eyebrow?: string;
  heading?: string;
  description?: string;
}

export interface ContactInfoContent {
  heading?: string;
  description?: string;
  ctaText?: string;
  ctaUrl?: string;
}

export interface MapContent {
  eyebrow?: string;
  embedUrl?: string;
}

export interface QuoteIntroContent {
  eyebrow?: string;
  heading?: string;
  steps: string[];
}

export interface PageHeroContent {
  eyebrow?: string;
  heading?: string;
  text?: string;
}

// ─── Section Type Registry ───────────────────────────────────────────────────

export const SECTION_TYPES: Record<string, string> = {
  hero: "Hero",
  page_hero: "Page Hero",
  stats: "Statistics Bar",
  why_choose: "Why Choose Us",
  process: "Process Steps",
  services: "Services",
  testimonials: "Testimonials",
  gallery: "Gallery Preview",
  cta: "Call to Action",
  text_image: "Text & Image",
  mission_vision: "Mission & Vision",
  founder: "Founder",
  why_stbs: "Why STBS",
  experience_culture: "Experience & Culture",
  sectors: "Client Sectors",
  featured_clients: "Featured Clients",
  contact_info: "Contact Information",
  map: "Map",
  quote_intro: "Quote Introduction",
};

// ─── Serialization ───────────────────────────────────────────────────────────
// Converts Prisma objects (with Date, BigInt, Decimal) into plain JSON-safe objects
// for passing across the server/client boundary.

export function serialize<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );
}
