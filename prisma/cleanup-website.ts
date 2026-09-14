/**
 * Website CMS — QA data cleanup (dev).
 *
 * Removes fabricated/placeholder content from the development database so the
 * public site shows only real data:
 *  1. Demotes ALL existing testimonials to DRAFT + invisible. The current rows
 *     are mock/placeholder quotes; nothing may appear on the public site until
 *     real, verified quotes are approved.
 *  2. Soft-deletes gallery items whose source is Unsplash (not real projects).
 *  3. Clears fabricated contact/settings fields invented by the QA campaign:
 *     addressLine1, addressLine2, city, state, businessHours. These are also
 *     scrubbed from the settings publishedData snapshot if present.
 *
 * Idempotent and safe to re-run. Only touches Website CMS rows.
 */

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const FABRICATED_SETTING_KEYS = ["addressLine1", "addressLine2", "city", "state", "businessHours"] as const;

async function main() {
  // 1. Demote all testimonials to DRAFT + invisible
  const testimonialTotal = await prisma.websiteTestimonial.count();
  const demoted = await prisma.websiteTestimonial.updateMany({
    where: { approval: { in: ["VERIFIED", "APPROVED"] } },
    data: { approval: "DRAFT", visible: false, publishedAt: null },
  });
  // Also catch any rows that were DRAFT but visible.
  const hidden = await prisma.websiteTestimonial.updateMany({
    where: { visible: true },
    data: { visible: false, publishedAt: null },
  });
  console.log(`Testimonials: ${testimonialTotal} total, ${demoted.count} demoted to DRAFT, ${hidden.count} forced invisible.`);

  // 2. Soft-delete Unsplash-sourced gallery items
  const galleryBefore = await prisma.websiteGalleryItem.count({ where: { deletedAt: null } });
  const removed = await prisma.websiteGalleryItem.updateMany({
    where: { deletedAt: null, mediaUrl: { contains: "images.unsplash.com" } },
    data: { deletedAt: new Date(), status: "DRAFT", visible: false, publishedAt: null },
  });
  console.log(`Gallery: ${galleryBefore} live items before, ${removed.count} Unsplash-sourced soft-deleted.`);

  // 3. Clear fabricated settings fields (columns + publishedData snapshot)
  const settings = await prisma.websiteSettings.findFirst();
  if (settings) {
    const data: Prisma.WebsiteSettingsUncheckedUpdateInput = {
      addressLine1: null,
      addressLine2: null,
      city: null,
      state: null,
      businessHours: Prisma.DbNull,
    };

    const publishedData =
      settings.publishedData && typeof settings.publishedData === "object"
        ? { ...(settings.publishedData as Record<string, unknown>) }
        : null;
    if (publishedData) {
      for (const key of FABRICATED_SETTING_KEYS) {
        if (key in publishedData) publishedData[key] = null;
      }
      data.publishedData = publishedData as unknown as Prisma.InputJsonValue;
    }

    await prisma.websiteSettings.update({
      where: { id: settings.id },
      data,
    });
    console.log("Settings: fabricated address/city/state/hours fields cleared (columns + published snapshot).");
  } else {
    console.log("Settings: none found — nothing to clear.");
  }

  // Settings for the run
  console.log("Midpoint totals after cleanup:");
  console.log(
    `  Testimonials live (DRAFT yet visible): ${await prisma.websiteTestimonial.count({ where: { visible: true, deletedAt: null } })}`
  );
  console.log(
    `  Gallery live (deletedAt null): ${await prisma.websiteGalleryItem.count({ where: { deletedAt: null } })}`
  );
  console.log(
    `  Gallery remaining with Unsplash URL: ${await prisma.websiteGalleryItem.count({ where: { mediaUrl: { contains: "images.unsplash.com" } } })}`
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error("Cleanup failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });