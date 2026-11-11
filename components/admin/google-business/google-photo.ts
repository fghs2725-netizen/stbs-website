"use client";

import { PHOTO_RULES } from "@/lib/google-business/model";

/**
 * Google takes JPG or PNG (not WebP), at least 250px on the short side and under 5 MB, and fetches
 * it from a public address. So a picked photo is redrawn as a JPEG here, then uploaded to the site's
 * public media storage, and Google is given that address.
 */

const MAX_EDGE = 2000;

async function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

export async function prepareGooglePhoto(file: File, { enforceMinimum = true } = {}): Promise<File> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("That file could not be opened as a photo. Use a JPG or PNG.");
  }
  const { width, height } = bitmap;
  if (enforceMinimum && Math.min(width, height) < PHOTO_RULES.minEdge) {
    bitmap.close?.();
    throw new Error(`That photo is ${width}×${height}px. Google needs at least ${PHOTO_RULES.minEdge}px on the short side.`);
  }
  const scale = Math.min(1, MAX_EDGE / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) { bitmap.close?.(); throw new Error("This browser could not prepare the photo."); }
  ctx.fillStyle = "#ffffff"; // a transparent PNG would otherwise turn black as a JPEG
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();

  for (const quality of [0.88, 0.8, 0.7, 0.6]) {
    const blob = await toBlob(canvas, quality);
    if (blob && blob.size <= PHOTO_RULES.maxBytes) {
      if (enforceMinimum && blob.size < PHOTO_RULES.minBytes) throw new Error("That photo is too small for Google (under 10 KB). Use a larger photo.");
      return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
    }
  }
  throw new Error("That photo is too large for Google even after compressing. Use a smaller one.");
}

/** Uploads to the site's public media storage (the same route the website photo manager uses) and returns the address. */
export async function uploadPublic(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/website/upload", { method: "POST", body: form });
  const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!res.ok || !data.url) throw new Error(data.error || "The upload failed. Check the connection and try again.");
  if (!/^https:\/\//.test(data.url)) throw new Error("The photo was stored somewhere Google cannot reach (this only works on the live site).");
  return data.url;
}
