import type { Metadata } from "next";
import { getPublishedSeo } from "@/lib/website/queries";

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
  const seo = await getPublishedSeo();
  if (!seo) return {};

  const raw = seo as Record<string, unknown>;
  const title = str(raw, "globalTitle");
  const description = str(raw, "globalDescription");
  const ogImage = str(raw, "defaultOgImage");
  const twitterTitle = str(raw, "twitterTitle") ?? title;
  const twitterDescription = str(raw, "twitterDescription") ?? description;
  const twitterImage = str(raw, "twitterImage");

  const meta: Metadata = {};
  if (title) meta.title = title;
  if (description) meta.description = description;
  if (ogImage) meta.openGraph = { title: twitterTitle, description: twitterDescription, images: [ogImage] };
  if (twitterImage) meta.twitter = { title: twitterTitle, description: twitterDescription, images: [twitterImage] };

  return meta;
}