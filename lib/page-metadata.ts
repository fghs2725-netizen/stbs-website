import type { Metadata } from "next";
import { absolutePath, SITE_OG_IMAGE } from "@/lib/site-url";
import { SEO } from "@/lib/website/seo-copy";

export const SITE_NAME = "Saini Tubewell Boring Service";
export const SITE_DEFAULT_TITLE: string = SEO.home.title;
export const SITE_DEFAULT_DESCRIPTION: string = SEO.home.description;
const TITLE_SUFFIX = "Saini Tubewell";

interface PageMetadataInput {
  /** Page title without the site suffix (the root layout template appends it). */
  title: string;
  description: string;
  /** Site-relative path, e.g. "/services". */
  path: string;
  /** Absolute or site-relative image URL; defaults to the shared 1200x630 card. */
  image?: string | null;
  /** Use the title exactly as given (home page) instead of appending the suffix. */
  absoluteTitle?: boolean;
  /** Optional social-only overrides (the CMS keeps separate og fields). */
  ogTitle?: string | null;
  ogDescription?: string | null;
}

/**
 * Single builder for per-page metadata. Next.js replaces a parent's `openGraph`
 * and `twitter` objects wholesale rather than merging them, so every page must
 * emit a complete set — otherwise og:title / og:description silently vanish.
 */
export function pageMetadata({ title, description, path, image, absoluteTitle, ogTitle: ogTitleOverride, ogDescription }: PageMetadataInput): Metadata {
  const url = absolutePath(path);
  // A CMS-authored title that already names the brand must not get the suffix twice.
  absoluteTitle = absoluteTitle || title.toLowerCase().includes(TITLE_SUFFIX.toLowerCase());
  // Emit the full title ourselves: the (public) layout sets a plain-string title, which
  // drops the root layout's "%s | Saini Tubewell" template for child pages.
  const fullTitle = absoluteTitle ? title : `${title} | ${TITLE_SUFFIX}`;
  const ogTitle = ogTitleOverride || fullTitle;
  const ogDesc = ogDescription || description;
  const img = image ? (image.startsWith("http") ? image : absolutePath(image)) : SITE_OG_IMAGE;
  return {
    title: { absolute: fullTitle },
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: "en_IN",
      url,
      title: ogTitle,
      description: ogDesc,
      images: [{ url: img, width: 1200, height: 630, alt: `${SITE_NAME} — borewell drilling and water infrastructure` }],
    },
    twitter: { card: "summary_large_image", title: ogTitle, description: ogDesc, images: [img] },
  };
}
