"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  EyeOff,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "../ConfirmButton";
import { FieldInput, altKeyFor } from "../field-input";
import { ImageUpload, imageAltProblem, NO_ALT_STORAGE_NOTE } from "../ImageUpload";
import { CharCount } from "../CharCount";
import { anyDrawerDirty, confirmDiscard, useDirtyTracker, useDrawerGuard } from "../use-unsaved-guard";
import { SECTION_TYPES, SECTION_TYPE_DEFS, type SectionField } from "@/lib/website/section-types";
import { useWebsiteEditor, type EditorSignal } from "@/lib/website/editor-context";
import type {
  SerializedClient,
  SerializedGalleryItem,
  SerializedNavItem,
  SerializedSection,
  SerializedService,
  SerializedTestimonial,
  SerializedWebsiteSeo,
  SerializedWebsiteSettings,
} from "@/lib/website/action-types";
import {
  createGalleryItem,
  createNavItem,
  createService,
  createTestimonial,
  createWebsiteClient,
  deleteGalleryItem,
  deleteNavItem,
  deleteService,
  deleteTestimonial,
  deleteWebsiteClient,
  publishGalleryItem,
  publishNavItem,
  publishService,
  publishWebsiteClient,
  publishWebsiteSeo,
  publishWebsiteSettings,
  reorderGalleryItems,
  reorderNavItems,
  reorderServices,
  reorderTestimonials,
  reorderWebsiteClients,
  unpublishGalleryItem,
  unpublishNavItem,
  unpublishWebsiteClient,
  updateGalleryItem,
  updateNavItem,
  updateSectionContent,
  updateSectionMeta,
  updateService,
  updateTestimonial,
  updateTestimonialApproval,
  updateWebsiteClient,
  updateWebsiteSeo,
  updateWebsiteSettings,
} from "@/lib/website/actions";

/* ── shared drawing-room helpers ──────────────────────────────────────────── */

function useRefresh() {
  const router = useRouter();
  return () => router.refresh();
}

function RowShell({ item, name, meta, onOpen, children }: {
  item: { id: string };
  name: string;
  meta: string;
  onOpen: (id: string) => void;
  children: (args: { close: () => void; refresh: () => void }) => ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const refresh = useRefresh();
  const toggle = () => {
    if (expanded) {
      setExpanded(false);
    } else {
      onOpen(item.id);
      setExpanded(true);
    }
  };
  return (
    <div className="rounded-lg border border-white/[.07] bg-white/[.02]">
      <button type="button" onClick={toggle} className="flex w-full min-h-11 items-center justify-between gap-3 px-3 py-2 text-left">
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-white">{name}</span>
          <span className="block truncate text-[11px] text-zinc-500">{meta}</span>
        </span>
        <Pencil size={14} className="shrink-0 text-zinc-500" />
      </button>
      {expanded && <div className="space-y-2.5 border-t border-white/[.07] p-3">{children({ close: () => setExpanded(false), refresh })}</div>}
    </div>
  );
}

function StatusChip({ published }: { published: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${published ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"}`}>
      <span className={`size-1.5 rounded-full ${published ? "bg-emerald-400" : "bg-amber-400"}`} />
      {published ? "Published" : "Draft"}
    </span>
  );
}

function ReorderButtons({ list, onApply }: { list: Array<{ id: string }>; onApply: (ids: string[]) => Promise<void> }) {
  const refresh = useRefresh();
  const [busy, setBusy] = useState(false);
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    const ids = list.map((x) => x.id);
    [ids[i], ids[j]] = [ids[j], ids[i]];
    setBusy(true);
    void onApply(ids).then(() => { setBusy(false); refresh(); });
  };
  return (
    <div className="flex items-center gap-1">
      {busy ? (
        <Loader2 size={14} className="animate-spin text-zinc-500" />
      ) : (
        <>
          <button type="button" onClick={() => move(list.length - 1, -1)} className="inline-flex min-h-9 items-center rounded-md px-1.5 text-zinc-500 hover:bg-white/10 hover:text-white" title="Move last item up"><ArrowUp size={14} /></button>
          <button type="button" onClick={() => move(0, 1)} className="inline-flex min-h-9 items-center rounded-md px-1.5 text-zinc-500 hover:bg-white/10 hover:text-white" title="Move first item down"><ArrowDown size={14} /></button>
        </>
      )}
    </div>
  );
}

export function DrawerHeader({ title, subtitle, onClose }: { title: string; subtitle?: string; onClose: () => void }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-white/[.08] px-5 py-4">
      <div className="min-w-0">
        <h2 className="font-display text-base font-semibold text-white">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-zinc-500">{subtitle}</p>}
      </div>
      <button type="button" onClick={() => { if (confirmDiscard(anyDrawerDirty())) onClose(); }} className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg text-zinc-500 hover:bg-white/10 hover:text-white" aria-label="Close editor"><X size={18} /></button>
    </div>
  );
}

/* ── Section content fields ───────────────────────────────────────────────── */

