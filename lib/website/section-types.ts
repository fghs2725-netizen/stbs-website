// ─── Section type registry + field schemas for the section editor ───────────
// Each section type maps to a labeled set of structured fields. All values are
// plain JSON so they serialize cleanly in/out of the WebsiteSection.content.

export interface SectionField {
  key: string;
  label: string;
  type: "text" | "textarea" | "image" | "select" | "url" | "number";
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
  /** Recommended maximum characters for the layout. The editor shows a counter; the server rejects only above 1.5x this. */
  max?: number;
  /** When set, a present-but-blank value is rejected (a missing key falls back to the built-in default). */
  required?: boolean;
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
  sectors: "Sectors Served",
  case_studies: "Featured Projects",
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
    description: "Four headline stats on a dark band. Numeric values (34+, 1200+) count up on scroll; text values (Haryana & NCR) show as-is. Keep labels short.",
    lists: [
      { key: "items", label: "Statistics", fields: [{ key: "label", label: "Label", type: "text", placeholder: "Years in operation" }, { key: "value", label: "Value", type: "text", placeholder: "34+" }] },
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
    description: "Icon + short title cards for the published services (managed under Website -> Services). Each card opens that service's own page.",
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text", placeholder: "Services" },
      { key: "heading", label: "Heading", type: "text", placeholder: "What we deliver" },
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
    description: "Closing banner on the dark brand colour: heading, one supporting line and a single button.",
    fields: [
      { key: "heading", label: "Heading", type: "text", placeholder: "Planning a project?" },
      { key: "text", label: "Supporting line", type: "text", placeholder: "Share your site and scope. We will review it and send a written proposal." },
      { key: "ctaText", label: "Button text", type: "text", placeholder: "Request a proposal" },
      { key: "ctaUrl", label: "Button URL", type: "url", placeholder: "/quote" },
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
  case_studies: {
    label: "Featured Projects",
    description: "Project cards: sector, title, location and a one-line summary of what was delivered (the homepage shows the first three; /projects lists all). Use only facts from the client's work order or a verified result.",
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text", placeholder: "Projects" },
      { key: "heading", label: "Heading", type: "text", placeholder: "Selected projects" },
      { key: "ctaText", label: "Link text", type: "text", placeholder: "View all projects" },
      { key: "ctaUrl", label: "Link URL", type: "url", placeholder: "/projects" },
    ],
    lists: [
      {
        key: "projects",
        label: "Projects",
        fields: [
          { key: "title", label: "Project title", type: "text", placeholder: "Rainwater harvesting pit, <client>" },
          { key: "location", label: "Location", type: "text", placeholder: "Area, town" },
          { key: "sector", label: "Sector", type: "text", placeholder: "Industrial" },
          { key: "summary", label: "One line: what was delivered", type: "textarea" },
          { key: "scope", label: "Scope (one item per line, shown on /projects)", type: "textarea" },
          { key: "depth", label: "Depth (only if stated in the order)", type: "text", placeholder: "Up to 40 m" },
          { key: "output", label: "Output (only a measured, verified result)", type: "text" },
          { key: "year", label: "Year ordered (not completed)", type: "text", placeholder: "2022" },
        ],
      },
    ],
  },
  sectors: {
    label: "Sectors Served",
    description: "Icon + short label tiles (Industrial, Real estate, Government & tenders, Residential). The icon is chosen from the sector name. Keep names to a few words.",
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text", placeholder: "Sectors served" },
      { key: "heading", label: "Heading", type: "text", placeholder: "Who we build for" },
      { key: "description", label: "Intro (optional, leave empty on the homepage)", type: "textarea" },
    ],
    lists: [
      { key: "sectors", label: "Sectors", fields: [{ key: "name", label: "Name (a few words)", type: "text" }, { key: "description", label: "Optional short note (leave empty on the homepage)", type: "textarea" }] },
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
// ─── Layout limits ───────────────────────────────────────────────────────────
// Recommended maximum characters per field, keyed by section type then field key
// (list rows use "<listKey>.<fieldKey>"). Applied to SECTION_TYPE_DEFS below so
// the editor (counters) and the server (validation) read one source of truth.
const LIMITS: Record<string, Record<string, number>> = {
  hero: { eyebrow: 40, heading: 80, headingLine2: 80, supportingText: 120, primaryCtaText: 30, secondaryCtaText: 30, heroImageAlt: 150 },
  page_hero: { eyebrow: 40, heading: 80, text: 300 },
  stats: { "items.label": 50, "items.value": 20 },
  why_choose: { heading: 80, "items.title": 60, "items.text": 220 },
  process: { eyebrow: 40, heading: 80, headingLine2: 80, description: 300, "steps.step": 4, "steps.title": 60, "steps.text": 220 },
  services: { eyebrow: 40, heading: 80 },
  testimonials: { eyebrow: 40, heading: 80, description: 300 },
  gallery: { eyebrow: 40, heading: 80, linkText: 30 },
  cta: { heading: 80, text: 140, ctaText: 30 },
  text_image: { eyebrow: 40, heading: 80, headingLine2: 80, body: 800, body2: 800, imageAlt: 150, badgeText: 30, badgeSubtext: 50 },
  mission_vision: { missionEyebrow: 40, missionHeading: 80, missionText: 600, visionEyebrow: 40, visionHeading: 80, visionText: 600 },
  founder: { eyebrow: 40, heading: 80, headingLine2: 80, name: 60, title: 60, bio: 1200, additionalText: 800 },
  why_stbs: { eyebrow: 40, heading: 80, "items.title": 60, "items.subtitle": 60, "items.description": 220 },
  experience_culture: { heading: 80, headingLine2: 80, imageAlt: 150, badgeText: 30, badgeSubtext: 50, "sections.title": 60, "sections.body": 800, "values.value": 80 },
  case_studies: { eyebrow: 40, heading: 80, ctaText: 30, "projects.title": 100, "projects.location": 60, "projects.sector": 30, "projects.summary": 200, "projects.scope": 600, "projects.depth": 40, "projects.output": 80, "projects.year": 10 },
  sectors: { eyebrow: 40, heading: 80, description: 300, "sectors.name": 40, "sectors.description": 120 },
  featured_clients: { eyebrow: 40, heading: 80, description: 300 },
  contact_info: { heading: 80, description: 300, ctaText: 30 },
  map: { eyebrow: 40 },
  quote_intro: { eyebrow: 40, heading: 80, "steps.step": 100 },
};

// Fields that must not be saved blank. Only the few whose absence would leave a broken button or heading.
const REQUIRED: Record<string, string[]> = {
  hero: ["heading"],
  page_hero: ["heading"],
  cta: ["heading", "ctaText", "ctaUrl"],
};

for (const [type, def] of Object.entries(SECTION_TYPE_DEFS)) {
  const limits = LIMITS[type] ?? {};
  const required = REQUIRED[type] ?? [];
  for (const f of def.fields ?? []) {
    if (limits[f.key] !== undefined) f.max = limits[f.key];
    if (required.includes(f.key)) f.required = true;
  }
  for (const list of def.lists ?? []) {
    for (const f of list.fields) {
      const m = limits[`${list.key}.${f.key}`];
      if (m !== undefined) f.max = m;
    }
  }
}

/** Alt-text field that must be filled whenever the image field is set. Founder photo has no alt field in the section. */
export const IMAGE_ALT_FIELDS: Record<string, Record<string, string>> = {
  hero: { heroImage: "heroImageAlt", mobileImage: "heroImageAlt" },
  text_image: { image: "imageAlt" },
  experience_culture: { image: "imageAlt" },
};
