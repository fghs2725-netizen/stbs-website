"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { storage } from "@/lib/storage/storage-service";
import { serialize } from "./types";
import {
  assertValid, validateClient, validateGalleryItem, validateNavItem, validatePageMeta,
  validateSectionContent, validateSeo, validateService, validateSettings, validateTestimonial,
} from "./validation";

// ─── Auth ────────────────────────────────────────────────────────────────────

async function requireAuth() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return session;
}

// Snapshot model: what gets served to the public comes from `publishedData`,
// so an edit (draft) never changes the live site until explicitly published.
function snapshotOf(
  obj: Record<string, unknown>,
  keys: string[]
): Prisma.InputJsonValue {
  const out: Record<string, unknown> = {};
  for (const k of keys) {
    if (k in obj && obj[k] !== undefined) out[k] = obj[k];
  }
  return out as Prisma.InputJsonValue;
}

function revalidateAdmin() {
  revalidatePath("/admin/website", "layout");
}

function revalidatePublic() {
  revalidatePath("/", "layout");
  revalidateAdmin();
}

/**
 * Best-effort removal of stored media objects (blobs) referenced by URLs.
 * Intended for CMS deletes so no orphaned blobs accumulate.
 */
async function deleteStoredMediaUrls(urls: Array<string | null | undefined>): Promise<void> {
  for (const url of urls) {
    if (!url) continue;
    try {
      await storage.deleteUrl(url);
    } catch (error) {
      console.error("[Website Actions] Failed to delete media:", url, error);
    }
  }
}

// ─── Revision history (last 10 published versions per item) ─────────────────
// Additive and NON-FATAL: if the WebsiteRevision table does not exist yet (migration not applied)
// every function here quietly does nothing, so publishing is never blocked by history.

const REVISIONS_KEPT = 10;

type RevisionRow = { id: string; entityType: string; entityId: string; label: string; snapshot: unknown; createdAt: Date; createdBy: string | null };
interface RevisionDelegate {
  create(args: { data: { entityType: string; entityId: string; label: string; snapshot: Prisma.InputJsonValue; createdBy?: string | null } }): Promise<unknown>;
  findMany(args: { where?: object; orderBy?: object; skip?: number; take?: number; select?: object }): Promise<RevisionRow[]>;
  findUnique(args: { where: { id: string } }): Promise<RevisionRow | null>;
  deleteMany(args: { where: object }): Promise<unknown>;
}
const revisionTable = (): RevisionDelegate | null =>
  (prisma as unknown as { websiteRevision?: RevisionDelegate }).websiteRevision ?? null;

const stamp = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 16).replace("T", " ") + " UTC" : "earlier");

/** Stores the version that was LIVE (the previous published snapshot) before it is overwritten. */
async function snapshotRevision(entityType: string, entityId: string, label: string, snapshot: unknown): Promise<void> {
  try {
    const table = revisionTable();
    if (!table || snapshot === null || snapshot === undefined) return;
    let createdBy: string | null = null;
    try { createdBy = (await auth())?.user?.email ?? null; } catch { /* keep null */ }
    await table.create({ data: { entityType, entityId, label, snapshot: snapshot as Prisma.InputJsonValue, createdBy } });
    const stale = await table.findMany({ where: { entityType, entityId }, orderBy: { createdAt: "desc" }, skip: REVISIONS_KEPT, select: { id: true } });
    if (stale.length) await table.deleteMany({ where: { id: { in: stale.map((r) => r.id) } } });
  } catch (error) {
    console.error("[Website Actions] Could not store a revision (publish continues):", error instanceof Error ? error.message : error);
  }
}

// ─── Dashboard Stats ─────────────────────────────────────────────────────────

export async function getWebsiteStats() {
  await requireAuth();
  const [pages, sections, photos, testimonials, clients, settings] =
    await Promise.all([
      prisma.websitePage.count({ where: { deletedAt: null } }),
      prisma.websiteSection.count({ where: { deletedAt: null } }),
      prisma.websiteGalleryItem.count({ where: { deletedAt: null } }),
      prisma.websiteTestimonial.count({ where: { deletedAt: null } }),
      prisma.websiteClient.count({ where: { deletedAt: null } }),
      prisma.websiteSettings.findFirst(),
    ]);
  return {
    pages,
    sections,
    photos,
    testimonials,
    clients,
    lastUpdated: settings?.updatedAt?.toISOString() ?? null,
  };
}

// ─── Pages ───────────────────────────────────────────────────────────────────

export async function getPages() {
  await requireAuth();
  return serialize(
    await prisma.websitePage.findMany({
      where: { deletedAt: null },
      orderBy: { sortOrder: "asc" },
      include: {
        _count: { select: { sections: { where: { deletedAt: null } } } },
      },
    })
  );
}

export async function getPageWithSections(id: string) {
  await requireAuth();
  return serialize(
    await prisma.websitePage.findUnique({
      where: { id },
      include: {
        sections: {
          where: { deletedAt: null },
          orderBy: { position: "asc" },
        },
      },
    })
  );
}

export async function createPage(data: {
  name: string;
  slug: string;
  title?: string;
}) {
  await requireAuth();
  const slug = data.slug
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  assertValid([...validatePageMeta({ name: data.name }, { full: true }), ...(slug ? [] : ["Page web address cannot be left empty."])]);
  const exists = await prisma.websitePage.findUnique({ where: { slug } });
  if (exists && !exists.deletedAt) throw new Error("Slug already in use");
  const maxOrder = await prisma.websitePage.aggregate({
    _max: { sortOrder: true },
  });
  const result = await prisma.websitePage.create({
    data: { ...data, slug, sortOrder: (maxOrder._max.sortOrder ?? -1) + 1 },
  });
  revalidateAdmin();
  return serialize(result);
}

