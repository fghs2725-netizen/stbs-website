import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { HOME_HERO } from "../lib/website/home-defaults";

async function main() {
  const homePage = await prisma.websitePage.findUniqueOrThrow({ where: { slug: "home" } });

  const hero = await prisma.websiteSection.findFirstOrThrow({
    where: { pageId: homePage.id, type: "hero", deletedAt: null },
  });

  const heroDefaults = { ...HOME_HERO };

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