export function SectionFieldsPanel({ section, onClose, mediaUrls = [] }: { section: SerializedSection; onClose: () => void; mediaUrls?: string[] }) {
  const refresh = useRefresh();
  const def = SECTION_TYPE_DEFS[section.type];
  const [content, setContent] = useState<Record<string, unknown>>(section.content ?? {});
  const [name, setName] = useState(section.name);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const { dirty, markSaved } = useDirtyTracker({ content, name });
  useDrawerGuard(dirty);
  const asStr = (v: unknown) => (typeof v === "string" ? v : "");

  // An image without alt text blocks saving. Alt text lives beside the image (heroImage -> heroImageAlt).
  const altProblems: string[] = [];
  for (const f of def?.fields ?? []) {
    if (f.type === "image") {
      const p = imageAltProblem(asStr(content[f.key]), asStr(content[altKeyFor(f.key)]), f.label.toLowerCase());
      if (p) altProblems.push(p);
    }
  }
  for (const list of def?.lists ?? []) {
    const listRows = Array.isArray(content[list.key]) ? (content[list.key] as unknown[]) : [];
    listRows.forEach((row, i) => {
      if (!row || typeof row !== "object") return;
      const r = row as Record<string, unknown>;
      for (const f of list.fields) {
        if (f.type !== "image") continue;
        const p = imageAltProblem(asStr(r[f.key]), asStr(r[altKeyFor(f.key)]), `${list.label.toLowerCase()} item ${i + 1} image`);
        if (p) altProblems.push(p);
      }
    });
  }
  const pairedAltKeys = new Set((def?.fields ?? []).filter((f) => f.type === "image").map((f) => altKeyFor(f.key)));

  const setField = (key: string, value: unknown) => setContent((c) => ({ ...c, [key]: value }));

  const setList = (index: number, listKey: string, fieldKey: string, value: string) => {
    setContent((c) => {
      const rows = Array.isArray(c[listKey]) ? [...(c[listKey] as Record<string, unknown>[])] : [];
      rows[index] = { ...(rows[index] ?? {}) };
      const listDef = def?.lists?.find((l) => l.key === listKey);
      if (listDef && listDef.fields.length === 1 && listDef.fields[0].key === fieldKey) {
        rows[index] = value as unknown as Record<string, unknown>;
      } else {
        rows[index][fieldKey] = value;
      }
      return { ...c, [listKey]: rows };
    });
  };

  const addRow = (listKey: string) => setContent((c) => {
    const rows = Array.isArray(c[listKey]) ? [...(c[listKey] as unknown[])] : [];
    rows.push({});
    return { ...c, [listKey]: rows };
  });

  const rowValue = (listKey: string, index: number, field: SectionField) => {
    const rows = Array.isArray(content[listKey]) ? (content[listKey] as unknown[]) : [];
    const row = rows[index];
    const listDef = def?.lists?.find((l) => l.key === listKey);
    if (listDef && listDef.fields.length === 1 && listDef.fields[0].key === field.key) {
      return typeof row === "string" ? row : "";
    }
    return (row as Record<string, unknown>)?.[field.key] ?? "";
  };

  const save = async () => {
    if (altProblems.length) { setNotice(`Could not save draft: ${altProblems[0]}`); return; }
    setBusy(true);
    setNotice(null);
    try {
      await updateSectionContent(section.id, content as object);
      await updateSectionMeta(section.id, { name });
      markSaved();
      setNotice("Draft saved. Publish this page to make it live.");
      refresh();
    } catch (error) {
      setNotice(error instanceof Error ? `Could not save draft: ${error.message}` : "Could not save draft. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <DrawerHeader title={SECTION_TYPES[section.type] ?? "Section"} subtitle={`Drag-free editing · ${section.visible ? "visible" : "hidden"} · ${section.publishedAt ? `last published ${new Date(section.publishedAt).toLocaleDateString()}` : "never published"}`} onClose={onClose} />
      <div className="flex-1 space-y-4 overflow-y-auto p-5 pb-24">
        <div>
          <label className="admin-label">Section name</label>
          <input className="admin-input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        {def ? (
          <>
            {(def.fields ?? []).filter((f) => !pairedAltKeys.has(f.key)).map((field) => (
              <div key={field.key}>
                <label className="admin-label">{field.label}</label>
                <FieldInput
                  field={field}
                  value={content[field.key]}
                  onChange={(v) => setField(field.key, v)}
                  mediaUrls={mediaUrls}
                  {...(field.type === "image" ? { altText: asStr(content[altKeyFor(field.key)]), onAltChange: (v: string) => setField(altKeyFor(field.key), v) } : {})}
                />
              </div>
            ))}
            {def.lists?.map((list) => {
              const rows = Array.isArray(content[list.key]) ? (content[list.key] as unknown[]) : [];
              return (
                <div key={list.key} className="rounded-lg border border-white/[.08] bg-white/[.02] p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-semibold text-white">{list.label} ({rows.length})</p>
                    <Button size="sm" variant="secondary" onClick={() => addRow(list.key)}><Plus size={14} /> Add</Button>
                  </div>
                  <div className="space-y-2.5">
                    {rows.map((_row, i) => (
                      <div key={i} className="rounded-lg border border-white/[.06] bg-black/20 p-2.5">
                        <div className={`grid gap-2.5 ${list.fields.length > 1 ? "lg:grid-cols-2" : ""}`}>
                          {list.fields.filter((f) => !list.fields.some((g) => g.type === "image" && altKeyFor(g.key) === f.key)).map((field) => (
                            <div key={field.key}>
                              {list.fields.length > 1 && <label className="admin-label">{field.label}</label>}
                              <FieldInput
                                field={field}
                                value={rowValue(list.key, i, field)}
                                onChange={(v) => setList(i, list.key, field.key, v)}
                                mediaUrls={mediaUrls}
                                {...(field.type === "image" ? { altText: asStr(rowValue(list.key, i, { key: altKeyFor(field.key) } as SectionField)), onAltChange: (v: string) => setList(i, list.key, altKeyFor(field.key), v) } : {})}
                              />
                            </div>
                          ))}
                        </div>
                        <div className="mt-2 text-right">
                          <button type="button" onClick={() => setContent((c) => {
                            const rows2 = Array.isArray(c[list.key]) ? [...(c[list.key] as unknown[])] : [];
                            rows2.splice(i, 1);
                            return { ...c, [list.key]: rows2 };
                          })} className="inline-flex min-h-9 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold text-red-400 hover:bg-red-500/10">
                            <Trash2 size={13} /> Remove
                          </button>
                        </div>
                      </div>
                    ))}
                    {rows.length === 0 && <p className="text-xs text-zinc-500">No items yet.</p>}
                  </div>
                </div>
              );
            })}
          </>
        ) : (
          <p className="text-xs text-zinc-500">This section type has no structured editor. Use the page editor for raw JSON.</p>
        )}

        {notice && <p role="status" className={`rounded-lg px-4 py-3 text-sm ${notice.startsWith("Could not") ? "bg-red-500/10 text-red-400" : "bg-emerald-500/10 text-emerald-400"}`}>{notice}</p>}
      </div>
      <div className="border-t border-white/[.08] bg-[#141416] px-5 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={save} disabled={busy || altProblems.length > 0} title={altProblems[0]}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : null}
            {busy ? "Saving…" : "Save draft"}
          </Button>
          {dirty && <span className="text-xs font-medium text-amber-400">Unsaved changes</span>}
          {altProblems.length > 0 && <span role="alert" className="text-xs text-red-400">{altProblems[0]}</span>}
          <Button asChild size="sm" variant="ghost">
            <Link href={`/admin/website/pages/${section.pageId}`} target="_blank">Advanced page editor ↗</Link>
          </Button>
        </div>
        <p className="mt-3 text-xs leading-5 text-zinc-500">Sections go live only when this page is Published.</p>
      </div>
    </div>
  );
}