export async function updatePage(
  id: string,
  data: {
    name?: string;
    slug?: string;
    title?: string;
    seoTitle?: string;
    metaDescription?: string;
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string | null;
    hideFromNav?: boolean;
  }
) {
  await requireAuth();
  assertValid(validatePageMeta(data as Record<string, unknown>));
  if (data.slug) {
    data.slug = data.slug
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }
  const result = await prisma.websitePage.update({
    where: { id },
    data: { ...data, status: "DRAFT" },
  });
  revalidateAdmin();
  return serialize(result);
}

export async function deletePage(id: string) {
  await requireAuth();
  const page = await prisma.websitePage.findUnique({
    where: { id },
    include: { _count: { select: { sections: true } } },
  });
  if (!page) throw new Error("Page not found");
  await prisma.websitePage.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
  revalidateAdmin();
  return { sectionsAffected: page._count.sections };
}

export async function publishPage(id: string) {
  await requireAuth();
  const page = await prisma.websitePage.findUnique({
    where: { id },
    include: { sections: { where: { deletedAt: null } } },
  });
  if (!page) throw new Error("Page not found");
  const publishedData = snapshotOf(page as unknown as Record<string, unknown>, [
    "name", "slug", "title", "seoTitle", "metaDescription", "ogTitle", "ogDescription", "ogImage", "sortOrder", "hideFromNav",
  ]);
  const wasLive = page.publishedData !== null || page.sections.some((s) => s.publishedContent !== null);
  if (wasLive) {
    await snapshotRevision("page", id, `${page.name}: published ${stamp(page.publishedAt)}`, {
      page: page.publishedData,
      sections: page.sections.filter((s) => s.publishedContent !== null).map((s) => ({ id: s.id, type: s.type, name: s.name, content: s.publishedContent })),
    });
  }
  await prisma.$transaction([
    ...page.sections.map((s) =>
      prisma.websiteSection.update({
        where: { id: s.id },
        data: { publishedContent: s.content as object, publishedAt: new Date() },
      })
    ),
    prisma.websitePage.update({
      where: { id },
      data: { status: "PUBLISHED", publishedAt: new Date(), publishedData },
    }),
  ]);
  revalidatePublic();
}

export async function unpublishPage(id: string) {
  await requireAuth();
  const page = await prisma.websitePage.findUnique({
    where: { id },
    include: { sections: { where: { deletedAt: null } } },
  });
  if (!page) throw new Error("Page not found");
  await prisma.$transaction([
    ...page.sections.map((s) =>
      prisma.websiteSection.update({
        where: { id: s.id },
        data: { publishedContent: Prisma.DbNull, publishedAt: null },
      })
    ),
    prisma.websitePage.update({
      where: { id },
      data: { status: "DRAFT", publishedAt: null, publishedData: Prisma.DbNull },
    }),
  ]);
  revalidatePublic();
}

export async function reorderPages(ids: string[]) {
  await requireAuth();
  await prisma.$transaction(
    ids.map((id, i) =>
      prisma.websitePage.update({ where: { id }, data: { sortOrder: i } })
    )
  );
  revalidateAdmin();
}

// ─── Sections ────────────────────────────────────────────────────────────────

export async function createSection(
  pageId: string,
  data: { type: string; name: string; description?: string; content?: object }
) {
  await requireAuth();
  if (data.content) assertValid(validateSectionContent(data.type, data.content));
  const maxPos = await prisma.websiteSection.aggregate({
    where: { pageId, deletedAt: null },
    _max: { position: true },
  });
  const result = await prisma.websiteSection.create({
    data: {
      pageId,
      type: data.type,
      name: data.name,
      description: data.description,
      content: data.content ?? {},
      position: (maxPos._max.position ?? -1) + 1,
    },
  });
  await prisma.websitePage.update({
    where: { id: pageId },
    data: { status: "DRAFT" },
  });
  revalidateAdmin();
  return serialize(result);
}

export async function updateSectionContent(id: string, content: object) {
  await requireAuth();
  const existing = await prisma.websiteSection.findUnique({ where: { id }, select: { type: true } });
  if (!existing) throw new Error("Section not found");
  // Validate first, write second: a bad value must never reach the database.
  assertValid(validateSectionContent(existing.type, content));
  const section = await prisma.websiteSection.update({
    where: { id },
    data: { content },
  });
  await prisma.websitePage.update({
    where: { id: section.pageId },
    data: { status: "DRAFT" },
  });
  revalidateAdmin();
  return serialize(section);
}

export async function updateSectionMeta(
  id: string,
  data: { name?: string; description?: string }
) {
  await requireAuth();
  const result = await prisma.websiteSection.update({
    where: { id },
    data,
  });
  revalidateAdmin();
  return serialize(result);
}

export async function deleteSection(id: string) {
  await requireAuth();
  const section = await prisma.websiteSection.findUnique({ where: { id } });
  if (!section) throw new Error("Section not found");
  await prisma.websiteSection.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
  await prisma.websitePage.update({
    where: { id: section.pageId },
    data: { status: "DRAFT" },
  });
  revalidateAdmin();
}

export async function toggleSectionVisibility(id: string) {
  await requireAuth();
  const section = await prisma.websiteSection.findUnique({ where: { id } });
  if (!section) throw new Error("Section not found");
  await prisma.websiteSection.update({
    where: { id },
    data: { visible: !section.visible },
  });
  await prisma.websitePage.update({
    where: { id: section.pageId },
    data: { status: "DRAFT" },
  });
  revalidateAdmin();
}

export async function reorderSections(pageId: string, ids: string[]) {
  await requireAuth();
  await prisma.$transaction(
    ids.map((id, i) =>
      prisma.websiteSection.update({ where: { id }, data: { position: i } })
    )
  );
  await prisma.websitePage.update({
    where: { id: pageId },
    data: { status: "DRAFT" },
  });
  revalidateAdmin();
}

