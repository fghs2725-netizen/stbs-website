"use client";

import { useRef, useState } from "react";
import { Check, Loader2, Upload, X } from "lucide-react";
import { ALLOWED_IMAGE_TYPES, compressedNotice, MAX_EDGE_PX, pickSmaller, plannedSize, shouldCompress, validateImageFile, WEBP_QUALITY } from "@/lib/website/image-guard";

export const NO_ALT_STORAGE_NOTE = "This image has no alt-text field yet, so a description can't be saved for it here.";
export const ALT_REQUIRED_MESSAGE = "Describe this image for people who can't see it.";

/** Returns the reason a save must be blocked, or null. Use it to disable Save while an image has no alt text. */
export function imageAltProblem(imageUrl: string | null | undefined, alt: string | null | undefined, what = "image"): string | null {
  return imageUrl && !(alt ?? "").trim() ? `Add alt text for the ${what} before saving.` : null;
}

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

export function ImageUpload({
  value,
  onChange,
  label,
  hint,
  mediaUrls = [],
  altText,
  onAltChange,
  altRequired = true,
  altNote,
  altLabel = "Alt text",
}: {
  value?: string | null;
  onChange: (url: string | null) => void;
  label?: string;
  hint?: string;
  mediaUrls?: string[];
  /** Current alt text. Pass together with onAltChange to show a required alt field under the image. */
  altText?: string;
  onAltChange?: (alt: string) => void;
  altRequired?: boolean;
  /** For images whose data model has nowhere to store alt text: shown as a visible note instead of a field. */
  altNote?: string;
  altLabel?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setNotice(null);
    const check = validateImageFile(file);
    if (!check.ok) {
      setError(check.message);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    setUploading(true);
    try {
      const { file: toSend, note } = await compressImage(file);
      const form = new FormData();
      form.append("file", toSend);
      const res = await fetch("/api/website/upload", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) throw new Error(data.error || "Upload failed");
      onChange(data.url);
      setNotice(`${note ? note + " " : ""}Image uploaded. Save Draft to keep this change.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function handleRemove() {
    // The same uploaded URL may still be the published snapshot. Never delete
    // storage from a draft control: the owning CMS record cleans it up only
    // after it is no longer live.
    onChange(null);
    setError(null);
    setNotice("Image removed from this draft. Save Draft to keep this change.");
  }

  const altMissing = Boolean(onAltChange && altRequired && value && !(altText ?? "").trim());
  const previewAlt = (altText ?? "").trim() || label || "Uploaded image preview";
  const altId = `alt-${(label || "image").toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  return (
    <div>
      {label && <label className="admin-label">{label}</label>}
      {value ? (
        <div className="relative overflow-hidden rounded-lg border border-white/[.08] bg-white/[.02]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt={previewAlt} className="h-40 w-full object-contain" />
          <div className="flex items-center justify-between gap-2 border-t border-white/[.08] p-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-md text-xs font-semibold text-zinc-300 transition-colors hover:bg-white/[.06] hover:text-white disabled:opacity-50"
            >
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} {uploading ? "Uploading…" : "Replace"}
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md px-3 text-xs font-semibold text-red-400 transition-colors hover:bg-red-500/10"
            >
              <X size={14} /> Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex h-40 w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-white/[.12] bg-white/[.02] text-sm text-zinc-400 transition-colors hover:border-signal/50 hover:text-white disabled:opacity-50"
        >
          {uploading ? <Loader2 size={20} className="animate-spin text-signal" /> : <Upload size={20} />}
          {uploading ? "Compressing and uploading…" : "Upload image"}
        </button>
      )}
      {value && onAltChange && (
        <div className="mt-2">
          <label htmlFor={altId} className="admin-label">{altLabel}{altRequired ? " (required)" : ""}</label>
          <input
            id={altId}
            className={`admin-input ${altMissing ? "border-red-400/60" : ""}`}
            value={altText ?? ""}
            onChange={(e) => onAltChange(e.target.value)}
            placeholder="Describe what is actually visible in the photo"
            aria-invalid={altMissing || undefined}
            aria-describedby={altMissing ? `${altId}-err` : undefined}
          />
          {altMissing && <p id={`${altId}-err`} role="alert" className="mt-1 text-xs text-red-400">{ALT_REQUIRED_MESSAGE} Saving is disabled until this is filled in.</p>}
        </div>
      )}
      {value && !onAltChange && altNote && <p className="mt-1.5 text-xs text-amber-400/90">{altNote}</p>}
      {mediaUrls.length > 0 && (
        <div className="mt-3">
          <p className="mb-2 text-xs font-semibold text-zinc-400">Choose from Website Photos</p>
          <div className="grid max-h-48 grid-cols-3 gap-2 overflow-y-auto pr-1">
            {mediaUrls.map((url) => (
              <button key={url} type="button" onClick={() => { onChange(url); setError(null); setNotice("Website Photo selected. Save Draft to keep this change."); }} className={`relative aspect-square overflow-hidden rounded-md border ${value === url ? "border-signal ring-2 ring-signal/40" : "border-white/10 hover:border-signal/60"}`} aria-label="Use this Website Photo">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="h-full w-full object-cover" />
                {value === url && <span className="absolute inset-0 grid place-items-center bg-black/45 text-signal"><Check size={18} /></span>}
              </button>
            ))}
          </div>
        </div>
      )}
      {hint && <p className="mt-1.5 text-xs text-zinc-500">{hint}</p>}
      {notice && <p role="status" className="mt-1.5 text-xs text-emerald-400">{notice}</p>}
      {error && <p role="alert" className="mt-1.5 text-xs text-red-400">{error}</p>}
      <input ref={inputRef} type="file" accept={ALLOWED_IMAGE_TYPES.join(",")} className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
    </div>
  );
}