/* ── Services ─────────────────────────────────────────────────────────────── */

function DraftServiceForm({ existing, onDone, mediaUrls = [] }: { existing?: SerializedService; onDone: () => void; mediaUrls?: string[] }) {
  const refresh = useRefresh();
  const [title, setTitle] = useState(existing?.title ?? "");
  const [slug, setSlug] = useState(existing?.slug ?? "");
  const [shortDescription, setShortDescription] = useState(existing?.shortDescription ?? "");
  const [image, setImage] = useState(existing?.image ?? "");
  const [visible, setVisible] = useState(existing?.visible ?? true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const { dirty, markSaved } = useDirtyTracker({ title, slug, shortDescription, image, visible });
  useDrawerGuard(dirty);

  const save = async () => {
    setBusy(true); setNotice(null);
    try {
      if (existing) {
        await updateService(existing.id, { title, slug: slug || title, shortDescription: shortDescription || undefined, image: image || undefined, visible });
      } else if (title.trim()) {
        const created = (await createService({ title: title.trim(), slug: slug || title, shortDescription: shortDescription || undefined })) as unknown as SerializedService;
        if (image) await updateService(created.id, { image: image || undefined });
      }
      markSaved();
      setNotice("Draft saved. Publish to update the live website."); onDone(); refresh();
    } catch (error) { setNotice(error instanceof Error ? `Could not save draft: ${error.message}` : "Could not save draft."); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-2.5 rounded-lg border border-white/[.06] bg-black/20 p-3">
      <input className="admin-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Service title" />
      <input className="admin-input" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="Slug (optional url path)" />
      <textarea className="admin-input min-h-20 resize-y" value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} placeholder="Short description shown on cards" />
      <CharCount value={shortDescription} max={160} />
      <div>
        <label className="admin-label">Card image</label>
        <ImageUpload label="" value={image || null} onChange={(url) => setImage(url ?? "")} hint="Upload to Vercel Blob or choose a Website Photo." mediaUrls={mediaUrls} altNote={NO_ALT_STORAGE_NOTE} />
      </div>
      <label className="flex min-h-11 items-center gap-2 text-sm text-zinc-300">
        <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} className="size-4 accent-signal" />
        Visible on the website
      </label>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={save} disabled={busy || !title.trim()}>
          {busy ? <Loader2 size={14} className="animate-spin" /> : null}
          {existing ? "Save service" : "Add service"}
        </Button>
        {existing && <Button size="sm" variant="secondary" onClick={async () => { await publishService(existing.id); refresh(); }}><CheckCircle2 size={14} /> Publish</Button>}
      </div>
      {notice && <p role="status" className={`text-xs ${notice.startsWith("Could not") ? "text-red-400" : "text-emerald-400"}`}>{notice}</p>}
    </div>
  );
}

export function ServicesPanel({ items, onClose }: { items: SerializedService[]; onClose: () => void }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <div className="flex h-full flex-col">
      <DrawerHeader title="Services" subtitle={`${items.length} service(s) · edited in place on the homepage`} onClose={onClose} />
      <div className="flex-1 space-y-3 overflow-y-auto p-5 pb-24">
        {items.map((s) => (
          <RowShell key={s.id} item={s} name={s.title || s.slug} meta={`${s.visible ? "visible" : "hidden"} · position ${s.position + 1}`} onOpen={setOpenId}>
            {({ close }) => (
              <>
                <DraftServiceForm existing={s} onDone={() => setOpenId(null)} mediaUrls={items.map((item) => item.image).filter((url): url is string => Boolean(url))} />
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <ReorderButtons list={items} onApply={reorderServices} />
                    <ConfirmButton label="Delete" variant="destructive" message={`Delete "${s.title}"? The image is also removed from storage.`} onConfirm={async () => { await deleteService(s.id); close(); }} />
                  </div>
                  <StatusChip published={s.status === "PUBLISHED"} />
                </div>
              </>
            )}
          </RowShell>
        ))}
        {adding && <DraftServiceForm onDone={() => setAdding(false)} mediaUrls={items.map((item) => item.image).filter((url): url is string => Boolean(url))} />}
        {!adding && (
          <Button variant="secondary" className="w-full" onClick={() => setAdding(true)}><Plus size={15} /> Add service</Button>
        )}
        <div className="flex items-start gap-2">
          <ReorderButtons list={items} onApply={reorderServices} />
          <p className="text-[11px] leading-4 text-zinc-600">Use the arrows to move the first/last service and reorder the list.</p>
        </div>
      </div>
    </div>
  );
}

/* ── Gallery ──────────────────────────────────────────────────────────────── */

