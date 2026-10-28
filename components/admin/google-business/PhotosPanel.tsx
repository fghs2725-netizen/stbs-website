"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, ImagePlus, Images, Trash2 } from "lucide-react";
import { ConfirmDialog, Toaster, useToasts } from "@/components/quotation/feedback";
import { EmptyState } from "@/components/admin/shell/ui";
import { PHOTO_CATEGORIES, categoryLabel, type MediaCategory } from "@/lib/google-business/model";
import { addPhotoAction, deletePhotoAction } from "@/app/admin/(dashboard)/google-business/actions";
import { prepareGooglePhoto, uploadPublic } from "./google-photo";

export interface PhotoView { name: string; thumb: string; full: string; category: string; views: number | null; createTime: string }

/** Owner photos on the listing: add (one or many, with what they show) and delete. */
export function PhotosPanel({ photos, total, nextPage, isFirstPage }: { photos: PhotoView[]; total: number; nextPage: string | null; isFirstPage: boolean }) {
  const router = useRouter();
  const { toasts, push, dismiss } = useToasts();
  const [category, setCategory] = useState<MediaCategory>("AT_WORK");
  const [busy, setBusy] = useState("");
  const [deleting, setDeleting] = useState<PhotoView | null>(null);
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const add = async (files: FileList | null) => {
    if (!files?.length) return;
    let added = 0;
    const list = Array.from(files);
    try {
      for (const [i, file] of list.entries()) {
        setBusy(list.length > 1 ? `Adding photo ${i + 1} of ${list.length}…` : "Adding photo…");
        try {
          // Cover and logo are exempt from Google's minimum size.
          const jpeg = await prepareGooglePhoto(file, { enforceMinimum: category !== "COVER" && category !== "PROFILE" });
          const url = await uploadPublic(jpeg);
          const r = await addPhotoAction(url, category);
          if (!r.ok) throw new Error(r.error);
          added++;
        } catch (e) {
          push("error", `${file.name}: ${e instanceof Error ? e.message : "could not be added"}`);
        }
      }
      if (added) {
        push("success", `${added} photo${added === 1 ? "" : "s"} added. Google may take a while to show ${added === 1 ? "it" : "them"} on the listing.`);
        router.refresh();
      }
    } finally {
      setBusy("");
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const remove = () => start(async () => {
    if (!deleting) return;
    const r = await deletePhotoAction(deleting.name);
    setDeleting(null);
    if (!r.ok) return push("error", r.error);
    push("success", r.message ?? "Photo deleted.");
    router.refresh();
  });

  return (
    <>
      <section className="a-card space-y-3 p-4 sm:p-5" aria-labelledby="add-photo-heading">
        <h2 id="add-photo-heading" className="a-h2">Add photos</h2>
        <p className="a-sub">Real photos of rigs, crews and finished jobs do the most for a listing. Pick what they show, then choose one or more.</p>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="What the photos show">
          {PHOTO_CATEGORIES.map((c) => (
            <button key={c.value} type="button" role="radio" aria-checked={category === c.value} title={c.hint} onClick={() => setCategory(c.value)} className="a-pill"
              style={category === c.value ? { background: "var(--a-brand)", color: "#fff" } : { background: "rgba(0,0,0,.06)", color: "var(--a-muted)" }}>{c.label}</button>
          ))}
        </div>
        <input ref={fileRef} type="file" multiple accept="image/jpeg,image/png,image/webp,image/heic,image/heif" className="sr-only" onChange={(e) => add(e.target.files)} />
        <button type="button" className="a-btn a-btn-primary" disabled={!!busy} onClick={() => fileRef.current?.click()}>
          <ImagePlus className="size-4" aria-hidden /> {busy || "Choose photos"}
        </button>
      </section>

      <section className="a-card p-4 sm:p-5" aria-labelledby="photos-heading">
        <h2 id="photos-heading" className="a-h2">Your photos on Google <span className="text-[0.875rem] font-normal" style={{ color: "var(--a-faint)" }}>({total})</span></h2>
        {photos.length ? (
          <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {photos.map((p) => (
              <li key={p.name} className="overflow-hidden rounded-[12px]" style={{ border: "1px solid var(--a-hairline)" }}>
                <a href={p.full} target="_blank" rel="noopener noreferrer" className="block aspect-square" style={{ background: "rgba(0,0,0,.04)" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.thumb} alt={`${categoryLabel(p.category)} photo`} referrerPolicy="no-referrer" loading="lazy" className="size-full object-cover" />
                </a>
                <div className="flex items-center justify-between gap-1 p-2">
                  <div className="min-w-0">
                    <p className="truncate text-[0.8125rem] font-medium" style={{ color: "var(--a-ink)" }}>{categoryLabel(p.category)}</p>
                    {p.views !== null && <p className="flex items-center gap-1 text-[0.75rem]" style={{ color: "var(--a-faint)" }}><Eye className="size-3" aria-hidden /> {p.views.toLocaleString("en-IN")} views</p>}
                  </div>
                  <button type="button" aria-label="Delete this photo" className="inline-flex size-9 shrink-0 items-center justify-center rounded-full" style={{ color: "var(--a-danger)" }} onClick={() => setDeleting(p)}>
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={Images} title="No photos yet" description="Photos you add here, or in Google's own app, show up in this list." />
        )}
        <div className="mt-3 flex justify-between gap-2">
          {!isFirstPage ? <Link href="/admin/google-business/photos" className="a-btn a-btn-secondary a-btn-sm">Back to the start</Link> : <span />}
          {nextPage && <Link href={`/admin/google-business/photos?page=${encodeURIComponent(nextPage)}`} className="a-btn a-btn-secondary a-btn-sm">More photos</Link>}
        </div>
      </section>

      {deleting && (
        <ConfirmDialog title="Delete this photo?" body="It is removed from your Google listing. Customers' own photos are not affected." confirmLabel="Delete photo" destructive busy={pending} onConfirm={remove} onCancel={() => setDeleting(null)} />
      )}
      <Toaster toasts={toasts} onDismiss={dismiss} />
    </>
  );
}