export async function duplicateSection(id: string) {
  await requireAuth();
  const src = await prisma.websiteSection.findUnique({ where: { id } });
  if (!src) throw new Error("Section not found");
  const maxPos = await prisma.websiteSection.aggregate({
    where: { pageId: src.pageId, deletedAt: null },
    _max: { position: true },
  });
  const result = await prisma.websiteSection.create({
    data: {
      pageId: src.pageId,
      type: src.type,
      name: `${src.name} (copy)`,
      description: src.description,
      content: src.content as object,
      position: (maxPos._max.position ?? 0) + 1,
    },
  });
  await prisma.websitePage.update({
    where: { id: src.pageId },
    data: { status: "DRAFT" },
  });
  revalidateAdmin();
  return serialize(result);
}

// ─── Services ────────────────────────────────────────────────────────────────

export async function getServices() {
  await requireAuth();
  return serialize(
    await prisma.websiteService.findMany({
      where: { deletedAt: null },
      orderBy: { position: "asc" },
    })
  );
}

export async function getService(id: string) {
  await requireAuth();
  return serialize(
    await prisma.websiteService.findUnique({ where: { id } })
  );
}

export async function createService(data: {
  title: string;
  slug: string;
  shortDescription?: string;
  icon?: string;
}) {
  await requireAuth();
  const slug = data.slug
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  assertValid(validateService({ title: data.title, slug, shortDescription: data.shortDescription, icon: data.icon }, { full: true }));
  const maxPos = await prisma.websiteService.aggregate({
    _max: { position: true },
  });
  const result = await prisma.websiteService.create({
    data: { ...data, slug, position: (maxPos._max.position ?? -1) + 1 },
  });
  revalidateAdmin();
  return serialize(result);
}

export async function updateService(
  id: string,
  data: {
    title?: string;
    slug?: string;
    shortDescription?: string;
    fullDescription?: string;
    features?: string[];
    faqs?: Array<{ question: string; answer: string }>;
    ctaText?: string;
    ctaUrl?: string;
    image?: string | null;
    icon?: string;
    seoTitle?: string;
    seoDescription?: string;
    visible?: boolean;
  }
) {
  await requireAuth();
  assertValid(validateService(data as Record<string, unknown>));
  const result = await prisma.websiteService.update({
    where: { id },
    data: { ...data, status: "DRAFT" } as any,
  });
  revalidateAdmin();
  return serialize(result);
}

export async function deleteService(id: string) {
  await requireAuth();
  const service = await prisma.websiteService.findUnique({ where: { id } });
  if (service) {
    await deleteStoredMediaUrls([service.image]);
  }
  await prisma.websiteService.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
  revalidateAdmin();
}

export async function publishService(id: string) {
  await requireAuth();
  const service = await prisma.websiteService.findUnique({ where: { id } });
  if (!service) throw new Error("Service not found");
  const publishedData = snapshotOf(service as unknown as Record<string, unknown>, ["title", "slug", "shortDescription", "fullDescription", "features", "faqs", "ctaText", "ctaUrl", "image", "icon", "seoTitle", "seoDescription", "position", "visible"]);
  if (service.publishedData) await snapshotRevision("service", id, `${service.title}: published ${stamp(service.publishedAt)}`, service.publishedData);
  await prisma.websiteService.update({
    where: { id },
    data: { status: "PUBLISHED", publishedAt: new Date(), publishedData },
  });
  revalidatePublic();
}

export async function reorderServices(ids: string[]) {
  await requireAuth();
  await prisma.$transaction(
    ids.map((id, i) =>
      prisma.websiteService.update({ where: { id }, data: { position: i } })
    )
  );
  revalidateAdmin();
}

// ─── Testimonials ────────────────────────────────────────────────────────────

export async function getTestimonials() {
  await requireAuth();
  return serialize(
    await prisma.websiteTestimonial.findMany({
      where: { deletedAt: null },
      orderBy: { position: "asc" },
    })
  );
}

export async function createTestimonial(data: {
  personName: string;
  quote: string;
  designation?: string;
  company?: string;
  location?: string;
  project?: string;
  rating?: number;
  sourceNote?: string;
}) {
  await requireAuth();
  assertValid(validateTestimonial(data as Record<string, unknown>, { full: true }));
  const maxPos = await prisma.websiteTestimonial.aggregate({
    _max: { position: true },
  });
  const result = await prisma.websiteTestimonial.create({
    data: { ...data, sourceType: "REAL_PROJECT", position: (maxPos._max.position ?? -1) + 1 },
  });
  revalidateAdmin();
  return serialize(result);
}

export async function updateTestimonial(
  id: string,
  data: {
    personName?: string;
    designation?: string;
    company?: string;
    location?: string;
    project?: string;
    quote?: string;
    rating?: number;
    photo?: string | null;
    sourceNote?: string;
    approvalNote?: string;
    visible?: boolean;
  }
) {
  await requireAuth();
  assertValid(validateTestimonial(data as Record<string, unknown>));
  // Editing an approved testimonial must never leak unverified text to the
  // public site: any content change demotes the testimonial to DRAFT until an
  // admin re-approves it via updateTestimonialApproval.
  const result = await prisma.websiteTestimonial.update({
    where: { id },
    data: { ...data, approval: "DRAFT", publishedAt: null },
  });
  revalidatePublic();
  return serialize(result);
}

export async function updateTestimonialApproval(
  id: string,
  approval: "DRAFT" | "VERIFIED" | "APPROVED"
) {
  await requireAuth();
  const publishedAt = approval === "APPROVED" ? new Date() : undefined;
  await prisma.websiteTestimonial.update({
    where: { id },
    data: { approval, publishedAt },
  });
  revalidatePublic();
}

export async function deleteTestimonial(id: string) {
  await requireAuth();
  const testimonial = await prisma.websiteTestimonial.findUnique({ where: { id } });
  if (testimonial) {
    await deleteStoredMediaUrls([testimonial.photo]);
  }
  await prisma.websiteTestimonial.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
  revalidateAdmin();
}