function DraftGalleryForm({ existing, onDone, mediaUrls = [] }: { existing?: SerializedGalleryItem; onDone: () => void; mediaUrls?: string[] }) {
  const refresh = useRefresh();
  const [mediaUrl, setMediaUrl] = useState(existing?.mediaUrl ?? "");
  const [caption, setCaption] = useState(existing?.caption ?? "");
  const [altText, setAltText] = useState(existing?.altText ?? "");
  const [category, setCategory] = useState(existing?.category ?? "");
  const [sourceType, setSourceType] = useState(existing?.sourceType ?? "REAL_PROJECT");
  const [visible, setVisible] = useState(existing?.visible ?? true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const { dirty, markSaved } = useDirtyTracker({ mediaUrl, caption, altText, category, sourceType, visible });
  useDrawerGuard(dirty);
  const altBlocked = Boolean(mediaUrl.trim()) && !altText.trim();

  const save = async () => {
    if (!mediaUrl.trim()) return;
    if (altBlocked) { setNotice("Could not save draft: describe the photo (alt text) first."); return; }
    setBusy(true); setNotice(null);
    try {
      if (existing) {
        await updateGalleryItem(existing.id, { mediaUrl: mediaUrl.trim(), caption: caption || undefined, altText: altText || undefined, category: category || undefined, sourceType, visible });
      } else {
        const created = (await createGalleryItem({ mediaUrl: mediaUrl.trim(), caption: caption || undefined, altText: altText || undefined, category: category || undefined, sourceType })) as unknown as SerializedGalleryItem;
        if (visible === false) await updateGalleryItem(created.id, { visible: false });
      }
      markSaved();
      setNotice("Draft saved. Publish to update the live website."); onDone(); refresh();
    } catch (error) { setNotice(error instanceof Error ? `Could not save draft: ${error.message}` : "Could not save draft."); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-2.5 rounded-lg border border-white/[.06] bg-black/20 p-3">
      <div>
        <label className="admin-label">Photo</label>
        <ImageUpload label="" value={mediaUrl || null} onChange={(url) => setMediaUrl(url ?? "")} hint="Upload a new photo to Vercel Blob or choose a Website Photo." mediaUrls={mediaUrls} altText={altText} onAltChange={setAltText} />
        {mediaUrl && <img src={mediaUrl} alt="" className="mt-2 h-24 w-full rounded-md object-cover" />}
      </div>
      <input className="admin-input" value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Caption (shown on the website)" />
      <div className="grid grid-cols-2 gap-2.5">
        <input className="admin-input" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Category (e.g. Industrial)" />
        <select className="admin-input" value={sourceType} onChange={(e) => setSourceType(e.target.value as SerializedGalleryItem["sourceType"])}>
          <option value="REAL_PROJECT">Real project</option>
          <option value="STOCK">Stock</option>
          <option value="GENERATED">Generated</option>
          <option value="ILLUSTRATION">Illustration</option>
        </select>
      </div>
      <label className="flex min-h-11 items-center gap-2 text-sm text-zinc-300">
        <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} className="size-4 accent-signal" />
        Visible on the website
      </label>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={save} disabled={busy || !mediaUrl.trim() || altBlocked} title={altBlocked ? "Describe the photo (alt text) before saving" : undefined}>
          {busy ? <Loader2 size={14} className="animate-spin" /> : null}
          {existing ? "Save photo" : "Add photo"}
        </Button>
        {existing && (
          <Button size="sm" variant="secondary" onClick={async () => {
            if (existing.deleteOnPublish) await publishGalleryItem(existing.id);
            else if (existing.publishedAt) await unpublishGalleryItem(existing.id);
            else await publishGalleryItem(existing.id);
            refresh();
          }}>
            {existing.publishedAt && !existing.deleteOnPublish ? <EyeOff size={14} /> : <CheckCircle2 size={14} />}
            {existing.deleteOnPublish ? "Publish deletion" : existing.publishedAt ? "Unpublish" : "Publish"}
          </Button>
        )}
      </div>
      {notice && <p role="status" className={`text-xs ${notice.startsWith("Could not") ? "text-red-400" : "text-emerald-400"}`}>{notice}</p>}
    </div>
  );
}

export function GalleryPanel({ items, onClose }: { items: SerializedGalleryItem[]; onClose: () => void }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <div className="flex h-full flex-col">
      <DrawerHeader title="Gallery photos" subtitle={`${items.length} photo(s) · shown on the homepage & /gallery`} onClose={onClose} />
      <div className="flex-1 space-y-3 overflow-y-auto p-5 pb-24">
        {items.map((g) => (
          <RowShell key={g.id} item={g} name={g.caption ?? g.altText ?? g.mediaUrl} meta={`${g.category ?? "Uncategorised"} · position ${g.position + 1}`} onOpen={setOpenId}>
            {({ close }) => (
              <>
                <DraftGalleryForm existing={g} onDone={() => setOpenId(null)} mediaUrls={items.map((item) => item.mediaUrl)} />
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <ReorderButtons list={items} onApply={reorderGalleryItems} />
                    <ConfirmButton label="Delete" variant="destructive" message={`Delete this photo? The blob is removed from storage.`} onConfirm={async () => { await deleteGalleryItem(g.id); close(); }} />
                  </div>
                  <StatusChip published={Boolean(g.publishedAt)} />
                </div>
              </>
            )}
          </RowShell>
        ))}
        {adding && <DraftGalleryForm onDone={() => setAdding(false)} mediaUrls={items.map((item) => item.mediaUrl)} />}
        {!adding && (
          <Button variant="secondary" className="w-full" onClick={() => setAdding(true)}><Plus size={15} /> Add photo</Button>
        )}
        <div className="flex items-start gap-2">
          <ReorderButtons list={items} onApply={reorderGalleryItems} />
          <p className="text-[11px] leading-4 text-zinc-600">Only Published photos appear on the public website.</p>
        </div>
      </div>
    </div>
  );
}

/* ── Clients ──────────────────────────────────────────────────────────────── */

