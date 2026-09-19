import type { Metadata } from "next";
import { getPublishedSeo, getPublishedSettings } from "@/lib/website/queries";
import { canonicalSiteUrl, SITE_OG_IMAGE } from "@/lib/site-url";
import { SITE_DEFAULT_DESCRIPTION, SITE_DEFAULT_TITLE } from "@/lib/page-metadata";

/** Rewrites legacy / apex hosts in CMS-entered URLs to the canonical host. */
function canonicalHost(url: string | undefined): string | undefined {
  return url?.replace(/^https?:\/\/(www\.)?(sainitubewell\.com|stbs\.in)(?=\/|$)/i, canonicalSiteUrl());
}

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
  const ogImage = canonicalHost(seo ? str(raw, "defaultOgImage") : str(settingsRaw, "defaultOgImage"));
  // Next.js replaces (does not merge) the parent's openGraph/twitter objects, so an
  // undefined title/description here would erase the root values site-wide.
  const twitterTitle = str(raw, "twitterTitle") ?? title ?? SITE_DEFAULT_TITLE;
  const twitterDescription = str(raw, "twitterDescription") ?? description ?? SITE_DEFAULT_DESCRIPTION;
  const twitterImage = canonicalHost(str(raw, "twitterImage"));

  const meta: Metadata = {};
  if (title) meta.title = title;
  if (description) meta.description = description;
  meta.openGraph = { title: twitterTitle, description: twitterDescription, images: [ogImage || SITE_OG_IMAGE] };
  meta.twitter = { card: "summary_large_image", title: twitterTitle, description: twitterDescription, images: [twitterImage || ogImage || SITE_OG_IMAGE] };

  return meta;
}
