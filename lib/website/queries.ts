/**
 * Website CMS — Public Queries
 *
 * These functions are called by public (non-admin) pages to fetch CMS-managed
 * content. Every function returns `null` when no published CMS data exists,
 * so the caller can fall back to the static `lib/company.ts` data.
 */

import { prisma } from "@/lib/prisma";
import { serialize } from "./types";

/**
 * Snapshot model: rows stay live (visible to the public) as long as they have a
 * `publishedAt` timestamp. Edits move the current fields to a draft while
 * `publishedData` (or per-section `publishedContent`) keeps the last published
 * version live until an admin explicitly republished. Unpublishing clears the
 * snapshot, returning the site to its static fallback.
 */
function applySnapshot<T extends object>(row: T & { publishedData: unknown }): T {
  const { publishedData, ...rest } = row;
  return (
    publishedData && typeof publishedData === "object" && !Array.isArray(publishedData)
      ? { ...rest, ...(publishedData as Record<string, unknown>) }
      : rest
  ) as T;
}

function livePosition(r: unknown): number {
  return ((r as Record<string, unknown>).position as number | undefined) ?? 0;
}

// ─── Pages & Sections ────────────────────────────────────────────────────────

export async function getPublishedPage(slug: string) {
  const page = await prisma.websitePage.findFirst({
    where: { slug, publishedAt: { not: null }, deletedAt: null },
    include: {
      sections: {
        where: { deletedAt: null, visible: true },
        orderBy: { position: "asc" },
      },
    },
  });
  if (!page) return null;

  return serialize({
    ...page,
    sections: page.sections.map((s) => ({
      ...s,
      // Use publishedContent if available, otherwise current draft
      content: (s.publishedContent ?? s.content) as Record<string, unknown>,
    })),
  });
}

export async function getPublishedPageMeta(slug: string) {
  const page = await prisma.websitePage.findFirst({
    where: { slug, publishedAt: { not: null }, deletedAt: null },
    select: {
      seoTitle: true,
      metaDescription: true,
      ogTitle: true,
      ogDescription: true,
      ogImage: true,
      title: true,
      name: true,
    },
  });
  return page ? serialize(page) : null;
}

// ─── Services ────────────────────────────────────────────────────────────────

export async function getPublishedServices() {
  const rows = await prisma.websiteService.findMany({ where: { publishedAt: { not: null }, deletedAt: null } });
  const services = rows.map((row) => applySnapshot(row)).filter((service) => (service as Record<string, unknown>).visible !== false).sort((a, b) => livePosition(a) - livePosition(b));
  return services.length > 0 ? serialize(services) : null;
}

export async function getPublishedService(slug: string) {
  // A draft slug can change before publish; route lookups must use the live
  // snapshot's slug, never the current draft field.
  const rows = await prisma.websiteService.findMany({ where: { publishedAt: { not: null }, deletedAt: null } });
  const service = rows.map((row) => applySnapshot(row)).find((row) => row.slug === slug);
  return service ? serialize(service) : null;
}

// ─── Testimonials ────────────────────────────────────────────────────────────

export async function getPublishedTestimonials() {
  const testimonials = await prisma.websiteTestimonial.findMany({
    where: {
      approval: "APPROVED",
      visible: true,
      deletedAt: null,
    },
    orderBy: { position: "asc" },
  });
  return testimonials.length > 0 ? serialize(testimonials) : null;
}

// ─── Clients ─────────────────────────────────────────────────────────────────

export async function getPublishedClients() {
  const rows = await prisma.websiteClient.findMany({
    where: { publishedAt: { not: null }, deletedAt: null },
  });
  const clients = rows
    .map((r) => applySnapshot(r))
    .filter((c) => (c as Record<string, unknown>).visible !== false)
    .sort((a, b) => livePosition(a) - livePosition(b));
  return clients.length > 0 ? serialize(clients) : null;
}

export async function getPublishedFeaturedClients() {
  const rows = await prisma.websiteClient.findMany({
    where: { publishedAt: { not: null }, deletedAt: null },
  });
  const clients = rows
    .map((r) => applySnapshot(r))
    .filter((c) => {
      const s = c as Record<string, unknown>;
      return s.featured === true && s.visible !== false;
    })
    .sort((a, b) => livePosition(a) - livePosition(b));
  return clients.length > 0 ? serialize(clients) : null;
}

// ─── Gallery ─────────────────────────────────────────────────────────────────

export async function getPublishedGalleryItems(category?: string) {
  const rows = await prisma.websiteGalleryItem.findMany({
    where: { publishedAt: { not: null }, deletedAt: null },
  });
  const items = rows
    .map((r) => applySnapshot(r))
    .filter((g) => {
      const s = g as Record<string, unknown>;
      if (s.visible === false) return false;
      if (category) return s.category === category;
      return true;
    })
    .sort((a, b) => livePosition(a) - livePosition(b));
  return items.length > 0 ? serialize(items) : null;
}

export async function getPublishedGalleryCategories() {
  const rows = await prisma.websiteGalleryItem.findMany({
    where: { publishedAt: { not: null }, deletedAt: null },
    select: { publishedData: true, category: true },
  });
  const set = new Set<string>();
  for (const r of rows) {
    const pd = r.publishedData;
    const cat =
      pd && typeof pd === "object" && !Array.isArray(pd)
        ? (pd as Record<string, unknown>).category
        : r.category;
    if (typeof cat === "string" && cat) set.add(cat);
  }
  return [...set];
}

// ─── Navigation ──────────────────────────────────────────────────────────────

export async function getPublishedNavigation() {
  const rows = await prisma.websiteNavItem.findMany({
    where: { publishedAt: { not: null }, deletedAt: null },
  });
  const items = rows
    .map((r) => applySnapshot(r))
    .filter((n) => (n as Record<string, unknown>).visible !== false)
    .sort((a, b) => livePosition(a) - livePosition(b));
  return items.length > 0 ? serialize(items) : null;
}

// ─── Settings ────────────────────────────────────────────────────────────────

export async function getPublishedSettings() {
  const settings = await prisma.websiteSettings.findFirst();
  if (!settings) return null;

  // If published, return the published snapshot; otherwise return raw data
  if (settings.publishedData) {
    return serialize(settings.publishedData) as Record<string, unknown>;
  }

  // Return the current values as a plain object (for pre-publish access)
  const { id, publishedData, publishedAt, updatedAt, ...rest } = settings;
  return serialize(rest) as Record<string, unknown>;
}

// ─── SEO ─────────────────────────────────────────────────────────────────────

export async function getPublishedSeo() {
  const seo = await prisma.websiteSeo.findFirst();
  if (!seo) return null;

  if (seo.publishedData) {
    return serialize(seo.publishedData) as Record<string, unknown>;
  }

  const { id, publishedData, publishedAt, updatedAt, ...rest } = seo;
  return serialize(rest) as Record<string, unknown>;
}
