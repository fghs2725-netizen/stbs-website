import { z } from "zod";

export const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024;
export const MAX_SHARE_BYTES = 50 * 1024 * 1024;
export const DOCUMENT_CATEGORIES = ["GSTIN", "Bank Details", "PAN", "Registration", "Other"] as const;
export const DOCUMENT_TYPES: Record<string, string> = {
  pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp",
  doc: "application/msword", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", csv: "text/csv",
};
export const DOCUMENT_ACCEPT = Object.keys(DOCUMENT_TYPES).map((ext) => `.${ext}`).join(",");
export const documentMetadataSchema = z.object({
  title: z.string().trim().min(1, "Enter a document name.").max(150),
  category: z.enum(DOCUMENT_CATEGORIES),
});
export const documentUploadSchema = documentMetadataSchema.extend({
  originalName: z.string().trim().min(1).max(255).refine((v) => !/[\\/\x00-\x1f]/.test(v), "Invalid filename."),
  size: z.number().int().positive().max(MAX_DOCUMENT_BYTES, "Files must be 20 MB or smaller."),
});
export interface CompanyDocumentItem {
  id: string; title: string; category: string; originalName: string; mimeType: string; size: number; createdAt: string;
}
export function documentMime(name: string) { return DOCUMENT_TYPES[name.split(".").pop()?.toLowerCase() ?? ""] ?? null; }
export function formatDocumentSize(size: number) { return size < 1024 * 1024 ? `${Math.max(1, Math.round(size / 1024))} KB` : `${(size / 1024 / 1024).toFixed(1)} MB`; }
export function previewable(mime: string) { return mime === "application/pdf" || ["image/jpeg", "image/png", "image/webp"].includes(mime); }
export function uniqueDocumentNames(names: string[]): string[] {
  const used = new Set<string>();
  return names.map((original) => {
    const safe = original.replace(/[\\/\x00-\x1f<>:"|?*]/g, "_").replace(/^\.+/, "") || "document";
    const dot = safe.lastIndexOf(".");
    const base = dot > 0 ? safe.slice(0, dot) : safe;
    const ext = dot > 0 ? safe.slice(dot) : "";
    let name = safe, n = 2;
    while (used.has(name.toLowerCase())) name = `${base} (${n++})${ext}`;
    used.add(name.toLowerCase());
    return name;
  });
}

/** Reject obvious type spoofing; these checks do not claim to be a malware scanner. */
export function validDocumentSignature(bytes: Uint8Array, mime: string): boolean {
  const starts = (...values: number[]) => values.every((v, i) => bytes[i] === v);
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.slice(start, end));
  if (mime === "application/pdf") return ascii(0, 5) === "%PDF-";
  if (mime === "image/jpeg") return starts(0xff, 0xd8, 0xff);
  if (mime === "image/png") return starts(137, 80, 78, 71, 13, 10, 26, 10);
  if (mime === "image/webp") return ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP";
  if (mime.includes("openxmlformats")) return starts(80, 75, 3, 4);
  if (mime === "application/msword" || mime === "application/vnd.ms-excel") return starts(0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1);
  if (mime === "text/csv") return bytes.length > 0 && !bytes.includes(0);
  return false;
}
