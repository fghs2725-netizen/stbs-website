/**
 * Resolve the origin URL for Puppeteer internal navigation.
 *
 * Vercel Deployment Protection intercepts requests to deployment-specific
 * hostnames (VERCEL_URL) and redirects headless browsers to /login.
 * Use the canonical public site URL instead when available.
 *
 * Priority:
 *   1. NEXT_PUBLIC_SITE_URL (configured canonical public URL)
 *   2. SITE_URL
 *   3. VERCEL_PROJECT_PRODUCTION_URL (Vercel production domain)
 *   4. VERCEL_URL (deployment URL, may be behind protection)
 *   5. requestOrigin (local development)
 */
export function trustedPdfOrigin(requestOrigin: string): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL;
  if (configured) return configured.replace(/\/$/, "");

  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  if (process.env.VERCEL) {
    throw new Error(
      "PDF_TRUSTED_ORIGIN_MISSING: set NEXT_PUBLIC_SITE_URL in Vercel environment",
    );
  }

  return requestOrigin;
}

export function assertPdfRenderPathname(finalUrl: string): void {
  try {
    const url = new URL(finalUrl);
    if (!url.pathname.startsWith("/internal/")) {
      const host = url.host;
      if (host.includes("vercel") && url.pathname === "/login") {
        throw new Error(
          "PDF_RENDER_DEPLOYMENT_PROTECTED: Vercel login page intercepted the render request. Ensure NEXT_PUBLIC_SITE_URL is set to the canonical production domain.",
        );
      }
      throw new Error(
        `PDF_RENDER_UNEXPECTED_PATH: expected /internal/* but got ${url.pathname}`,
      );
    }
  } catch (e) {
    if (e instanceof Error && (e.message.startsWith("PDF_RENDER_DEPLOYMENT_PROTECTED") || e.message.startsWith("PDF_RENDER_UNEXPECTED_PATH"))) throw e;
    throw new Error(`PDF_RENDER_URL_INVALID: ${finalUrl}`);
  }
}
