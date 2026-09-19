/**
 * Single authoritative source for the canonical public site origin.
 *
 * Resolves from the project's established NEXT_PUBLIC_SITE_URL convention,
 * falling back to the production host (https://www.stbs.in). Vercel already
 * 308-redirects apex stbs.in -> www.stbs.in, so www IS the canonical host; every
 * canonical/OG/JSON-LD URL must name it, or crawlers see a redirecting canonical.
 * Because these
 * URLs are embedded at build time on Vercel, set NEXT_PUBLIC_SITE_URL to the
 * canonical production domain for the Production environment. It is NOT used
 * for the PDF render pipeline (see lib/pdf-origin.ts) which has its own
 * Vercel-aware fallbacks.
 */
export function canonicalSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  return configured || "https://www.stbs.in";
}

/** Joins the canonical origin with a path, e.g. (siteUrl(), "/verify/") -> https://www.stbs.in/verify/ */
export function absolutePath(path: string): string {
  const base = canonicalSiteUrl();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}

/** Shared 1200x630 social card (built by scripts/generate-brand-assets.py); always on the canonical host. */
export const SITE_OG_IMAGE = absolutePath("/og/stbs-og-1200x630.png");