export async function reorderTestimonials(ids: string[]) {
  await requireAuth();
  await prisma.$transaction(
    ids.map((id, i) =>
      prisma.websiteTestimonial.update({
        where: { id },
        data: { position: i },
      })
    )
  );
  revalidateAdmin();
}

// ─── Clients ─────────────────────────────────────────────────────────────────

export async function getWebsiteClients() {
  await requireAuth();
  return serialize(
    await prisma.websiteClient.findMany({
      where: { deletedAt: null },
      orderBy: { position: "asc" },
    })
  );
}

export async function createWebsiteClient(data: {
  name: string;
  logoUrl?: string | null;
  websiteUrl?: string;
  altText?: string;
  description?: string;
  sector?: string;
  featured?: boolean;
}) {
  await requireAuth();
  assertValid(validateClient(data as Record<string, unknown>, { full: true }));
  const maxPos = await prisma.websiteClient.aggregate({
    _max: { position: true },
  });
  const result = await prisma.websiteClient.create({
    data: { ...data, position: (maxPos._max.position ?? -1) + 1 },
  });
  revalidateAdmin();
  return serialize(result);
}

export async function updateWebsiteClient(
  id: string,
  data: {
    name?: string;
    logoUrl?: string | null;
    websiteUrl?: string;
    altText?: string;
    description?: string;
    sector?: string;
    featured?: boolean;
    visible?: boolean;
  }
) {
  await requireAuth();
  const problems = validateClient(data as Record<string, unknown>, { altRequired: false });
  if ("logoUrl" in data || "altText" in data) {
    // A logo needs alt text, judged on the row as it will be after this save.
    const current = await prisma.websiteClient.findUnique({ where: { id }, select: { logoUrl: true, altText: true } });
    if (!current) throw new Error("Client not found");
    problems.push(...validateClient({ logoUrl: data.logoUrl !== undefined ? data.logoUrl : current.logoUrl, altText: data.altText !== undefined ? data.altText : current.altText }, { altRequired: true }));
  }
  assertValid(problems);
  // Edits become a draft; the last published snapshot stays live until republished.
  const result = await prisma.websiteClient.update({
    where: { id },
    data: { ...data, status: "DRAFT" },
  });
  revalidateAdmin();
  return serialize(result);
}

export async function publishWebsiteClient(id: string) {
  await requireAuth();
  const client = await prisma.websiteClient.findUnique({ where: { id } });
  if (!client) throw new Error("Client not found");
  const publishedData = snapshotOf(client as unknown as Record<string, unknown>, [
    "name",
    "logoUrl",
    "websiteUrl",
    "altText",
    "description",
    "sector",
    "featured",
    "position",
    "visible",
  ]);
  if (client.publishedData) await snapshotRevision("client", id, `${client.name}: published ${stamp(client.publishedAt)}`, client.publishedData);
  const result = await prisma.websiteClient.update({
    where: { id },
    data: { status: "PUBLISHED", publishedAt: new Date(), publishedData },
  });
  revalidateAdmin();
  return serialize(result);
}

export async function unpublishWebsiteClient(id: string) {
  await requireAuth();
  const result = await prisma.websiteClient.update({
    where: { id },
    data: { status: "DRAFT", publishedAt: null, publishedData: Prisma.DbNull },
  });
  revalidateAdmin();
  return serialize(result);
}

export async function deleteWebsiteClient(id: string) {
  await requireAuth();
  const client = await prisma.websiteClient.findUnique({ where: { id } });
  if (client) {
    await deleteStoredMediaUrls([client.logoUrl]);
  }
  await prisma.websiteClient.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
  revalidateAdmin();
}

export async function reorderWebsiteClients(ids: string[]) {
  await requireAuth();
  await prisma.$transaction(
    ids.map((id, i) =>
      prisma.websiteClient.update({ where: { id }, data: { position: i } })
    )
  );
  revalidateAdmin();
}

// ─── Gallery ─────────────────────────────────────────────────────────────────

export async function getGalleryItems() {
  await requireAuth();
  return serialize(
    await prisma.websiteGalleryItem.findMany({
      where: { deletedAt: null },
      orderBy: { position: "asc" },
    })
  );
}

export async function createGalleryItem(data: {
  mediaUrl: string;
  thumbnailUrl?: string;
  caption?: string;
  altText?: string;
  category?: string;
  sourceType?: "REAL_PROJECT" | "STOCK" | "GENERATED" | "ILLUSTRATION";
  width?: number;
  height?: number;
  fileSize?: number;
}) {
  await requireAuth();
  assertValid(validateGalleryItem(data as Record<string, unknown>, { full: true }));
  const maxPos = await prisma.websiteGalleryItem.aggregate({
    _max: { position: true },
  });
  const result = await prisma.websiteGalleryItem.create({
    data: { ...data, position: (maxPos._max.position ?? -1) + 1 },
  });
  revalidateAdmin();
  return serialize(result);
}

export async function updateGalleryItem(
  id: string,
  data: {
    mediaUrl?: string;
    thumbnailUrl?: string;
    caption?: string;
    altText?: string;
    category?: string;
    sourceType?: "REAL_PROJECT" | "STOCK" | "GENERATED" | "ILLUSTRATION";
    featured?: boolean;
    visible?: boolean;
  }
) {
  await requireAuth();
  const problems = validateGalleryItem(data as Record<string, unknown>, { altRequired: false });
  if ("altText" in data || "mediaUrl" in data) {
    // Alt text is judged on the photo as it will be after this save.
    const current = await prisma.websiteGalleryItem.findUnique({ where: { id }, select: { mediaUrl: true, altText: true } });
    if (!current) throw new Error("Gallery item not found");
    problems.push(...validateGalleryItem({ mediaUrl: data.mediaUrl ?? current.mediaUrl, altText: data.altText !== undefined ? data.altText : current.altText }, { altRequired: true }));
  }
  assertValid(problems);
  const result = await prisma.websiteGalleryItem.update({
    where: { id },
    data: { ...data, sourceType: "REAL_PROJECT", status: "DRAFT", deleteOnPublish: false },
  });
  revalidateAdmin();
  return serialize(result);
}

