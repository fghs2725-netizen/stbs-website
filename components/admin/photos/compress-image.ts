"use client";

import { compressedNotice, MAX_EDGE_PX, pickSmaller, plannedSize, shouldCompress, WEBP_QUALITY } from "@/lib/website/image-guard";

type Compressed = { file: File; note?: string };

/** Canvas re-encode to WebP: long edge <= 2400px, quality 0.85. Any failure or non-win returns the original file. */
export async function compressImage(file: File): Promise<Compressed> {
  if (!shouldCompress(file)) return { file };
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const target = plannedSize(bitmap.width, bitmap.height, MAX_EDGE_PX);
    const canvas = document.createElement("canvas");
    canvas.width = target.width;
    canvas.height = target.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) { bitmap.close?.(); return { file }; }
    ctx.drawImage(bitmap, 0, 0, target.width, target.height);
    bitmap.close?.();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", WEBP_QUALITY));
    if (!blob || pickSmaller(file.size, blob.size) === "original") return { file };
    const name = file.name.replace(/\.[^.]+$/, "") + ".webp";
    return { file: new File([blob], name, { type: "image/webp" }), note: compressedNotice(file.size, blob.size) };
  } catch {
    return { file };
  }
}
