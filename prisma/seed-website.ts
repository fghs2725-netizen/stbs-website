/**
 * Website CMS — content migration seed.
 *
 * Migrates the existing static content (lib/company.ts + the public pages)
 * into the Website CMS tables so the admin can take over with one click.
 *
 * Rules:
 *  - Pages and Services are created as DRAFT: the live site is untouched
 *    until an admin publishes them from the Website CMS.
 *  - Clients and Nav items are created as DRAFT too. They become visible
 *    only after an admin explicitly publishes them.
 *  - No testimonials are seeded. Quotes require real approvals, so existing
 *    testimonials in the database must be verified and set to
 *    APPROVED + Visible before anything appears on the public site.
 *  - Nav items, Settings and SEO are written only when missing. Settings are
 *    limited to verified facts from lib/company.ts; addresses, city, state and
 *    business hours are NOT administered here.
 *  - No gallery items are seeded. Project photography must be uploaded,
 *    reviewed and published by an admin.
 *  - Re-running the seed never overwrites admin edits.
 */

import { PrismaClient, Prisma } from "@prisma/client";
import {
  company,
  services as staticServices,
  clients as staticClients,
  trustItems,
  whyChoose,
  processSteps,
  founderBio,
  founderName,
  founderTitle,
} from "../lib/company";

const prisma = new PrismaClient();

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