export async function publishGalleryItem(id: string) {
  await requireAuth();
  const item = await prisma.websiteGalleryItem.findUnique({ where: { id } });
  if (!item) throw new Error("Gallery item not found");
  if (item.sourceType !== "REAL_PROJECT") throw new Error("Gallery accepts real project photos only.");
  if (item.deleteOnPublish) {
    await prisma.websiteGalleryItem.update({ where: { id }, data: { deletedAt: new Date(), deleteOnPublish: false } });
    await deleteStoredMediaUrls([item.mediaUrl, item.thumbnailUrl]);
    revalidateAdmin();
    revalidatePath("/gallery");
    return;
  }
  const publishedData = snapshotOf(item as unknown as Record<string, unknown>, [
    "mediaUrl",
    "thumbnailUrl",
    "caption",
    "altText",
    "category",
    "sourceType",
    "featured",
    "position",
    "visible",
    "width",
    "height",
    "fileSize",
  ]);
  if (item.publishedData) await snapshotRevision("gallery", id, `${item.caption || item.altText || "Photo"}: published ${stamp(item.publishedAt)}`, item.publishedData);
  const result = await prisma.websiteGalleryItem.update({
    where: { id },
    data: { status: "PUBLISHED", publishedAt: new Date(), publishedData },
  });
  revalidateAdmin();
  revalidatePath("/gallery");
  return serialize(result);
}

export async function unpublishGalleryItem(id: string) {
  await requireAuth();
  const result = await prisma.websiteGalleryItem.update({
    where: { id },
    data: { status: "DRAFT", publishedAt: null, publishedData: Prisma.DbNull },
  });
  revalidateAdmin();
  revalidatePath("/gallery");
  return serialize(result);
}

export async function deleteGalleryItem(id: string) {
  await requireAuth();
  const item = await prisma.websiteGalleryItem.findUnique({ where: { id } });
  if (!item) throw new Error("Gallery item not found");
  // Published photos must keep their live snapshot (and blob) until the
  // deletion is explicitly published. Unpublished drafts can be cleaned up.
  if (item.publishedAt) {
    await prisma.websiteGalleryItem.update({ where: { id }, data: { deleteOnPublish: true, status: "DRAFT" } });
    revalidateAdmin();
    return;
  }
  await deleteStoredMediaUrls([item.mediaUrl, item.thumbnailUrl]);
  await prisma.websiteGalleryItem.update({
    where: { id },
    data: { deletedAt: new Date(), deleteOnPublish: false },
  });
  revalidateAdmin();
  revalidatePath("/gallery");
}

export async function reorderGalleryItems(ids: string[]) {
  await requireAuth();
  await prisma.$transaction(
    ids.map((id, i) =>
      prisma.websiteGalleryItem.update({
        where: { id },
        data: { position: i },
      })
    )
  );
  revalidateAdmin();
}

export async function getGalleryCategories() {
  await requireAuth();
  const items = await prisma.websiteGalleryItem.findMany({
    where: { deletedAt: null, category: { not: null } },
    select: { category: true },
    distinct: ["category"],
  });
  return items.map((i) => i.category).filter(Boolean) as string[];
}

// ─── Media usage ─────────────────────────────────────────────────────────────
// Maps each media URL to where it is currently referenced so admins see
// photo usage (sections, pages, services) before deleting or replacing.

export async function getMediaUsageMap(): Promise<
  Record<string, { sections: string[]; services: string[] }>
> {
  await requireAuth();
  const [sections, services] = await Promise.all([
    prisma.websiteSection.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, pageId: true, content: true },
    }),
    prisma.websiteService.findMany({
      where: { deletedAt: null },
      select: { id: true, title: true, image: true },
    }),
  ]);

  const map: Record<string, { sections: string[]; services: string[] }> = {};

  const register = (url: string, key: string, sectionName?: string) => {
    if (!url) return;
    if (!map[url]) map[url] = { sections: [], services: [] };
    if (key === "sections" && !map[url].sections.includes(sectionName ?? "")) {
      if (sectionName) map[url].sections.push(sectionName);
    }
    if (key === "services" && !map[url].services.includes(sectionName ?? "")) {
      if (sectionName) map[url].services.push(sectionName);
    }
  };

  for (const s of sections) {
    const content = (s.content ?? {}) as Record<string, unknown>;
    const urls = extractImageUrls(content);
    for (const u of urls) register(u, "sections", s.name);
  }
  for (const svc of services) {
    if (svc.image) register(svc.image, "services", svc.title);
  }

  return map;
}

function extractImageUrls(obj: Record<string, unknown>, acc: string[] = []): string[] {
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      if (key.toLowerCase().includes("image") || key.toLowerCase().includes("photo") || key.toLowerCase() === "src" || value.startsWith("/uploads/")) {
        acc.push(value);
      } else if (value.startsWith("/uploads/")) {
        acc.push(value);
      }
    } else if (Array.isArray(value)) {
      for (const item of value) {
        if (item && typeof item === "object") {
          extractImageUrls(item as Record<string, unknown>, acc);
        } else if (typeof item === "string" && item.startsWith("/uploads/")) {
          acc.push(item);
        }
      }
    } else if (value && typeof value === "object") {
      extractImageUrls(value as Record<string, unknown>, acc);
    }
  }
  return acc;
}

// ─── Navigation ──────────────────────────────────────────────────────────────

export async function getNavItems() {
  await requireAuth();
  return serialize(
    await prisma.websiteNavItem.findMany({
      where: { deletedAt: null },
      orderBy: { position: "asc" },
    })
  );
}

