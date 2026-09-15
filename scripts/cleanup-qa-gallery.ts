import { prisma } from "../lib/prisma";

async function main() {
  const r = await prisma.websiteGalleryItem.updateMany({
    where: { id: "cmu239t3h0000jw04op64q5c0", deletedAt: null },
    data: { deletedAt: new Date() },
  });
  console.log("soft-deleted rows:", r.count);
  const left = await prisma.websiteGalleryItem.findMany({ where: { deletedAt: null, publishedAt: { not: null } } });
  console.log("remaining published gallery rows:", left.length);
  process.exit(0);
}
main();