async function seedPages() {
  const pageSpecs: Array<{
    slug: string;
    name: string;
    title: string;
    seoTitle: string;
    metaDescription: string;
    sections: Array<{ type: string; name: string; position: number; content: Record<string, unknown> }>;
  }> = [
    {
      slug: "home",
      name: "Home",
      title: "Home",
      seoTitle: "Saini Tubewell Boring Service | Since 1992",
      metaDescription:
        "Professional borewell drilling, rainwater harvesting, borewell material supply and tubewell construction services since 1992.",
      sections: [
        {
          type: "hero",
          name: "Hero",
          position: 0,
          content: {
            eyebrow: "Trusted since 1992",
            heading: "Go deeper.",
            headingLine2: "Build stronger.",
            supportingText: company.tagline,
            primaryCtaText: "Request a proposal",
            primaryCtaUrl: "/quote",
            secondaryCtaText: "Call now",
            secondaryCtaUrl: `tel:+91${company.phones[0]}`,
            heroImage: "/hero-industrial-cross-section.png",
            heroImageAlt:
              "Industrial site with a borewell cross-section showing groundwater layers",
          },
        },
        {
          type: "why_choose",
          name: "Why choose STBS",
          position: 1,
          content: {
            heading: "Why choose STBS",
            items: whyChoose.map((w) => ({ title: w.title, text: w.text })),
          },
        },
        {
          type: "stats",
          name: "Statistics",
          position: 2,
          content: {
            items: trustItems.map((t) => ({ label: t.label, value: t.value })),
          },
        },
        {
          type: "process",
          name: "Process",
          position: 3,
          content: {
            eyebrow: "Our process",
            heading: "Planned from",
            headingLine2: "ground level",
            description:
              "Every project follows a clear sequence with attention to site realities and practical execution.",
            steps: processSteps.map((p) => ({
              step: p.step,
              title: p.title,
              text: p.text,
            })),
          },
        },
        {
          type: "services",
          name: "Services",
          position: 4,
          content: {
            eyebrow: "What we do",
            heading: "Complete water",
            headingHighlight: "infrastructure",
            description:
              "From the first site assessment to final construction and supply, every service is delivered with field discipline and practical expertise.",
          },
        },
        {
          type: "testimonials",
          name: "Testimonials",
          position: 5,
          content: {
            eyebrow: "Client voices",
            heading: "What they say",
            description: "Project feedback gathered from work across Haryana and NCR.",
          },
        },
        {
          type: "gallery",
          name: "Gallery preview",
          position: 6,
          content: {
            eyebrow: "From the field",
            heading: "Work in motion",
            linkText: "View gallery",
            maxItems: 6,
          },
        },
        {
          type: "cta",
          name: "Call to action",
          position: 7,
          content: {
            heading: "Let us get your project moving.",
            ctaText: "Request a proposal",
            ctaUrl: "/quote",
            backgroundText: "1992",
          },
        },
      ],
    },
    {
      slug: "about",
      name: "About",
      title: "About",
      seoTitle: "About | Saini Tubewell",
      metaDescription:
        "Learn about Saini Tubewell Boring Service, providing professional water infrastructure services since 1992.",
      sections: [
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
            imageAlt: "Industrial engineer at work",
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
              { title: "100% Focus", subtitle: "Quality commitment", description: "Attention to detail from survey through installation." },
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
            imageAlt: "Professional drilling team at work",
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
      ],
    },
    {
      slug: "services",
      name: "Services",
      title: "Services",
      seoTitle: "Services | Saini Tubewell",
      metaDescription:
        "Borewell drilling, rainwater harvesting, borewell material supply and tubewell construction services.",
      sections: [
        {
          type: "page_hero",
          name: "Page hero",
          position: 0,
          content: {
            eyebrow: "Capabilities",
            heading: "One partner. Four core services.",
            text: "Integrated support for drilling, water conservation, material requirements and tubewell construction.",
          },
        },
        {
          type: "services",
          name: "Services",
          position: 1,
          content: {
            eyebrow: "What we do",
            heading: "Integrated support.",
            headingHighlight: "End to end.",
            description:
              "From the first site assessment to final construction and supply, every service is delivered with field discipline and practical expertise.",
          },
        },
        {
          type: "cta",
          name: "Call to action",
          position: 2,
          content: {
            heading: "Discuss your site requirements.",
            ctaText: "Request a proposal",
            ctaUrl: "/quote",
            backgroundText: "1992",
          },
        },
      ],
    },
    {
      slug: "clients",
      name: "Clients",
      title: "Clients",
      seoTitle: "Clients | Saini Tubewell",
      metaDescription:
        "Water infrastructure support for residential, agricultural, commercial, institutional and industrial requirements.",
      sections: [
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
      ],
    },
    {
      slug: "gallery",
      name: "Gallery",
      title: "Gallery",
      seoTitle: "Gallery | Saini Tubewell",
      metaDescription:
        "Proof of work: images of drilling, installation, and completed projects from our field operations.",
      sections: [
        {
          type: "page_hero",
          name: "Page hero",
          position: 0,
          content: {
            eyebrow: "Our work",
            heading: "Proof in practice.",
            text: "Every image captures real projects, real equipment, and real results across Haryana and NCR.",
          },
        },
        {
          type: "gallery",
          name: "Gallery",
          position: 1,
          content: {
            eyebrow: "From the field",
            heading: "Work in motion",
            linkText: "View gallery",
            maxItems: 12,
          },
        },
      ],
    },
    {
      slug: "contact",
      name: "Contact",
      title: "Contact",
      seoTitle: "Contact | Saini Tubewell",
      metaDescription:
        "Contact Saini Tubewell Boring Service to discuss borewell and tubewell requirements. Call, email, or request a proposal.",
      sections: [
        {
          type: "page_hero",
          name: "Page hero",
          position: 0,
          content: {
            eyebrow: "Contact",
            heading: "Start with the requirement.",
            text: "Tell us what service you need and where the project is located. We will use that information to guide the next conversation.",
          },
        },
        {
          type: "contact_info",
          name: "Contact information",
          position: 1,
          content: {
            heading: "Get in touch",
            description:
              "Call or email our team directly, or use the quote request to send the service, location and project details in one place.",
            ctaText: "Request a proposal",
            ctaUrl: "/quote",
          },
        },
        {
          type: "map",
          name: "Map",
          position: 2,
          content: {
            eyebrow: "Find us",
            embedUrl: "https://www.google.com/maps?q=Sonipat,Haryana&output=embed",
          },
        },
      ],
    },
    {
      slug: "quote",
      name: "Request a Proposal",
      title: "Request a Proposal",
      seoTitle: "Request a Proposal | Saini Tubewell",
      metaDescription:
        "Request a proposal for borewell drilling, rainwater harvesting, material supply or tubewell construction.",
      sections: [
        {
          type: "page_hero",
          name: "Page hero",
          position: 0,
          content: {
            eyebrow: "Start a project",
            heading: "Tell us what the site needs.",
            text: "Share the basic project details. The request form is structured to help the team understand your service and site requirements.",
          },
        },
        {
          type: "quote_intro",
          name: "Useful project details",
          position: 1,
          content: {
            eyebrow: "Before we begin",
            heading: "Useful project details",
            steps: [
              "Required service",
              "Project or site location",
              "Known depth or capacity needs",
              "Preferred project timeline",
            ],
          },
        },
        {
          type: "quote_form",
          name: "Quote form",
          position: 2,
          content: {},
        },
      ],
    },
  ];

  for (const spec of pageSpecs) {
    const existing = await prisma.websitePage.findUnique({
      where: { slug: spec.slug },
      include: { sections: { take: 1 } },
    });
    if (existing) {
      console.log(`Page "${spec.slug}" already exists — skipping.`);
      continue;
    }

    const page = await prisma.websitePage.create({
      data: {
        name: spec.name,
        slug: spec.slug,
        title: spec.title,
        seoTitle: spec.seoTitle,
        metaDescription: spec.metaDescription,
        status: "DRAFT",
        sections: {
          create: spec.sections.map((s) => ({
            type: s.type,
            name: s.name,
            position: s.position,
            content: s.content as unknown as Prisma.InputJsonValue,
          })),
        },
      },
    });
    console.log(`Seeded page "${spec.slug}" with ${spec.sections.length} sections (DRAFT).`);
  }
}

