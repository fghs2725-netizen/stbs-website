"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Eye, Plus, Pencil, Copy, Trash2, EyeOff, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImageUpload, NO_ALT_STORAGE_NOTE } from "./ImageUpload";
import { CharCount } from "./CharCount";
import { VersionHistory } from "./VersionHistory";
import { useDirtyTracker, useUnsavedGuard } from "./use-unsaved-guard";
import { Toaster, useToasts } from "@/components/quotation/feedback";
import { ConfirmButton } from "./ConfirmButton";
import { SECTION_TYPES } from "@/lib/website/section-types";
import type { WebsitePageWithSections } from "@/lib/website/action-types";
import {
  updatePage,
  publishPage,
  unpublishPage,
  deletePage,
  createSection,
  updateSectionMeta,
  deleteSection,
  toggleSectionVisibility,
  duplicateSection,
  reorderSections,
} from "@/lib/website/actions";

type PageModel = WebsitePageWithSections;

export function PageEditor({ page }: { page: PageModel }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: page.name,
    slug: page.slug,
    title: page.title ?? "",
    seoTitle: page.seoTitle ?? "",
    metaDescription: page.metaDescription ?? "",
    ogTitle: page.ogTitle ?? "",
    ogDescription: page.ogDescription ?? "",
    ogImage: page.ogImage ?? "",
    hideFromNav: page.hideFromNav,
  });
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const { toasts, push, dismiss } = useToasts();
  const { dirty, markSaved } = useDirtyTracker(form);
  useUnsavedGuard(dirty);
  const fail = (e: unknown, fallback: string) => push("error", e instanceof Error && e.message ? e.message : fallback);

  const set = (key: keyof typeof form, value: string | boolean) => setForm((f) => ({ ...f, [key]: value }));

  async function saveMeta() {
    setBusy("save");
    setNotice(null);
    try {
      await updatePage(page.id, {
        name: form.name,
        slug: form.slug,
        title: form.title || undefined,
        seoTitle: form.seoTitle || undefined,
        metaDescription: form.metaDescription || undefined,
        ogTitle: form.ogTitle || undefined,
        ogDescription: form.ogDescription || undefined,
        ogImage: form.ogImage || null,
        hideFromNav: form.hideFromNav,
      });
      markSaved();
      setNotice("Draft saved.");
      router.refresh();
    } catch (e) {
      fail(e, "Could not save this page. Your changes are still here.");
    } finally {
      setBusy(null);
    }
  }

  async function doPublish() {
    setBusy("publish");
    try {
      await publishPage(page.id);
      setNotice("Page published. Live site updated.");
      router.refresh();
    } catch (e) {
      fail(e, "Could not publish this page. Nothing went live.");
    } finally {
      setBusy(null);
    }
  }

  async function doUnpublish() {
    setBusy("publish");
    try {
      await unpublishPage(page.id);
      setNotice("Page set to draft. Removed from live site.");
      router.refresh();
    } catch (e) {
      fail(e, "Could not unpublish this page.");
    } finally {
      setBusy(null);
    }
  }

  async function doDelete() {
    await deletePage(page.id);
    router.push("/admin/website/pages");
    router.refresh();
  }

  async function addSection(type: string, name: string) {
    setBusy("add");
    try {
      const section = await createSection(page.id, { type, name });
      router.push(`/admin/website/pages/${page.id}/sections/${section.id}`);
    } finally {
      setBusy(null);
    }
  }

  async function move(id: string, dir: -1 | 1) {
    const idx = sections.findIndex((s) => s.id === id);
    const other = sections[idx + dir];
    if (!other) return;
    const ids = sections.map((s) => s.id);
    [ids[idx], ids[idx + dir]] = [ids[idx + dir], ids[idx]];
    await reorderSections(page.id, ids);
    router.refresh();
  }

  const sections = page.sections ?? [];

  const addTypes = Object.entries(SECTION_TYPES);
  const [addType, setAddType] = useState(addTypes[0]?.[0] ?? "");
  const [addName, setAddName] = useState("");

  return (
    <div className="grid gap-6">
      <div className="admin-card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-white/[.08] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold text-white">{page.name}</h2>
            <p className="mt-0.5 text-sm text-zinc-500">
              Status: {page.status === "PUBLISHED" ? "Published" : "Draft"}
              {page.publishedAt ? ` · Last published ${new Date(page.publishedAt).toLocaleString()}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild size="sm" variant="secondary">
              <Link href={`/${page.slug}`} target="_blank"><Eye size={15} /> Open live page</Link>
            </Button>
            {page.status === "PUBLISHED" ? (
              <Button size="sm" variant="secondary" onClick={doUnpublish} disabled={busy === "publish"}>
                {busy === "publish" ? <Loader2 size={15} className="animate-spin" /> : <EyeOff size={15} />}
                Unpublish
              </Button>
            ) : (
              <Button size="sm" onClick={doPublish} disabled={busy === "publish"}>
                {busy === "publish" ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                Publish
              </Button>
            )}
            <ConfirmButton
              label="Delete page"
              variant="destructive"
              message={`Delete "${page.name}" permanently? This soft-deletes the page and its ${sections.length} section(s).`}
              onConfirm={doDelete}
            />
          </div>
        </div>
        {notice && <p className="border-b border-white/[.08] bg-emerald-500/10 px-5 py-3 text-sm text-emerald-400">{notice}</p>}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="admin-card p-6">
          <h3 className="mb-5 font-display text-base font-semibold text-white">Page metadata</h3>
          <div className="space-y-4">
            <div>
              <label className="admin-label">Page name</label>
              <input className="admin-input" value={form.name} onChange={(e) => set("name", e.target.value)} />
            </div>
            <div>
              <label className="admin-label">Slug</label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-zinc-500">/</span>
                <input className="admin-input" value={form.slug} onChange={(e) => set("slug", e.target.value)} />
              </div>
            </div>
            <div>
              <label className="admin-label">Navigation title</label>
              <input className="admin-input" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Used in navigation menus" />
            </div>
            <div>
              <label className="admin-label">SEO title</label>
              <input className="admin-input" value={form.seoTitle} onChange={(e) => set("seoTitle", e.target.value)} />
              <CharCount value={form.seoTitle} max={60} />
            </div>
            <div>
              <label className="admin-label">Meta description</label>
              <textarea className="admin-input min-h-24 resize-y" value={form.metaDescription} onChange={(e) => set("metaDescription", e.target.value)} />
              <CharCount value={form.metaDescription} max={160} />
            </div>
            <div>
              <label className="admin-label">OG title</label>
              <input className="admin-input" value={form.ogTitle} onChange={(e) => set("ogTitle", e.target.value)} />
            </div>
            <div>
              <label className="admin-label">OG description</label>
              <textarea className="admin-input min-h-20 resize-y" value={form.ogDescription} onChange={(e) => set("ogDescription", e.target.value)} />
            </div>
            <ImageUpload label="OG image" value={form.ogImage} onChange={(url) => set("ogImage", url ?? "")} altNote={NO_ALT_STORAGE_NOTE} />
            <label className="flex min-h-11 cursor-pointer items-center gap-3">
              <input type="checkbox" className="size-4 accent-[var(--admin-accent)]" checked={form.hideFromNav} onChange={(e) => set("hideFromNav", e.target.checked)} />
              <span className="text-sm text-zinc-300">Hide from navigation</span>
            </label>
          </div>
          <div className="mt-6">
            <Button onClick={saveMeta} disabled={busy === "save"}>
              {busy === "save" ? <Loader2 size={16} className="animate-spin" /> : null}
              Save draft
            </Button>
            {dirty && <span className="ml-3 text-xs font-medium text-amber-400">Unsaved changes</span>}
          </div>
          <VersionHistory entityType="page" entityId={page.id} />
        </div>

        <div className="admin-card p-6">
          <h3 className="mb-1 font-display text-base font-semibold text-white">Sections</h3>
          <p className="mb-5 text-sm text-zinc-500">Sections render in this order on the public page. Draft changes appear after you Publish.</p>

          <div className="space-y-2">
            {sections.map((section, i) => (
              <div key={section.id} className={`flex flex-col gap-3 rounded-lg border p-3.5 sm:flex-row sm:items-center ${section.visible ? "border-white/[.08] bg-white/[.02]" : "border-white/[.05] bg-white/[.01] opacity-60"}`}>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">{section.name}</p>
                  <p className="text-xs text-zinc-500">
                    {SECTION_TYPES[section.type] ?? section.type}
                    {!section.visible && " · hidden"}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <ReorderControlsRow busy={busy === "reorder"} canUp={i > 0} canDown={i < sections.length - 1} onUp={() => move(section.id, -1)} onDown={() => move(section.id, 1)} />
                  <Button asChild size="icon" variant="ghost" title="Edit section">
                    <Link href={`/admin/website/pages/${page.id}/sections/${section.id}`}><Pencil size={15} /></Link>
                  </Button>
                  <Button size="icon" variant="ghost" title={section.visible ? "Hide" : "Show"} onClick={async () => { await toggleSectionVisibility(section.id); router.refresh(); }}>
                    {section.visible ? <EyeOff size={15} /> : <Eye size={15} />}
                  </Button>
                  <ConfirmButton label="Duplicate" message={`Duplicate "${section.name}"?`} onConfirm={async () => { await duplicateSection(section.id); router.refresh(); }} />
                  <ConfirmButton label="Delete" variant="destructive" message={`Delete "${section.name}"? The live site keeps the last published version.`} onConfirm={async () => { await deleteSection(section.id); router.refresh(); }} />
                </div>
              </div>
            ))}
            {sections.length === 0 && (
              <p className="rounded-lg border border-dashed border-white/[.1] p-6 text-center text-sm text-zinc-500">No sections yet. Add one below.</p>
            )}
          </div>

          <div className="mt-6 rounded-lg border border-white/[.08] bg-white/[.02] p-4">
            <p className="mb-3 text-sm font-semibold text-white">Add section</p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <select className="admin-input sm:flex-1" value={addType} onChange={(e) => setAddType(e.target.value)}>
                {addTypes.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <input className="admin-input sm:flex-1" value={addName} onChange={(e) => setAddName(e.target.value)} placeholder="Section name" />
              <Button onClick={() => addSection(addType, addName || SECTION_TYPES[addType])} disabled={busy === "add" || !addType}>
                {busy === "add" ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                Add
              </Button>
            </div>
          </div>
        </div>
      </div>
      <Toaster toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}

function ReorderControlsRow({ canUp, canDown, onUp, onDown, busy }: { canUp: boolean; canDown: boolean; onUp: () => void; onDown: () => void; busy?: boolean }) {
  return (
    <div className="flex items-center gap-1">
      <button type="button" className="grid size-9 place-items-center rounded-md border border-white/[.08] text-zinc-400 transition-colors hover:border-signal/40 hover:text-white disabled:pointer-events-none disabled:opacity-30" onClick={onUp} disabled={!canUp || busy} aria-label="Move up">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m18 15-6-6-6 6"/></svg>
      </button>
      <button type="button" className="grid size-9 place-items-center rounded-md border border-white/[.08] text-zinc-400 transition-colors hover:border-signal/40 hover:text-white disabled:pointer-events-none disabled:opacity-30" onClick={onDown} disabled={!canDown || busy} aria-label="Move down">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
      </button>
    </div>
  );
}
