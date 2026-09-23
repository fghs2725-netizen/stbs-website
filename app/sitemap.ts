import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { canonicalSiteUrl } from "@/lib/site-url";

export const revalidate = 86400;

const ROUTES = ["", "/about", "/services", "/borewell-drilling", "/rainwater-harvesting", "/borewell-material-supply", "/tubewell-construction", "/projects", "/clients", "/gallery", "/contact", "/quote"];

// lastmod is the last time a page's live content was published. Code-only pages carry none rather than
// claiming "now" on every request, which teaches Google to ignore the dates altogether.
async function publishedDates(): Promise<Map<string, Date>> {
  const pages = await prisma.websitePage.findMany({ where: { publishedAt: { not: null }, deletedAt: null }, select: { slug: true, publishedAt: true, publishedData: true } }).catch(() => []);
  const dates = new Map<string, Date>();
  for (const page of pages) {
    const snapshot = page.publishedData;
    const slug = snapshot && typeof snapshot === "object" && !Array.isArray(snapshot) && typeof (snapshot as Record<string, unknown>).slug === "string"
      ? (snapshot as Record<string, string>).slug
      : page.slug;
    if (page.publishedAt) dates.set(slug === "home" ? "" : `/${slug}`, page.publishedAt);
  }
  return dates;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = canonicalSiteUrl();
  const dates = await publishedDates();
  return ROUTES.map((route) => ({
    url: `${baseUrl}${route}`,
    ...(dates.has(route) ? { lastModified: dates.get(route) } : {}),
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : 0.8,
  }));
}