function DraftClientForm({ existing, onDone, mediaUrls = [] }: { existing?: SerializedClient; onDone: () => void; mediaUrls?: string[] }) {
  const refresh = useRefresh();
  const [name, setName] = useState(existing?.name ?? "");
  const [logoUrl, setLogoUrl] = useState(existing?.logoUrl ?? "");
  const [sector, setSector] = useState(existing?.sector ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [featured, setFeatured] = useState(existing?.featured ?? false);
  const [visible, setVisible] = useState(existing?.visible ?? true);
  const [altText, setAltText] = useState(existing?.altText ?? "");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const { dirty, markSaved } = useDirtyTracker({ name, logoUrl, sector, description, featured, visible, altText });
  useDrawerGuard(dirty);
  const altBlocked = Boolean(logoUrl) && !altText.trim();

  const save = async () => {
    if (altBlocked) { setNotice("Could not save draft: describe the logo (alt text) first."); return; }
    setBusy(true); setNotice(null);
    try {
      if (existing) {
        await updateWebsiteClient(existing.id, { name, altText: altText || undefined, logoUrl: logoUrl || undefined, sector: sector || undefined, description: description || undefined, featured, visible });
      } else if (name.trim()) {
        await createWebsiteClient({ name: name.trim(), altText: altText || undefined, logoUrl: logoUrl || undefined, sector: sector || undefined, description: description || undefined, featured });
      }
      markSaved();
      setNotice("Draft saved. Publish to update the live website."); onDone(); refresh();
    } catch (error) { setNotice(error instanceof Error ? `Could not save draft: ${error.message}` : "Could not save draft."); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-2.5 rounded-lg border border-white/[.06] bg-black/20 p-3">
      <input className="admin-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Client / organisation name" />
      <div>
        <label className="admin-label">Logo</label>
        <ImageUpload label="" value={logoUrl || null} onChange={(url) => setLogoUrl(url ?? "")} hint="Upload to Vercel Blob or choose a Website Photo." mediaUrls={mediaUrls} altText={altText} onAltChange={setAltText} altLabel="Logo alt text" />
      </div>
      <input className="admin-input" value={sector} onChange={(e) => setSector(e.target.value)} placeholder="Sector (e.g. Institutional)" />
      <textarea className="admin-input min-h-16 resize-y" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short description (optional)" />
      <div className="flex flex-wrap gap-4">
        <label className="flex min-h-11 items-center gap-2 text-sm text-zinc-300">
          <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} className="size-4 accent-signal" />
          Featured
        </label>
        <label className="flex min-h-11 items-center gap-2 text-sm text-zinc-300">
          <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} className="size-4 accent-signal" />
          Visible
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={save} disabled={busy || !name.trim() || altBlocked} title={altBlocked ? "Describe the logo (alt text) before saving" : undefined}>
          {busy ? <Loader2 size={14} className="animate-spin" /> : null}
          {existing ? "Save client" : "Add client"}
        </Button>
        {existing && (
          <Button size="sm" variant="secondary" onClick={async () => {
            if (existing.publishedAt) await unpublishWebsiteClient(existing.id);
            else await publishWebsiteClient(existing.id);
            refresh();
          }}>
            {existing.publishedAt ? <EyeOff size={14} /> : <CheckCircle2 size={14} />}
            {existing.publishedAt ? "Unpublish" : "Publish"}
          </Button>
        )}
      </div>
      {notice && <p role="status" className={`text-xs ${notice.startsWith("Could not") ? "text-red-400" : "text-emerald-400"}`}>{notice}</p>}
    </div>
  );
}

export function ClientsPanel({ items, onClose }: { items: SerializedClient[]; onClose: () => void }) {
  const [adding, setAdding] = useState(false);
  return (
    <div className="flex h-full flex-col">
      <DrawerHeader title="Clients" subtitle={`${items.length} client(s) · featured clients appear on the homepage`} onClose={onClose} />
      <div className="flex-1 space-y-3 overflow-y-auto p-5 pb-24">
        {items.map((c) => (
          <RowShell key={c.id} item={c} name={c.name} meta={`${c.sector ?? "No sector"} · ${c.featured ? "featured" : "standard"} · position ${c.position + 1}`} onOpen={() => {}}>
            {({ close }) => (
              <>
                <DraftClientForm existing={c} onDone={close} mediaUrls={items.map((item) => item.logoUrl).filter((url): url is string => Boolean(url))} />
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <ReorderButtons list={items} onApply={reorderWebsiteClients} />
                    <ConfirmButton label="Delete" variant="destructive" message={`Delete "${c.name}"?`} onConfirm={async () => { await deleteWebsiteClient(c.id); close(); }} />
                  </div>
                  <StatusChip published={Boolean(c.publishedAt)} />
                </div>
              </>
            )}
          </RowShell>
        ))}
        {adding && <DraftClientForm onDone={() => setAdding(false)} mediaUrls={items.map((item) => item.logoUrl).filter((url): url is string => Boolean(url))} />}
        {!adding && (
          <Button variant="secondary" className="w-full" onClick={() => setAdding(true)}><Plus size={15} /> Add client</Button>
        )}
      </div>
    </div>
  );
}

/* ── Testimonials ─────────────────────────────────────────────────────────── */

