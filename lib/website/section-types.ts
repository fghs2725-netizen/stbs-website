// ─── Section type registry + field schemas for the section editor ───────────
// Each section type maps to a labeled set of structured fields. All values are
// plain JSON so they serialize cleanly in/out of the WebsiteSection.content.

export interface SectionField {
  key: string;
  label: string;
  type: "text" | "textarea" | "image" | "select" | "url" | "number";
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
}

export interface ListField {
  /** Container key in the content object, e.g. "items", "steps". */
  key: string;
  label: string;
  /** Fields each row has. One `text`/`textarea` field makes a simple label list. */
  fields: SectionField[];
}

export interface SectionTypeDef {
  label: string;
  description: string;
  fields?: SectionField[];
  lists?: ListField[];
  /** Free-form JSON textarea (e.g. structuredData). */
  json?: boolean;
}

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
  quote_form: "Quote Form",
};

export const SECTION_TYPE_DEFS: Record<string, SectionTypeDef> = {
  hero: {
    label: "Hero",
    description: "Homepage hero: badge, headline, one-line subheadline, two CTAs, duotoned photo background.",
    fields: [
      { key: "eyebrow", label: "Badge", type: "text", placeholder: "Trusted since 1992" },
      { key: "heading", label: "Headline", type: "text", placeholder: "Water infrastructure for industrial & commercial sites" },
      { key: "headingLine2", label: "Headline, second line (optional)", type: "text" },
      { key: "supportingText", label: "Subheadline (one line: services + service area)", type: "text", placeholder: "Borewell drilling, tubewell construction and rainwater recharge across Haryana & NCR." },
      { key: "primaryCtaText", label: "Primary CTA text", type: "text", placeholder: "Get a site assessment" },
      { key: "primaryCtaUrl", label: "Primary CTA URL", type: "url", placeholder: "/quote" },
      { key: "secondaryCtaText", label: "Secondary CTA text", type: "text", placeholder: "Download company profile" },
      { key: "secondaryCtaUrl", label: "Secondary CTA URL (PDF, page or tel:)", type: "url", placeholder: "/company-profile" },
      { key: "heroImage", label: "Hero photo (use a real, owned site photo of a rig)", type: "image" },
      { key: "heroImageAlt", label: "Hero photo alt text (describe what is actually visible)", type: "text" },
      { key: "mobileImage", label: "Optional mobile image", type: "image" },
    ],
  },
  page_hero: {
    label: "Page Hero",
    description: "Top banner shown at the top of interior pages.",
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text" },
      { key: "heading", label: "Heading", type: "text" },
      { key: "text", label: "Introductory text", type: "textarea" },
    ],
  },
  stats: {
    label: "Statistics Bar",
    description: "Strip of headline statistics (e.g. 34+ years).",
    lists: [
      { key: "items", label: "Statistics", fields: [{ key: "label", label: "Label", type: "text", placeholder: "Years of Experience" }, { key: "value", label: "Value", type: "text", placeholder: "34+" }] },
    ],
  },
  why_choose: {
    label: "Why Choose Us",
    description: "Grid of reasons to choose STBS.",
    fields: [{ key: "heading", label: "Heading", type: "text", placeholder: "Why choose STBS" }],
    lists: [
      { key: "items", label: "Reasons", fields: [{ key: "title", label: "Title", type: "text" }, { key: "text", label: "Text", type: "textarea" }] },
    ],
  },
  process: {
    label: "Process Steps",
    description: "Numbered step-by-step process.",
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text", placeholder: "Our process" },
      { key: "heading", label: "Heading", type: "text", placeholder: "Planned from ground level" },
      { key: "headingLine2", label: "Heading line 2", type: "text" },
      { key: "description", label: "Intro text", type: "textarea" },
    ],
    lists: [
      { key: "steps", label: "Steps", fields: [{ key: "step", label: "Step number", type: "text", placeholder: "01" }, { key: "title", label: "Title", type: "text" }, { key: "text", label: "Description", type: "textarea" }] },
    ],
  },
  services: {
    label: "Services",
    description: "Section showing published services.",
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text", placeholder: "What we do" },
      { key: "heading", label: "Heading", type: "text" },
      { key: "headingHighlight", label: "Highlighted word", type: "text" },
      { key: "description", label: "Intro text", type: "textarea" },
    ],
  },
  testimonials: {
    label: "Testimonials",
    description: "Section showing approved testimonials.",
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text" },
      { key: "heading", label: "Heading", type: "text" },
      { key: "description", label: "Intro text", type: "textarea" },
    ],
  },
  gallery: {
    label: "Gallery Preview",
    description: "Preview of published gallery photos.",
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text" },
      { key: "heading", label: "Heading", type: "text" },
      { key: "linkText", label: "Link text", type: "text", placeholder: "View gallery" },
      { key: "maxItems", label: "Max items to show", type: "number", placeholder: "6" },
    ],
  },
  cta: {
    label: "Call to Action",
    description: "Signal-coloured CTA band.",
    fields: [
      { key: "heading", label: "Heading", type: "text" },
      { key: "ctaText", label: "Button text", type: "text" },
      { key: "ctaUrl", label: "Button URL", type: "url" },
      { key: "backgroundText", label: "Background watermark", type: "text", placeholder: "1992" },
    ],
  },
  text_image: {
    label: "Text & Image",
    description: "Two-column text with image.",
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text" },
      { key: "heading", label: "Heading", type: "text" },
      { key: "headingLine2", label: "Heading line 2", type: "text" },
      { key: "body", label: "Body text", type: "textarea" },
      { key: "body2", label: "Body text 2", type: "textarea" },
      { key: "image", label: "Image", type: "image" },
      { key: "imageAlt", label: "Image alt text", type: "text" },
      { key: "layout", label: "Layout", type: "select", options: [{ value: "left-image", label: "Image left" }, { value: "right-image", label: "Image right" }, { value: "center", label: "Centered" }] },
      { key: "badgeText", label: "Badge text", type: "text" },
      { key: "badgeSubtext", label: "Badge subtext", type: "text" },
    ],
  },
  mission_vision: {
    label: "Mission & Vision",
    description: "Two columns: mission and vision.",
    fields: [
      { key: "missionEyebrow", label: "Mission eyebrow", type: "text" },
      { key: "missionHeading", label: "Mission heading", type: "text" },
      { key: "missionText", label: "Mission text", type: "textarea" },
      { key: "visionEyebrow", label: "Vision eyebrow", type: "text" },
      { key: "visionHeading", label: "Vision heading", type: "text" },
      { key: "visionText", label: "Vision text", type: "textarea" },
    ],
  },
  founder: {
    label: "Founder",
    description: "Founder profile block.",
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text" },
      { key: "heading", label: "Heading", type: "text" },
      { key: "headingLine2", label: "Heading line 2", type: "text" },
      { key: "name", label: "Founder name", type: "text" },
      { key: "title", label: "Founder title", type: "text" },
      { key: "bio", label: "Bio", type: "textarea" },
      { key: "additionalText", label: "Additional text", type: "textarea" },
      { key: "photo", label: "Photo", type: "image" },
    ],
  },
  why_stbs: {
    label: "Why STBS",
    description: "Highlight cards for building trust.",
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text" },
      { key: "heading", label: "Heading", type: "text" },
    ],
    lists: [
      { key: "items", label: "Cards", fields: [{ key: "title", label: "Title", type: "text" }, { key: "subtitle", label: "Subtitle", type: "text" }, { key: "description", label: "Description", type: "textarea" }] },
    ],
  },
  experience_culture: {
    label: "Experience & Culture",
    description: "Company story, experience and values.",
    fields: [
      { key: "heading", label: "Heading", type: "text" },
      { key: "headingLine2", label: "Heading line 2", type: "text" },
      { key: "image", label: "Image", type: "image" },
      { key: "imageAlt", label: "Image alt text", type: "text" },
      { key: "badgeText", label: "Badge text", type: "text" },
      { key: "badgeSubtext", label: "Badge subtext", type: "text" },
    ],
    lists: [
      { key: "sections", label: "Story sections", fields: [{ key: "title", label: "Section title", type: "text" }, { key: "body", label: "Body", type: "textarea" }] },
      { key: "values", label: "Core values", fields: [{ key: "value", label: "Value", type: "text" }] },
    ],
  },
  sectors: {
    label: "Client Sectors",
    description: "Grid of sectors served.",
    fields: [
      { key: "heading", label: "Heading", type: "text" },
      { key: "description", label: "Description", type: "textarea" },
    ],
    lists: [
      { key: "sectors", label: "Sectors", fields: [{ key: "name", label: "Name", type: "text" }, { key: "description", label: "Optional description", type: "textarea" }] },
    ],
  },
  featured_clients: {
    label: "Featured Clients",
    description: "Section showing featured clients from the client logo manager.",
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text" },
      { key: "heading", label: "Heading", type: "text" },
      { key: "description", label: "Description", type: "textarea" },
    ],
  },
  contact_info: {
    label: "Contact Information",
    description: "Contact details block.",
    fields: [
      { key: "heading", label: "Heading", type: "text" },
      { key: "description", label: "Description", type: "textarea" },
      { key: "ctaText", label: "CTA text", type: "text" },
      { key: "ctaUrl", label: "CTA URL", type: "url" },
    ],
  },
  map: {
    label: "Map",
    description: "Embedded Google map.",
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text" },
      { key: "embedUrl", label: "Embed URL", type: "url" },
    ],
  },
  quote_intro: {
    label: "Quote Introduction",
    description: "Intro for the quote request page.",
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text" },
      { key: "heading", label: "Heading", type: "text" },
    ],
    lists: [
      { key: "steps", label: "Steps", fields: [{ key: "step", label: "Step text", type: "text" }] },
    ],
  },
  quote_form: {
    label: "Quote Form",
    description: "Embedded quote request form. Place it after the introduction.",
  },
};