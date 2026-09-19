/**
 * Default section content for interior pages. Shared by the seed (prisma/seed-website.ts) and by
 * each page's static fallback (used only when no published CMS page exists), so the copy has one
 * definition. The fallbacks render these through the same section renderers as the CMS.
 */
import { clients, company, founderBio, founderName, founderTitle } from "./../company";
import { logoFor } from "./client-logos";

export interface DefaultSection {
  type: string;
  name: string;
  position: number;
  content: Record<string, unknown>;
}

export const ABOUT_SECTIONS: DefaultSection[] = [
  {
    type: "page_hero",
    name: "Page hero",
    position: 0,
    content: {
      eyebrow: "Our company",
      heading: "Built from the ground down.",
      text: "Saini Tubewell Boring Service was established in 1992 and has grown as a trusted provider of borewell, material supply and rainwater harvesting services.",
    },
  },
  {
    type: "text_image",
    name: "Company intro",
    position: 1,
    content: {
      eyebrow: "34 years in the field",
      heading: "Know the ground.",
      headingLine2: "Respect the work.",
      body: "Our experience spans rainwater harvesting, borewells from 100 mm to 400 mm, quality borewell material supply and complete tubewell construction.",
      body2: "We focus on quality materials at reasonable rates, timely work and follow-up support to ensure supplied equipment runs efficiently and is serviced on time.",
      image: "/site_pic.jpeg",
      imageAlt: "Worker in a ringed concrete pit guiding a pipe above a gravel bed",
      layout: "right-image",
      badgeText: "1992",
      badgeSubtext: "Established",
    },
  },
  {
    type: "mission_vision",
    name: "Mission & vision",
    position: 2,
    content: {
      missionEyebrow: "Our mission",
      missionHeading: "Quality that endures.",
      missionText: company.mission,
      visionEyebrow: "Our vision",
      visionHeading: "A safer community.",
      visionText: company.vision,
    },
  },
  {
    type: "why_stbs",
    name: "What sets us apart",
    position: 3,
    content: {
      eyebrow: "Why STBS",
      heading: "What sets us apart",
      items: [
        { title: "34+ Years", subtitle: "Field experience", description: "34 years of hands-on expertise in water infrastructure." },
        { title: "1200+ Projects", subtitle: "Completed work", description: "Proven track record across residential and industrial sites." },
        { title: "20+ Clients", subtitle: "Named clients", description: "Industrial, commercial and institutional sites across Haryana." },
      ],
    },
  },
  {
    type: "founder",
    name: "Founder",
    position: 4,
    content: {
      eyebrow: "Leadership",
      heading: "Field-First",
      headingLine2: "Leadership",
      name: founderName,
      title: founderTitle,
      bio: founderBio,
      additionalText: `Rajesh Saini established Saini Tubewell Boring Service in 1992 with a commitment to providing Haryana and Delhi NCR with dependable water access solutions. Under his guidance, the company has completed over 1,200 projects while maintaining rigorous quality standards and pricing integrity.`,
      photo: "/founder/rajesh-saini.jpeg",
    },
  },
  {
    type: "experience_culture",
    name: "Experience & culture",
    position: 5,
    content: {
      heading: "34 years",
      headingLine2: "of expertise.",
      image: "/Site_pic_2.jpeg",
      imageAlt: "Crew lowering precast concrete rings into a trench beside a drilling rig",
      badgeText: "1992",
      badgeSubtext: "Established",
      sections: [
        {
          title: "Our Story",
          body: "Saini Tubewell Boring Service was founded in 1992 with a simple mission: to provide dependable water infrastructure across Haryana. Starting as a one-man operation, we've grown to a professional team trusted by businesses and communities alike.",
        },
        {
          title: "Our Experience",
          body: "From rainwater harvesting systems to deep borewell drilling, we've completed over 1200 projects. Our experience spans 100mm to 400mm borewells, complete tubewell construction, and modern recharge systems built for challenging local conditions.",
        },
      ],
      values: [
        { value: "Quality materials at competitive rates" },
        { value: "Follow-up support and maintenance" },
        { value: "Site discipline and professional coordination" },
      ],
    },
  },
];

export const CLIENTS_SECTIONS: DefaultSection[] = [
  {
    type: "page_hero",
    name: "Page hero",
    position: 0,
    content: {
      eyebrow: "Who we serve",
      heading: "Grounded partnerships.",
      text: "Our service model supports diverse water infrastructure requirements with the same focus on practical planning and dependable execution.",
    },
  },
  {
    type: "sectors",
    name: "Sectors",
    position: 1,
    content: {
      heading: "Built to support every kind of site.",
      description:
        "From individual properties to operational facilities, our work begins by understanding the requirement, access, ground conditions and intended use.",
      sectors: [
        { name: "Residential", description: "Homes, plots and individual properties." },
        { name: "Agriculture", description: "Farms, orchards and irrigation needs." },
        { name: "Commercial", description: "Businesses, retail and offices." },
        { name: "Industrial", description: "Factories, plants and process water." },
        { name: "Institutional", description: "Schools, hospitals and campuses." },
        { name: "Infrastructure", description: "Township and municipal water works." },
      ],
    },
  },
  {
    type: "featured_clients",
    name: "Featured clients",
    position: 2,
    content: {
      eyebrow: "Selected partners",
      heading: "Trusted on demanding sites.",
      description:
        "A selection of organisations supported by Saini Tubewell across institutional, industrial, food and technology environments.",
    },
  },
  {
    type: "testimonials",
    name: "Testimonials",
    position: 3,
    content: {
      eyebrow: "Client voices",
      heading: "What they say",
      description: "Project feedback gathered from work across Haryana and NCR.",
    },
  },
];

/** Client rows for the /clients fallback: the owner's list plus the staged logos (shape matches CmsClient). */
export function fallbackClientRows() {
  return clients.map((name, i) => {
    const logo = logoFor(name);
    return { id: "fallback-" + i, name, logoUrl: logo?.logoUrl ?? null, altText: logo?.altText ?? null, websiteUrl: null, sector: null, description: null, featured: false, position: i };
  });
}