async function seedServices() {
  const serviceDetails = [
    ["Site-aware drilling approach", "Depth and requirement planning", "Coordinated field execution"],
    ["Groundwater recharge focus", "Practical system planning", "Site-suitable implementation"],
    ["Essential borewell components", "Durability-focused selection", "Coordinated supply support"],
    ["End-to-end construction", "Material and site coordination", "Performance-led execution"],
  ];

  for (let i = 0; i < staticServices.length; i++) {
    const s = staticServices[i];
    const slug = slugify(s.title);
    await prisma.websiteService.upsert({
      where: { slug },
      update: {},
      create: {
        title: s.title,
        slug,
        shortDescription: s.text,
        features: serviceDetails[i] ?? [],
        position: i,
        status: "DRAFT",
        visible: true,
      },
    });
    console.log(`Seeded service "${s.title}" (DRAFT).`);
  }
}

async function seedClients() {
  const count = await prisma.websiteClient.count();
  if (count > 0) {
    console.log(`Clients already present (${count}) — skipping.`);
    return;
  }
  const featuredNames = new Set([
    "Ashoka University",
    "Amul Milk, Murthal",
    "BigBasket, Sonipat Site",
    "Voestalpine VAE VKN India Pvt. Ltd.",
    "LT Overseas Pvt. Ltd. (Dawat Rice Mill)",
    "ITEC Technopark, IIT Delhi Sonipat Campus",
  ]);
  await prisma.websiteClient.createMany({
    data: staticClients.map((name, i) => ({
      name,
      sector: null,
      featured: featuredNames.has(name),
      position: i,
      visible: true,
    })),
  });
  console.log(`Seeded ${staticClients.length} clients.`);
}

async function seedNav() {
  const count = await prisma.websiteNavItem.count();
  if (count > 0) {
    console.log(`Nav items already present (${count}) — skipping.`);
    return;
  }
  const links = [
    // Navbar order. About and Gallery stay live but are linked from the footer only.
    { label: "Services", url: "/services" },
    { label: "Clients", url: "/clients" },
    { label: "Projects", url: "/projects" },
    { label: "Contact", url: "/contact" },
  ];
  await prisma.websiteNavItem.createMany({
    data: links.map((l, i) => ({ label: l.label, url: l.url, position: i, visible: true })),
  });
  console.log(`Seeded ${links.length} nav items.`);
}

async function seedSettings() {
  const existing = await prisma.websiteSettings.findFirst();
  if (existing) {
    console.log("Website settings already present — skipping.");
    return;
  }
  await prisma.websiteSettings.create({
    data: {
      businessName: company.name,
      shortDescription: company.description,
      phone: company.phones[0],
      phone2: company.phones[1],
      whatsapp: company.phones[0],
      email: company.email,
      founderName: company.managingDirector,
      founderTitle: "Founder & Managing Director",
      founderBio: founderBio,
    },
  });
  console.log("Seeded website settings (unpublished).");
}

async function seedSeo() {
  const existing = await prisma.websiteSeo.findFirst();
  if (existing) {
    console.log("Website SEO already present — skipping.");
    return;
  }
  await prisma.websiteSeo.create({
    data: {
      globalTitle: "Saini Tubewell Boring Service | Since 1992",
      globalDescription:
        "Professional borewell drilling, rainwater harvesting, borewell material supply and tubewell construction services since 1992.",
      canonicalUrl: "https://www.stbs.in",
    },
  });
  console.log("Seeded website SEO (unpublished).");
}

async function main() {
  console.log("Seeding Website CMS content...");
  await seedPages();
  await seedServices();
  await seedClients();
  await seedNav();
  await seedSettings();
  await seedSeo();
  console.log("Website CMS seed complete.");
}

main()
  .catch((e) => {
    console.error("Website seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());