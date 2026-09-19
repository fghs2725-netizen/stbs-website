/** Pure helpers for the CMS image upload: validation, compression planning and size wording. */

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"] as const;
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const WARN_BYTES = 2 * 1024 * 1024;
export const SKIP_COMPRESS_BELOW_BYTES = 300 * 1024;
export const MAX_EDGE_PX = 2400;
export const WEBP_QUALITY = 0.85;

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "0 KB";
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export type ImageCheck = { ok: true; warning?: string } | { ok: false; message: string };

export function validateImageFile(file: { name: string; type: string; size: number }): ImageCheck {
  const type = (file.type || "").toLowerCase();
  if (type === "image/svg+xml" || /\.svg$/i.test(file.name)) return { ok: false, message: "SVG files can't be uploaded here. Use a JPG, PNG or WebP image." };
  if (type === "image/x-icon" || type === "image/vnd.microsoft.icon" || /\.ico$/i.test(file.name)) return { ok: false, message: "Icon (.ico) files can't be uploaded here. Use a PNG image instead." };
  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(type)) return { ok: false, message: "That file isn't a supported image. Use JPG, PNG, WebP, GIF or AVIF." };
  if (file.size <= 0) return { ok: false, message: "That file is empty." };
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, message: `That image is ${formatBytes(file.size)}. The limit is ${formatBytes(MAX_UPLOAD_BYTES)}. Reduce it and try again.` };
  if (file.size > WARN_BYTES && type !== "image/gif") return { ok: true, warning: `This image is ${formatBytes(file.size)}, so it will be compressed before upload.` };
  return { ok: true };
}

/** Scale (width,height) so the long edge is at most maxEdge. Never enlarges. Returns whole pixels (min 1). */
export function plannedSize(width: number, height: number, maxEdge: number = MAX_EDGE_PX): { width: number; height: number; scaled: boolean } {
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));
  const longEdge = Math.max(w, h);
  if (longEdge <= maxEdge) return { width: w, height: h, scaled: false };
  const ratio = maxEdge / longEdge;
  return { width: Math.max(1, Math.round(w * ratio)), height: Math.max(1, Math.round(h * ratio)), scaled: true };
}

/** GIFs may be animated (canvas would flatten them) and small files are not worth re-encoding. */
export function shouldCompress(file: { type: string; size: number }): boolean {
  if (file.type === "image/gif") return false;
  return file.size > SKIP_COMPRESS_BELOW_BYTES;
}

/** Only use the compressed file when it is genuinely smaller. */
export function pickSmaller(originalSize: number, compressedSize: number): "original" | "compressed" {
  return compressedSize > 0 && compressedSize < originalSize ? "compressed" : "original";
}

export const compressedNotice = (before: number, after: number) => `Compressed ${formatBytes(before)} to ${formatBytes(after)}.`;

/** True when alt text is empty or just a camera/file name (IMG_2043, DSC0012.jpg, pxl-20260101), i.e. not a description. */
export function altLooksLikeFilename(alt: string | null | undefined): boolean {
  const t = (alt ?? "").trim();
  if (!t) return true;
  if (/\.(jpe?g|png|webp|gif|avif|heic)$/i.test(t)) return true;
  if (/^(img|dsc|dscn|dscf|pxl|photo|image|pic|whatsapp image|screenshot)[\s_-]*\d/i.test(t)) return true;
  return /^[\w-]+$/.test(t) && /\d{4,}/.test(t) && !/\s/.test(t);
}
