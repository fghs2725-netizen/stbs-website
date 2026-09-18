import type { Metadata } from "next";
import { getPublishedSeo, getPublishedSettings } from "@/lib/website/queries";
import { SITE_OG_IMAGE } from "@/lib/site-url";

function str(c: Record<string, unknown>, key: string): string | undefined {
  const v = c[key];
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

/**
 * Merges the published global-SEO settings into the public site's metadata.
 *
 * Returns an empty object (→ the static root metadata remains authoritative)
 * until an admin actually publishes SEO settings, so the published CMS SEO
 * controls the public site without changing any other route group.
 */
export async function getPublicSeoMetadata(): Promise<Metadata> {
  const [seo, settings] = await Promise.all([getPublishedSeo(), getPublishedSettings()]);
  if (!seo && !settings) return {};

  const raw = (seo ?? {}) as Record<string, unknown>;
  const settingsRaw = (settings ?? {}) as Record<string, unknown>;
  const title = str(raw, "globalTitle");
  const description = str(raw, "globalDescription");
  // A published SEO record owns this value, including an intentional clear.
  // Settings provide the legacy/global fallback only while SEO is unconfigured.
  const ogImage = (seo ? str(raw, "defaultOgImage") : str(settingsRaw, "defaultOgImage"))?.replace("sainitubewell.com", "stbs.in");
  const twitterTitle = str(raw, "twitterTitle") ?? title;
  const twitterDescription = str(raw, "twitterDescription") ?? description;
  const twitterImage = str(raw, "twitterImage")?.replace("sainitubewell.com", "stbs.in");

  const meta: Metadata = {};
  if (title) meta.title = title;
  if (description) meta.description = description;
  meta.openGraph = { title: twitterTitle, description: twitterDescription, images: [ogImage || SITE_OG_IMAGE] };
  meta.twitter = { card: "summary", title: twitterTitle, description: twitterDescription, images: [twitterImage || ogImage || SITE_OG_IMAGE] };

  return meta;
}