export async function createNavItem(data: {
  label: string;
  url: string;
  openNewTab?: boolean;
  parentId?: string;
}) {
  await requireAuth();
  assertValid(validateNavItem(data as Record<string, unknown>, { full: true }));
  const maxPos = await prisma.websiteNavItem.aggregate({
    _max: { position: true },
  });
  const result = await prisma.websiteNavItem.create({
    data: { ...data, position: (maxPos._max.position ?? -1) + 1 },
  });
  revalidateAdmin();
  return serialize(result);
}

export async function updateNavItem(
  id: string,
  data: {
    label?: string;
    url?: string;
    visible?: boolean;
    openNewTab?: boolean;
    parentId?: string | null;
  }
) {
  await requireAuth();
  assertValid(validateNavItem(data as Record<string, unknown>));
  const result = await prisma.websiteNavItem.update({
    where: { id },
    data: { ...data, status: "DRAFT" },
  });
  revalidateAdmin();
  return serialize(result);
}

export async function publishNavItem(id: string) {
  await requireAuth();
  const item = await prisma.websiteNavItem.findUnique({ where: { id } });
  if (!item) throw new Error("Navigation item not found");
  const publishedData = snapshotOf(item as unknown as Record<string, unknown>, [
    "label",
    "url",
    "position",
    "visible",
    "openNewTab",
    "parentId",
  ]);
  const result = await prisma.websiteNavItem.update({
    where: { id },
    data: { status: "PUBLISHED", publishedAt: new Date(), publishedData },
  });
  revalidateAdmin();
  return serialize(result);
}

export async function unpublishNavItem(id: string) {
  await requireAuth();
  const result = await prisma.websiteNavItem.update({
    where: { id },
    data: { status: "DRAFT", publishedAt: null, publishedData: Prisma.DbNull },
  });
  revalidateAdmin();
  return serialize(result);
}

export async function deleteNavItem(id: string) {
  await requireAuth();
  const item = await prisma.websiteNavItem.findUnique({ where: { id } });
  if (!item) throw new Error("Navigation item not found");
  // Check if it has children
  const children = await prisma.websiteNavItem.count({
    where: { parentId: id, deletedAt: null },
  });
  if (children > 0) {
    throw new Error(
      `This item has ${children} child item(s). Remove or reassign them first.`
    );
  }
  await prisma.websiteNavItem.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
  revalidateAdmin();
}

export async function reorderNavItems(ids: string[]) {
  await requireAuth();
  await prisma.$transaction(
    ids.map((id, i) =>
      prisma.websiteNavItem.update({ where: { id }, data: { position: i } })
    )
  );
  revalidateAdmin();
}

// ─── Settings ────────────────────────────────────────────────────────────────

export async function getWebsiteSettings() {
  await requireAuth();
  let settings = await prisma.websiteSettings.findFirst();
  if (!settings) {
    settings = await prisma.websiteSettings.create({ data: {} });
  }
  return serialize(settings);
}

export async function updateWebsiteSettings(data: {
  businessName?: string;
  shortDescription?: string;
  phone?: string;
  phone2?: string;
  whatsapp?: string;
  email?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  pinCode?: string;
  googleMapsUrl?: string;
  googleBusinessUrl?: string;
  serviceArea?: string;
  businessHours?: object;
  websiteUrl?: string;
  primaryLogoUrl?: string | null;
  lightLogoUrl?: string | null;
  darkLogoUrl?: string | null;
  mobileLogoUrl?: string | null;
  faviconUrl?: string | null;
  defaultOgImage?: string | null;
  footerContent?: string;
  copyrightText?: string;
  founderName?: string;
  founderTitle?: string;
  founderBio?: string;
  founderPhoto?: string | null;
  mission?: string;
  vision?: string;
}) {
  await requireAuth();
  assertValid(validateSettings(data as Record<string, unknown>));
  let settings = await prisma.websiteSettings.findFirst();
  if (!settings) {
    settings = await prisma.websiteSettings.create({ data });
  } else {
    settings = await prisma.websiteSettings.update({
      where: { id: settings.id },
      data,
    });
  }
  revalidateAdmin();
  return serialize(settings);
}

export async function publishWebsiteSettings() {
  await requireAuth();
  const settings = await prisma.websiteSettings.findFirst();
  if (!settings) throw new Error("No settings to publish");
  const { id, publishedData, publishedAt, updatedAt, ...rest } = settings;
  if (publishedData) await snapshotRevision("settings", id, `Site settings: published ${stamp(publishedAt)}`, publishedData);
  await prisma.websiteSettings.update({
    where: { id },
    data: { publishedData: rest as object, publishedAt: new Date() },
  });
  revalidatePublic();
}

// ─── SEO ─────────────────────────────────────────────────────────────────────

export async function getWebsiteSeo() {
  await requireAuth();
  let seo = await prisma.websiteSeo.findFirst();
  if (!seo) {
    seo = await prisma.websiteSeo.create({ data: {} });
  }
  return serialize(seo);
}

export async function updateWebsiteSeo(data: {
  globalTitle?: string;
  globalDescription?: string;
  defaultOgImage?: string | null;
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string | null;
  canonicalUrl?: string;
  robotsSettings?: string;
  structuredData?: object;
}) {
  await requireAuth();
  assertValid(validateSeo(data as Record<string, unknown>));
  let seo = await prisma.websiteSeo.findFirst();
  if (!seo) {
    seo = await prisma.websiteSeo.create({ data });
  } else {
    seo = await prisma.websiteSeo.update({ where: { id: seo.id }, data });
  }
  revalidateAdmin();
  return serialize(seo);
}

export async function publishWebsiteSeo() {
  await requireAuth();
  const seo = await prisma.websiteSeo.findFirst();
  if (!seo) throw new Error("No SEO settings to publish");
  const { id, publishedData, publishedAt, updatedAt, ...rest } = seo;
  if (publishedData) await snapshotRevision("seo", id, `Search settings: published ${stamp(publishedAt)}`, publishedData);
  await prisma.websiteSeo.update({
    where: { id },
    data: { publishedData: rest as object, publishedAt: new Date() },
  });
  revalidatePublic();
}

