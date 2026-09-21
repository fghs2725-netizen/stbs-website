"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload, Search, Star, Trash2, Images as ImagesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { compressImage } from "./compress-image";
import { Toaster, useToasts } from "@/components/quotation/feedback";
import { ALLOWED_IMAGE_TYPES, altLooksLikeFilename, validateImageFile } from "@/lib/website/image-guard";
import { ConfirmButton } from "./ConfirmButton";
import type { SerializedGalleryItem } from "@/lib/website/action-types";
import { createGalleryItem, updateGalleryItem, deleteGalleryItem, reorderGalleryItems, publishGalleryItem, unpublishGalleryItem } from "@/lib/website/actions";

type UsageMap = Record<string, { sections: string[]; services: string[] }>;

const SOURCE_LABELS: Record<string, string> = { REAL_PROJECT: "Real project photo" };

export function PhotosManager({ items, categories, usage }: { items: SerializedGalleryItem[]; categories: string[]; usage: UsageMap }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("All");
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const { toasts, push, dismiss } = useToasts();

  const altIssue = (item: SerializedGalleryItem) => {
    const alt = (item.altText ?? "").trim();
    if (!alt) return "Alt text is required.";
    return altLooksLikeFilename(alt) ? "This looks like a file name. Describe what is visible in the photo." : null;
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((it) => {
      if (category !== "All" && it.category !== category) return false;
      if (!q) return true;
      return [it.caption, it.altText, it.category].some((v) => (v ?? "").toLowerCase().includes(q));
    });
  }, [items, query, category]);

  async function handleFiles(files: File[] | undefined) {
    if (!files?.length) return;
    setUploading(true);
    let added = 0;
    const notes: string[] = [];
    try {
      for (const file of files) {
        const check = validateImageFile(file);
        if (!check.ok) { push("error", `${file.name}: ${check.message}`); continue; }
        try {
          const { file: toSend, note } = await compressImage(file);
          const dims = await readDimensions(toSend);
          const form = new FormData();
          form.append("file", toSend);
          const res = await fetch("/api/website/upload", { method: "POST", body: form });
          const data = await res.json().catch(() => ({}));
          if (!res.ok || !data.url) throw new Error(data.error || "Upload failed");
          // The file name is only a stand-in so the record is valid; it is flagged until someone describes the photo.
          const base = file.name.replace(/\.[^.]+$/, "");
          await createGalleryItem({ mediaUrl: data.url, caption: base, altText: base, sourceType: "REAL_PROJECT", width: dims?.width, height: dims?.height, fileSize: toSend.size });
          added++;
          if (note) notes.push(`${file.name}: ${note}`);
        } catch (e) {
          push("error", `${file.name}: ${e instanceof Error && e.message ? e.message : "Upload failed"}`);
        }
      }
      if (added) {
        push("success", `${added} photo${added === 1 ? "" : "s"} uploaded as drafts. Describe each photo (alt text) before publishing.${notes.length ? " " + notes.join(" ") : ""}`);
        router.refresh();
      }
    } finally {
      setUploading(false);
    }
  }

  async function update(id: string, data: Parameters<typeof updateGalleryItem>[1]) {
    setBusyId(id);
    try {
      await updateGalleryItem(id, data);
      router.refresh();
    } catch (e) {
      push("error", e instanceof Error && e.message ? e.message : "Could not save that change.");
    } finally {
      setBusyId(null);
    }
  }

  async function togglePublish(item: SerializedGalleryItem) {
    setBusyId(item.id);
    try {
      if (item.status === "PUBLISHED") await unpublishGalleryItem(item.id);
      else await publishGalleryItem(item.id);
      push("success", item.status === "PUBLISHED" ? "Photo taken off the live site." : "Photo published.");
      router.refresh();
    } catch (e) {
      push("error", e instanceof Error && e.message ? e.message : "Could not change that photo's status.");
    } finally {
      setBusyId(null);
    }
  }

  async function move(index: number, dir: -1 | 1) {
    const other = filtered[index + dir];
    if (!other) return;
    const ids = filtered.map((it) => it.id);
    [ids[index], ids[index + dir]] = [ids[index + dir], ids[index]];
    await reorderGalleryItems(ids);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="a-card flex flex-col gap-4 p-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid flex-1 gap-4 sm:grid-cols-2">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--a-faint)" }} />
            <input className="a-input a-input-search" placeholder="Search by caption, alt text or category…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <select className="a-input" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="All">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <label className="a-btn a-btn-primary cursor-pointer">
          {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
          {uploading ? "Compressing and uploading…" : "Upload photos"}
          <input type="file" multiple accept={ALLOWED_IMAGE_TYPES.join(",")} className="hidden" onChange={(e) => handleFiles(Array.from(e.target.files ?? []))} />
        </label>
      </div>

      {filtered.length === 0 ? (
        <div className="a-card flex flex-col items-center gap-3 p-12 text-center" style={{ color: "var(--a-faint)" }}>
          <ImagesIcon size={34} className="opacity-50" />
          <p>No photos match. Upload some using the button above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {filtered.map((item, i) => {
            const used = usage[item.mediaUrl];
            const usedCount = (used?.sections.length ?? 0) + (used?.services.length ?? 0);
            return (
              <div key={item.id} className="a-card overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.mediaUrl} alt={item.altText ?? ""} className="aspect-[4/3] w-full object-cover" loading="lazy" />
                <div className="space-y-3 p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="min-w-0 truncate text-sm font-semibold" style={{ color: "var(--a-ink)" }}>{item.caption || "Untitled"}</p>
                    <span className="flex shrink-0 items-center gap-1.5">
                      <span className={`a-pill ${item.status === "PUBLISHED" ? "a-pill-positive" : "a-pill-neutral"}`}>
                        {item.status === "PUBLISHED" ? "Live" : "Draft"}
                      </span>
                      <span className={`a-pill ${item.sourceType === "REAL_PROJECT" ? "a-pill-positive" : "a-pill-neutral"}`}>
                        {SOURCE_LABELS[item.sourceType] ?? item.sourceType}
                      </span>
                    </span>
                  </div>

                  <div className="a-num text-[11px] leading-5" style={{ color: "var(--a-faint)" }}>
                    {item.width && item.height ? `${item.width}×${item.height}px` : ""}
                    {item.fileSize ? ` · ${formatBytes(item.fileSize)}` : ""}
                  </div>

                  <div className="space-y-2">
                    <input className="a-input min-h-10 !py-1.5 text-sm" placeholder="Caption" defaultValue={item.caption ?? ""} onBlur={(e) => e.target.value !== item.caption && update(item.id, { caption: e.target.value || undefined })} />
                    <div>
                      <input
                        className={`a-input min-h-10 !py-1.5 text-sm ${altIssue(item) ? "!border-red-500" : ""}`}
                        placeholder="Alt text (required): describe what is visible"
                        aria-label="Alt text (required)"
                        aria-invalid={altIssue(item) ? true : undefined}
                        defaultValue={item.altText ?? ""}
                        onBlur={(e) => {
                          const value = e.target.value.trim();
                          if (!value) { push("error", "Alt text can't be empty. Describe the photo."); e.target.value = item.altText ?? ""; return; }
                          if (value !== item.altText) void update(item.id, { altText: value });
                        }}
                      />
                      {altIssue(item) && <p role="alert" className="mt-1 text-xs" style={{ color: "var(--a-danger)" }}>{altIssue(item)}</p>}
                    </div>
                    <input className="a-input min-h-10 !py-1.5 text-sm" placeholder="Category" defaultValue={item.category ?? ""} onBlur={(e) => e.target.value !== item.category && update(item.id, { category: e.target.value || undefined })} />
                    <p className="rounded-md px-3 py-2 text-xs" style={{ background: "var(--a-positive-soft)", color: "var(--a-positive)" }}>Gallery policy: real project photos only. Stock, generated and illustration assets are not accepted.</p>
                  </div>

                  {usedCount > 0 && (
                    <p className="rounded-md px-2.5 py-1.5 text-[11px]" style={{ background: "var(--a-warn-soft)", color: "var(--a-warn)" }}>
                      Used in {used?.sections.length ?? 0} section{s((used?.sections.length ?? 0))} and {used?.services.length ?? 0} service{s((used?.services.length ?? 0))}.
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <button type="button" className="grid size-9 place-items-center rounded-md disabled:opacity-30" style={{ border: "1px solid var(--a-hairline-strong)", color: "var(--a-muted)" }} onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m18 15-6-6-6 6"/></svg>
                    </button>
                    <button type="button" className="grid size-9 place-items-center rounded-md disabled:opacity-30" style={{ border: "1px solid var(--a-hairline-strong)", color: "var(--a-muted)" }} onClick={() => move(i, 1)} disabled={i === filtered.length - 1} aria-label="Move down">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
                    </button>
                    <button type="button" className="grid size-9 place-items-center rounded-md" style={{ border: item.featured ? "1px solid var(--a-brand)" : "1px solid var(--a-hairline-strong)", color: item.featured ? "var(--a-brand)" : "var(--a-muted)" }} onClick={() => update(item.id, { featured: !item.featured })} aria-label="Toggle featured" title="Featured">
                      <Star size={14} fill={item.featured ? "currentColor" : "none"} />
                    </button>
                    <button
                      type="button"
                      className={`a-btn a-btn-sm ml-auto ${item.status === "PUBLISHED" ? "a-btn-secondary" : "a-btn-primary"}`}
                      onClick={() => void togglePublish(item)}
                      disabled={busyId === item.id || (item.status !== "PUBLISHED" && Boolean(altIssue(item)))}
                      title={item.status !== "PUBLISHED" && altIssue(item) ? "Describe the photo (alt text) before publishing" : undefined}
                    >
                      {item.status === "PUBLISHED" ? "Live" : "Publish"}
                    </button>
                    <ConfirmButton
                      label="Delete"
                      variant="destructive"
                      message={usedCount > 0 ? `This photo is used in ${usedCount} place(s). Deleting it may leave broken images there until content is updated. Delete anyway?` : "Delete this photo permanently?"}
                      onConfirm={async () => { await deleteGalleryItem(item.id); router.refresh(); }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <Toaster toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}

function readDimensions(file: File): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve(null);
    img.src = url;
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  });
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function s(n: number) {
  return n === 1 ? "" : "s";
}
