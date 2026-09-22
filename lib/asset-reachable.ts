/**
 * Whether an image the owner pointed Settings at still resolves.
 *
 * The signature and the UPI QR are stored as URLs that were typed in months ago. When one stops
 * resolving the document printed an empty frame, and the PDF could not recover from it: the renderer
 * captures the page as soon as it loads, so a fallback that runs in the browser afterwards never
 * happens. The answer therefore has to be known on the server, before anything is drawn.
 *
 * The check is cached per URL for the life of the process, and given a short deadline, so a slow or
 * dead host costs one page render at most and never holds an invoice up.
 */
const TIMEOUT_MS = 2000;
const TTL_MS = 10 * 60 * 1000;

const cache = new Map<string, { ok: boolean; at: number }>();

export async function assetReachable(url: string): Promise<boolean> {
  const cached = cache.get(url);
  if (cached && Date.now() - cached.at < TTL_MS) return cached.ok;

  let ok = false;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      // HEAD first: it is what a reachability question deserves. Some hosts refuse it, so a refusal
      // that is not a 404 is retried as a ranged GET rather than being taken for a dead link.
      let response = await fetch(url, { method: "HEAD", signal: controller.signal, redirect: "follow" });
      if (!response.ok && response.status !== 404) {
        response = await fetch(url, { method: "GET", headers: { Range: "bytes=0-0" }, signal: controller.signal, redirect: "follow" });
      }
      ok = response.ok || response.status === 206;
    } finally {
      clearTimeout(timer);
    }
  } catch {
    ok = false;
  }

  cache.set(url, { ok, at: Date.now() });
  return ok;
}

/**
 * The URL to draw with: the configured one when it resolves, and nothing when it does not, which
 * leaves the caller to fall back to the image bundled with the site.
 *
 * A same-origin path is trusted without asking. It is served from `public/` by the same deployment
 * that is rendering, so it is there by definition, and checking would mean the server fetching
 * itself mid-render.
 */
export async function usableAssetUrl(url: string | null | undefined): Promise<string | undefined> {
  const value = url?.trim();
  if (!value) return undefined;
  if (value.startsWith("/")) return value;
  if (!/^https?:\/\//i.test(value)) return undefined;
  return (await assetReachable(value)) ? value : undefined;
}