// ─── Publish preflight ───────────────────────────────────────────────────────

export interface PublishPlanItem { kind: string; name: string; status: "DRAFT" | "PUBLISHED"; changed: boolean }
export interface PublishPlan { items: PublishPlanItem[]; counts: Record<string, number>; problems: string[] }

const sameJson = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
const statusOf = (published: boolean): "DRAFT" | "PUBLISHED" => (published ? "PUBLISHED" : "DRAFT");

/** Read-only: what a whole-website publish would touch, and every content problem that would block it. */
async function buildPublishPlan(pageId?: string): Promise<PublishPlan> {
  const items: PublishPlanItem[] = [];
  const problems: string[] = [];

  if (pageId) {
    const page = await prisma.websitePage.findUnique({ where: { id: pageId }, include: { sections: { where: { deletedAt: null }, orderBy: { position: "asc" } } } });
    if (page) {
      const sectionsChanged = page.sections.some((sec) => !sameJson(sec.content, sec.publishedContent));
      items.push({ kind: "page", name: page.name, status: statusOf(page.status === "PUBLISHED"), changed: page.status !== "PUBLISHED" || sectionsChanged });
      problems.push(...validatePageMeta(page as unknown as Record<string, unknown>, { full: true, name: `Page "${page.name}"` }));
      for (const sec of page.sections.filter((x) => x.visible)) {
        problems.push(...validateSectionContent(sec.type, sec.content).map((m) => `${sec.name}: ${m}`));
      }
    }
  }

  const [settings, seo, nav, services, gallery, clients] = await Promise.all([
    prisma.websiteSettings.findFirst(),
    prisma.websiteSeo.findFirst(),
    prisma.websiteNavItem.findMany({ where: { deletedAt: null, visible: true }, orderBy: { position: "asc" } }),
    prisma.websiteService.findMany({ where: { deletedAt: null, visible: true }, orderBy: { position: "asc" } }),
    prisma.websiteGalleryItem.findMany({ where: { deletedAt: null, visible: true }, orderBy: { position: "asc" } }),
    prisma.websiteClient.findMany({ where: { deletedAt: null, visible: true }, orderBy: { position: "asc" } }),
  ]);

  if (settings) {
    items.push({ kind: "settings", name: "Site settings", status: statusOf(Boolean(settings.publishedAt)), changed: !settings.publishedAt || settings.updatedAt > settings.publishedAt });
    problems.push(...validateSettings(settings as unknown as Record<string, unknown>).map((m) => `Site settings: ${m}`));
  }
  if (seo) {
    items.push({ kind: "seo", name: "Search settings", status: statusOf(Boolean(seo.publishedAt)), changed: !seo.publishedAt || seo.updatedAt > seo.publishedAt });
    problems.push(...validateSeo(seo as unknown as Record<string, unknown>).map((m) => `Search settings: ${m}`));
  }
  for (const n of nav) {
    items.push({ kind: "nav", name: n.label, status: statusOf(n.status === "PUBLISHED"), changed: n.status !== "PUBLISHED" });
    problems.push(...validateNavItem(n as unknown as Record<string, unknown>, { full: true, name: `Menu "${n.label}"` }));
  }
  for (const sv of services) {
    items.push({ kind: "service", name: sv.title, status: statusOf(sv.status === "PUBLISHED"), changed: sv.status !== "PUBLISHED" });
    problems.push(...validateService(sv as unknown as Record<string, unknown>, { full: true, name: `Service "${sv.title}"` }));
  }
  for (const g of gallery) {
    const name = g.caption || g.altText || "Photo";
    items.push({ kind: "gallery", name: g.deleteOnPublish ? `${name} (removal)` : name, status: statusOf(g.status === "PUBLISHED"), changed: g.status !== "PUBLISHED" });
    if (!g.deleteOnPublish) problems.push(...validateGalleryItem(g as unknown as Record<string, unknown>, { full: true, name: `Photo "${name}"` }));
  }
  for (const c of clients) {
    items.push({ kind: "client", name: c.name, status: statusOf(c.status === "PUBLISHED"), changed: c.status !== "PUBLISHED" });
    problems.push(...validateClient(c as unknown as Record<string, unknown>, { full: true, name: `Client "${c.name}"` }));
  }

  const counts: Record<string, number> = { total: items.length, changed: items.filter((i) => i.changed).length };
  for (const i of items) if (i.changed) counts[i.kind] = (counts[i.kind] ?? 0) + 1;
  return { items, counts, problems: Array.from(new Set(problems)) };
}

/**
 * What "Publish website" would change, and the problems that would stop it. Read-only.
 * `counts` = number of CHANGED items per kind, plus `changed` and `total` overall.
 */
export async function previewPublish(pageId?: string): Promise<PublishPlan> {
  await requireAuth();
  return buildPublishPlan(pageId);
}

// ─── Revision history: list and restore ──────────────────────────────────────

export interface RevisionSummary { id: string; label: string; createdAt: string; createdBy: string | null }

/** Newest first, at most 10. Returns [] if history is unavailable for any reason. */
export async function listRevisions(entityType: string, entityId: string): Promise<RevisionSummary[]> {
  await requireAuth();
  try {
    const table = revisionTable();
    if (!table) return [];
    const rows = await table.findMany({ where: { entityType, entityId }, orderBy: { createdAt: "desc" }, take: REVISIONS_KEPT });
    return rows.map((r) => ({ id: r.id, label: r.label, createdAt: r.createdAt.toISOString(), createdBy: r.createdBy }));
  } catch {
    return [];
  }
}