function DraftTestimonialForm({ existing, onDone }: { existing?: SerializedTestimonial; onDone: () => void }) {
  const refresh = useRefresh();
  const [personName, setPersonName] = useState(existing?.personName ?? "");
  const [quote, setQuote] = useState(existing?.quote ?? "");
  const [designation, setDesignation] = useState(existing?.designation ?? "");
  const [company, setCompany] = useState(existing?.company ?? "");
  const [location, setLocation] = useState(existing?.location ?? "");
  const [rating, setRating] = useState(existing?.rating ?? 5);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const { dirty, markSaved } = useDirtyTracker({ personName, quote, designation, company, location, rating });
  useDrawerGuard(dirty);

  const save = async () => {
    setBusy(true);
    setNotice(null);
    try {
      if (existing) {
        await updateTestimonial(existing.id, { personName, quote, designation: designation || undefined, company: company || undefined, location: location || undefined, rating });
      } else if (personName.trim() && quote.trim()) {
        await createTestimonial({ personName: personName.trim(), quote: quote.trim(), designation: designation || undefined, company: company || undefined, location: location || undefined, rating });
      }
      markSaved();
      onDone();
      refresh();
    } catch (error) {
      setNotice(error instanceof Error && error.message ? `Could not save testimonial: ${error.message}` : "Could not save testimonial. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2.5 rounded-lg border border-white/[.06] bg-black/20 p-3">
      <input className="admin-input" value={personName} onChange={(e) => setPersonName(e.target.value)} placeholder="Person name" />
      <textarea className="admin-input min-h-20 resize-y" value={quote} onChange={(e) => setQuote(e.target.value)} placeholder="Quote" />
      <div className="grid grid-cols-2 gap-2.5">
        <input className="admin-input" value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder="Designation" />
        <input className="admin-input" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company" />
      </div>
      <input className="admin-input" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location" />
      <label className="flex items-center gap-2 text-sm text-zinc-300">
        Rating
        <input type="number" min={1} max={5} value={rating ?? 5} onChange={(e) => setRating(Number(e.target.value))} className="admin-input w-20" />
      </label>
      {existing && (
        <p className="text-[11px] leading-4 text-zinc-500">
          Approval: <span className="font-semibold text-zinc-300">{existing.approval}</span> · any edit returns this to DRAFT. Only APPROVED testimonials show publicly.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={save} disabled={busy || !personName.trim() || !quote.trim()}>
          {busy ? <Loader2 size={14} className="animate-spin" /> : null}
          {existing ? "Save testimonial" : "Add testimonial"}
        </Button>
        {notice && <p role="alert" className="w-full text-xs text-red-400">{notice}</p>}
        {existing && existing.approval !== "APPROVED" && (
          <Button size="sm" variant="secondary" onClick={async () => { await updateTestimonialApproval(existing.id, "APPROVED"); refresh(); }}><CheckCircle2 size={14} /> Approve</Button>
        )}
      </div>
    </div>
  );
}

export function TestimonialsPanel({ items, onClose }: { items: SerializedTestimonial[]; onClose: () => void }) {
  const [adding, setAdding] = useState(false);
  return (
    <div className="flex h-full flex-col">
      <DrawerHeader title="Testimonials" subtitle={`${items.length} testimonial(s) · only APPROVED ones render publicly`} onClose={onClose} />
      <div className="flex-1 space-y-3 overflow-y-auto p-5 pb-24">
        {items.map((t) => (
          <RowShell key={t.id} item={t} name={t.personName} meta={`${t.company ?? "No company"} · ${t.approval} · position ${t.position + 1}`} onOpen={() => {}}>
            {({ close }) => (
              <>
                <DraftTestimonialForm existing={t} onDone={close} />
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <ReorderButtons list={items} onApply={reorderTestimonials} />
                    <ConfirmButton label="Delete" variant="destructive" message={`Delete testimonial from ${t.personName}?`} onConfirm={async () => { await deleteTestimonial(t.id); close(); }} />
                  </div>
                  <StatusChip published={t.approval === "APPROVED"} />
                </div>
              </>
            )}
          </RowShell>
        ))}
        {adding && <DraftTestimonialForm onDone={() => setAdding(false)} />}
        {!adding && (
          <Button variant="secondary" className="w-full" onClick={() => setAdding(true)}><Plus size={15} /> Add testimonial</Button>
        )}
      </div>
    </div>
  );
}

/* ── Navigation ───────────────────────────────────────────────────────────── */

export function NavPanel({ items, onClose }: { items: SerializedNavItem[]; onClose: () => void }) {
  const refresh = useRefresh();
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useDrawerGuard(Boolean(label.trim() || url.trim()));

  const add = async () => {
    if (!label.trim() || !url.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await createNavItem({ label: label.trim(), url: url.trim() });
      setLabel("");
      setUrl("");
      refresh();
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Could not add that menu item.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <DrawerHeader title="Navigation" subtitle={`${items.length} item(s) · shown in the header, in position order`} onClose={onClose} />
      <div className="flex-1 space-y-3 overflow-y-auto p-5 pb-24">
        {items.map((n, i) => (
          <RowShell key={n.id} item={n} name={n.label} meta={`${n.url} · position ${n.position + 1}`} onOpen={() => {}}>
            {({ close }) => (
              <NavItemEditor item={n} close={close} />
            )}
          </RowShell>
        ))}
        <div className="space-y-2.5 rounded-lg border border-white/[.06] bg-black/20 p-3">
          <input className="admin-input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label (e.g. About)" />
          <input className="admin-input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="URL (e.g. /about)" />
          <Button size="sm" onClick={add} disabled={busy || !label.trim() || !url.trim()}>
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Add nav item
          </Button>
          {error && <p role="alert" className="text-xs text-red-400">{error}</p>}
        </div>
        <div className="flex items-start gap-2">
          <ReorderButtons list={items} onApply={reorderNavItems} />
          <p className="text-[11px] leading-4 text-zinc-600">Publish items to change the live site header.</p>
        </div>
      </div>
    </div>
  );
}

function NavItemEditor({ item, close }: { item: SerializedNavItem; close: () => void }) {
  const refresh = useRefresh();
  const [label, setLabel] = useState(item.label);
  const [url, setUrl] = useState(item.url);
  const [visible, setVisible] = useState(item.visible);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { dirty, markSaved } = useDirtyTracker({ label, url, visible });
  useDrawerGuard(dirty);

  const save = async () => {
    if (!label.trim() || !url.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await updateNavItem(item.id, { label: label.trim(), url: url.trim(), visible });
      markSaved();
      refresh();
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Could not save that menu item.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-2 gap-2.5">
        <input className="admin-input" value={label} onChange={(e) => setLabel(e.target.value)} />
        <input className="admin-input" value={url} onChange={(e) => setUrl(e.target.value)} />
      </div>
      <label className="flex min-h-9 items-center gap-2 text-sm text-zinc-300">
        <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} className="size-4 accent-signal" />
        Visible
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={save} disabled={busy}><Loader2 size={14} className={busy ? "animate-spin" : "hidden"} /> Save</Button>
        <Button size="sm" variant="secondary" onClick={async () => { if (item.publishedAt) await unpublishNavItem(item.id); else await publishNavItem(item.id); refresh(); }}>
          <CheckCircle2 size={14} /> {item.publishedAt ? "Unpublish" : "Publish"}
        </Button>
        <ConfirmButton label="Delete" variant="destructive" message={`Delete "${item.label}"?`} onConfirm={async () => { await deleteNavItem(item.id); close(); }} />
        <span className="ml-auto"><StatusChip published={Boolean(item.publishedAt)} /></span>
      </div>
      {error && <p role="alert" className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

/* ── Settings + SEO ───────────────────────────────────────────────────────── */

export function SettingsPanel({ settings, onClose, mediaUrls = [] }: { settings: SerializedWebsiteSettings | null; onClose: () => void; mediaUrls?: string[] }) {
  const refresh = useRefresh();
  const [form, setForm] = useState({
    businessName: settings?.businessName ?? "",
    shortDescription: settings?.shortDescription ?? "",
    phone: settings?.phone ?? "",
    phone2: settings?.phone2 ?? "",
    whatsapp: settings?.whatsapp ?? "",
    email: settings?.email ?? "",
    addressLine1: settings?.addressLine1 ?? "",
    city: settings?.city ?? "",
    state: settings?.state ?? "",
    pinCode: settings?.pinCode ?? "",
    founderName: settings?.founderName ?? "",
    founderTitle: settings?.founderTitle ?? "",
    founderBio: settings?.founderBio ?? "",
    primaryLogoUrl: settings?.primaryLogoUrl ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const { dirty, markSaved } = useDirtyTracker(form);
  useDrawerGuard(dirty);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    setBusy(true);
    setNotice(null);
    try {
      await updateWebsiteSettings({ ...form, phone: form.phone || undefined, phone2: form.phone2 || undefined, whatsapp: form.whatsapp || undefined });
      markSaved();
      setNotice("Draft saved.");
    } catch (e) {
      setNotice(e instanceof Error && e.message ? `Could not save settings: ${e.message}` : "Could not save settings. Please try again.");
    } finally {
      setBusy(false);
      refresh();
    }
  };

  const publish = async () => {
    setBusy(true);
    setNotice(null);
    try { await publishWebsiteSettings(); setNotice("Settings published."); }
    catch (e) { setNotice(e instanceof Error && e.message ? `Could not publish settings: ${e.message}` : "Could not publish settings."); }
    finally { setBusy(false); refresh(); }
  };

  return (
    <div className="flex h-full flex-col">
      <DrawerHeader title="Global settings" subtitle="Brand + contact details used across the website" onClose={onClose} />
      <div className="flex-1 space-y-3 overflow-y-auto p-5 pb-24">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="admin-label">Business name</label>
            <input className="admin-input" value={form.businessName} onChange={set("businessName")} />
          </div>
          <div className="col-span-2">
            <label className="admin-label">Website logo</label>
            <ImageUpload label="" value={form.primaryLogoUrl || null} onChange={(url) => setForm((f) => ({ ...f, primaryLogoUrl: url ?? "" }))} mediaUrls={mediaUrls} hint="This logo is rendered in the shared public header and footer. Save Draft, then Publish settings." altNote={NO_ALT_STORAGE_NOTE} />
          </div>
          <div className="col-span-2">
            <label className="admin-label">Short description (footer tagline)</label>
            <textarea className="admin-input min-h-16 resize-y" value={form.shortDescription} onChange={set("shortDescription")} />
            <CharCount value={form.shortDescription} max={160} />
          </div>
          <div><label className="admin-label">Phone 1</label><input className="admin-input" value={form.phone} onChange={set("phone")} /></div>
          <div><label className="admin-label">Phone 2</label><input className="admin-input" value={form.phone2} onChange={set("phone2")} /></div>
          <div><label className="admin-label">WhatsApp</label><input className="admin-input" value={form.whatsapp} onChange={set("whatsapp")} /></div>
          <div><label className="admin-label">Email</label><input className="admin-input" value={form.email} onChange={set("email")} /></div>
          <div className="col-span-2"><label className="admin-label">Address line 1</label><input className="admin-input" value={form.addressLine1} onChange={set("addressLine1")} /></div>
          <div><label className="admin-label">City</label><input className="admin-input" value={form.city} onChange={set("city")} /></div>
          <div><label className="admin-label">State</label><input className="admin-input" value={form.state} onChange={set("state")} /></div>
          <div className="col-span-2"><label className="admin-label">Pin code</label><input className="admin-input" value={form.pinCode} onChange={set("pinCode")} /></div>
          <div className="col-span-2 border-t border-white/[.07] pt-3">
            <p className="mb-1 text-xs font-bold uppercase tracking-wider text-zinc-500">Founder</p>
          </div>
          <div className="col-span-2"><label className="admin-label">Name</label><input className="admin-input" value={form.founderName} onChange={set("founderName")} /></div>
          <div className="col-span-2"><label className="admin-label">Title</label><input className="admin-input" value={form.founderTitle} onChange={set("founderTitle")} /></div>
          <div className="col-span-2"><label className="admin-label">Bio</label><textarea className="admin-input min-h-20 resize-y" value={form.founderBio} onChange={set("founderBio")} /></div>
        </div>
      </div>
      <div className="border-t border-white/[.08] bg-[#141416] px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={save} disabled={busy}>{busy ? <Loader2 size={15} className="animate-spin" /> : null} {busy ? "Saving…" : "Save draft"}</Button>
          <Button variant="secondary" onClick={publish}><CheckCircle2 size={15} /> Publish settings</Button>
          <span className="ml-auto"><StatusChip published={Boolean(settings?.publishedAt)} /></span>
        </div>
        {dirty && <p className="mt-2 text-xs font-medium text-amber-400">Unsaved changes</p>}
        {notice && <p role="status" className={`mt-2 text-xs ${notice.startsWith("Could not") ? "text-red-400" : "text-emerald-400"}`}>{notice}</p>}
        <p className="mt-3 text-xs leading-5 text-zinc-500">Publishing settings updates the live header/footer contact details.</p>
      </div>
    </div>
  );
}

export function SeoPanel({ seo, onClose }: { seo: SerializedWebsiteSeo | null; onClose: () => void }) {
  const refresh = useRefresh();
  const [form, setForm] = useState({
    globalTitle: seo?.globalTitle ?? "",
    globalDescription: seo?.globalDescription ?? "",
    canonicalUrl: seo?.canonicalUrl ?? "",
    robotsSettings: seo?.robotsSettings ?? "",
    defaultOgImage: seo?.defaultOgImage ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const { dirty, markSaved } = useDirtyTracker(form);
  useDrawerGuard(dirty);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    setBusy(true);
    setNotice(null);
    try {
    await updateWebsiteSeo({ globalTitle: form.globalTitle || undefined, globalDescription: form.globalDescription || undefined, canonicalUrl: form.canonicalUrl || undefined, robotsSettings: form.robotsSettings || undefined, defaultOgImage: form.defaultOgImage || undefined });
      markSaved();
      setNotice("Draft saved.");
    } catch (e) {
      setNotice(e instanceof Error && e.message ? `Could not save SEO settings: ${e.message}` : "Could not save SEO settings. Please try again.");
    } finally {
      setBusy(false);
      refresh();
    }
  };

  const publish = async () => {
    setBusy(true);
    setNotice(null);
    try { await publishWebsiteSeo(); setNotice("SEO settings published."); }
    catch (e) { setNotice(e instanceof Error && e.message ? `Could not publish SEO settings: ${e.message}` : "Could not publish SEO settings."); }
    finally { setBusy(false); refresh(); }
  };

  return (
    <div className="flex h-full flex-col">
      <DrawerHeader title="SEO settings" subtitle="Global search metadata · canonical https://www.stbs.in" onClose={onClose} />
      <div className="flex-1 space-y-3 overflow-y-auto p-5 pb-24">
        <div><label className="admin-label">Global title</label><input className="admin-input" value={form.globalTitle} onChange={set("globalTitle")} /><CharCount value={form.globalTitle} max={60} /></div>
        <div><label className="admin-label">Global description</label><textarea className="admin-input min-h-20 resize-y" value={form.globalDescription} onChange={set("globalDescription")} /><CharCount value={form.globalDescription} max={160} /></div>
        <div>
          <label className="admin-label">Canonical URL</label>
          <input className="admin-input" value={form.canonicalUrl} onChange={set("canonicalUrl")} placeholder="https://www.stbs.in" />
          <p className="mt-1 text-[11px] leading-4 text-zinc-600">Keep this as https://www.stbs.in — apex stbs.in redirects to www, so www is the canonical host.</p>
        </div>
        <div><label className="admin-label">Default OG image</label><ImageUpload label="" value={form.defaultOgImage || null} onChange={(url) => setForm((f) => ({ ...f, defaultOgImage: url ?? "" }))} hint="Upload or paste a URL." altNote={NO_ALT_STORAGE_NOTE} /></div>
        <div><label className="admin-label">Robots settings</label><textarea className="admin-input min-h-14 resize-y" value={form.robotsSettings} onChange={set("robotsSettings")} /></div>
      </div>
      <div className="border-t border-white/[.08] bg-[#141416] px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={save} disabled={busy}>{busy ? <Loader2 size={15} className="animate-spin" /> : null} {busy ? "Saving…" : "Save draft"}</Button>
          <Button variant="secondary" onClick={publish}><CheckCircle2 size={15} /> Publish SEO</Button>
          <span className="ml-auto"><StatusChip published={Boolean(seo?.publishedAt)} /></span>
        </div>
        {dirty && <p className="mt-2 text-xs font-medium text-amber-400">Unsaved changes</p>}
        {notice && <p role="status" className={`mt-2 text-xs ${notice.startsWith("Could not") ? "text-red-400" : "text-emerald-400"}`}>{notice}</p>}
        <p className="mt-3 text-xs leading-5 text-zinc-500">Only published SEO metadata is served to search engines.</p>
      </div>
    </div>
  );
}

/* ── Dispatcher ───────────────────────────────────────────────────────────── */

export function DrawerContent({
  signal,
  services,
  gallery,
  clients,
  testimonials,
  navItems,
  settings,
  seo,
  onClose,
}: {
  signal: EditorSignal;
  services: SerializedService[];
  gallery: SerializedGalleryItem[];
  clients: SerializedClient[];
  testimonials: SerializedTestimonial[];
  navItems: SerializedNavItem[];
  settings: SerializedWebsiteSettings | null;
  seo: SerializedWebsiteSeo | null;
  onClose: () => void;
}) {
  switch (signal.kind) {
    case "section":
    case "section-field":
      return <SectionFieldsPanel section={signal.section} onClose={onClose} mediaUrls={[...new Set(gallery.map((item) => item.mediaUrl))]} />;
    case "services":
      return <ServicesPanel items={services} onClose={onClose} />;
    case "gallery":
      return <GalleryPanel items={gallery} onClose={onClose} />;
    case "clients":
      return <ClientsPanel items={clients} onClose={onClose} />;
    case "testimonials":
      return <TestimonialsPanel items={testimonials} onClose={onClose} />;
    case "nav":
      return <NavPanel items={navItems} onClose={onClose} />;
    case "settings":
      return <SettingsPanel settings={settings} onClose={onClose} mediaUrls={[...new Set(gallery.map((item) => item.mediaUrl))]} />;
    case "seo":
      return <SeoPanel seo={seo} onClose={onClose} />;
    default:
      return null;
  }
}
