"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { storage } from "@/lib/storage/storage-service";
import { serialize } from "./types";

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
  await prisma.websiteSeo.update({
    where: { id },
    data: { publishedData: rest as object, publishedAt: new Date() },
  });
  revalidatePublic();
}

// ─── Whole-website publish (visual editor) ──────────────────────────────────

/**
 * Publishes the accumulated draft for one page (its sections), global settings,
 * SEO and all visible draft navigation/services/gallery/clients. Testimonials
 * are deliberately NOT included: they stay approval-gated so a verified quote
 * is never broadcast by an unrelated "publish website".
 */
export async function publishWebsiteNow(pageId: string) {
  await requireAuth();

  const page = await prisma.websitePage.findUnique({ where: { id: pageId } });
  if (!page) throw new Error("Page not found");

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

  revalidatePath("/", "layout");
  revalidatePath("/gallery");
  revalidatePath(`/${page.slug}`);
  revalidateAdmin();
  return { publishedSlug: page.slug };
}
