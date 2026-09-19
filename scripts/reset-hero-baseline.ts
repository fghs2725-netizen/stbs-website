import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { company } from "../lib/company";

async function main() {
  const homePage = await prisma.websitePage.findUniqueOrThrow({ where: { slug: "home" } });

  const hero = await prisma.websiteSection.findFirstOrThrow({
    where: { pageId: homePage.id, type: "hero", deletedAt: null },
  });

  const heroDefaults = {
    eyebrow: "Trusted since 1992",
    heading: "Go deeper.",
    headingLine2: "Build stronger.",
    supportingText: company.tagline,
    primaryCtaText: "Request a proposal",
    primaryCtaUrl: "/quote",
    secondaryCtaText: "Call now",
    secondaryCtaUrl: `tel:+91${company.phones[0]}`,
    heroImage: "/hero-industrial-cross-section.png",
    heroImageAlt: "Industrial site with a borewell cross-section showing groundwater layers",
  };

  await prisma.websiteSection.update({
    where: { id: hero.id },
    data: {
      content: heroDefaults as Prisma.InputJsonObject,
      publishedContent: Prisma.DbNull,
      publishedAt: null,
      visible: true,
    },
  });

  await prisma.websitePage.update({
    where: { id: homePage.id },
    data: { status: "DRAFT", publishedAt: null },
  });

  const check = await prisma.websiteSection.findUniqueOrThrow({ where: { id: hero.id } });
  console.log("hero reset -> visible=" + check.visible, "status? content.heading=" + ((check.content as any).heading as string));
  process.exit(0);
}
main();