const SERVICE_RESTORE = ["title", "slug", "shortDescription", "fullDescription", "features", "faqs", "ctaText", "ctaUrl", "image", "icon", "seoTitle", "seoDescription", "visible"];
const CLIENT_RESTORE = ["name", "logoUrl", "websiteUrl", "altText", "description", "sector", "featured", "visible"];
const GALLERY_RESTORE = ["mediaUrl", "thumbnailUrl", "caption", "altText", "category", "featured", "visible", "width", "height", "fileSize"];
const PAGE_RESTORE = ["title", "seoTitle", "metaDescription", "ogTitle", "ogDescription", "ogImage", "hideFromNav"];
const JSON_KEYS = new Set(["features", "faqs", "businessHours", "structuredData"]);

/** Snapshot -> draft column values. JSON columns need DbNull rather than null. */
function draftData(snapshot: Record<string, unknown>, keys?: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(snapshot)) {
    if (keys && !keys.includes(k)) continue;
    if (["id", "publishedData", "publishedAt", "updatedAt", "createdAt"].includes(k)) continue;
    out[k] = v === null && JSON_KEYS.has(k) ? Prisma.DbNull : v;
  }
  return out;
}

/**
 * Puts an older published version back into the DRAFT (never straight to live). The owner reviews it
 * and publishes as usual. Returns a readable result instead of throwing.
 */
export async function restoreRevision(revisionId: string): Promise<{ ok: boolean; message: string; entityType?: string; entityId?: string }> {
  await requireAuth();
  try {
    const table = revisionTable();
    if (!table) return { ok: false, message: "Version history is not available yet." };
    const rev = await table.findUnique({ where: { id: revisionId } });
    if (!rev) return { ok: false, message: "That version no longer exists." };
    const snap = (rev.snapshot ?? {}) as Record<string, unknown>;
    const { entityType: type, entityId: id } = rev;

    if (type === "service") {
      await prisma.websiteService.update({ where: { id }, data: { ...draftData(snap, SERVICE_RESTORE), status: "DRAFT" } as never });
    } else if (type === "client") {
      await prisma.websiteClient.update({ where: { id }, data: { ...draftData(snap, CLIENT_RESTORE), status: "DRAFT" } as never });
    } else if (type === "gallery") {
      await prisma.websiteGalleryItem.update({ where: { id }, data: { ...draftData(snap, GALLERY_RESTORE), status: "DRAFT", deleteOnPublish: false } as never });
    } else if (type === "settings") {
      await prisma.websiteSettings.update({ where: { id }, data: draftData(snap) as never });
    } else if (type === "seo") {
      await prisma.websiteSeo.update({ where: { id }, data: draftData(snap) as never });
    } else if (type === "page") {
      const pageSnap = (snap.page ?? {}) as Record<string, unknown>;
      const sections = Array.isArray(snap.sections) ? (snap.sections as Array<{ id: string; content: unknown }>) : [];
      const existing = await prisma.websiteSection.findMany({ where: { pageId: id, deletedAt: null }, select: { id: true } });
      const live = new Set(existing.map((e) => e.id));
      await prisma.$transaction([
        prisma.websitePage.update({ where: { id }, data: { ...draftData(pageSnap, PAGE_RESTORE), status: "DRAFT" } as never }),
        ...sections.filter((sec) => live.has(sec.id)).map((sec) => prisma.websiteSection.update({ where: { id: sec.id }, data: { content: (sec.content ?? {}) as object } })),
      ]);
    } else {
      return { ok: false, message: "This kind of version cannot be restored." };
    }
    revalidateAdmin();
    return { ok: true, message: `Restored the version "${rev.label}" as a draft. Review it, then publish to make it live.`, entityType: type, entityId: id };
  } catch {
    return { ok: false, message: "Could not restore that version. The item may have been deleted; nothing was changed." };
  }
}

// ─── Whole-website publish (visual editor) ──────────────────────────────────

/**
 * Publishes the accumulated draft for one page (its sections), global settings,
 * SEO and all visible draft navigation/services/gallery/clients. Testimonials
 * are deliberately NOT included: they stay approval-gated so a verified quote
 * is never broadcast by an unrelated "publish website".
 *
 * A preflight runs first. If any draft has a content problem NOTHING is written: the result has
 * `problems` (readable messages), `ok: false` and an empty `publishedSlug`. (Returned rather than
 * thrown because production builds hide thrown server-action messages from the browser.)
 */
export async function publishWebsiteNow(pageId: string): Promise<{ publishedSlug: string; ok?: boolean; revalidated?: string[]; problems?: string[] }> {
  await requireAuth();

  const page = await prisma.websitePage.findUnique({ where: { id: pageId } });
  if (!page) throw new Error("Page not found");

  const plan = await buildPublishPlan(pageId);
  if (plan.problems.length) return { publishedSlug: "", ok: false, problems: plan.problems, revalidated: [] };

  await publishPage(pageId);

  try {
    await publishWebsiteSettings();
  } catch {
    // no settings row yet — nothing to publish
  }
  try {
    await publishWebsiteSeo();
  } catch {
    // no SEO row yet — nothing to publish
  }

  const [nav, services, gallery, clients] = await Promise.all([
    prisma.websiteNavItem.findMany({ where: { deletedAt: null, visible: true } }),
    prisma.websiteService.findMany({ where: { deletedAt: null, visible: true } }),
    prisma.websiteGalleryItem.findMany({ where: { deletedAt: null, visible: true } }),
    prisma.websiteClient.findMany({ where: { deletedAt: null, visible: true } }),
  ]);

  await Promise.all([
    ...nav.map((n) => publishNavItem(n.id)),
    ...services.map((s) => publishService(s.id)),
    ...gallery.map((g) => publishGalleryItem(g.id)),
    ...clients.map((c) => publishWebsiteClient(c.id)),
  ]);

  const revalidated = ["/", "/gallery", `/${page.slug}`];
  revalidatePath("/", "layout");
  revalidatePath("/gallery");
  revalidatePath(`/${page.slug}`);
  revalidateAdmin();
  return { publishedSlug: page.slug, ok: true, revalidated };
}
