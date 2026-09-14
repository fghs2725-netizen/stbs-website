"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImageUpload } from "./ImageUpload";
import { ConfirmButton } from "./ConfirmButton";
import { FeaturesEditor, FaqsEditor } from "./ServiceFields";
import type { SerializedService } from "@/lib/website/action-types";
import { createService, updateService, deleteService, publishService } from "@/lib/website/actions";

export function ServiceForm({ initial }: { initial?: SerializedService }) {
  const router = useRouter();
  const isNew = !initial;
  const [form, setForm] = useState({
    title: initial?.title ?? "",
    slug: initial?.slug ?? "",
    shortDescription: initial?.shortDescription ?? "",
    fullDescription: initial?.fullDescription ?? "",
    icon: initial?.icon ?? "",
    image: initial?.image ?? "",
    ctaText: initial?.ctaText ?? "Request a quote",
    ctaUrl: initial?.ctaUrl ?? "/quote",
    seoTitle: initial?.seoTitle ?? "",
    seoDescription: initial?.seoDescription ?? "",
    visible: initial?.visible ?? true,
  });
  const [features, setFeatures] = useState<Array<string>>(
    (initial?.features as string[] | null) ?? []
  );
  const [faqs, setFaqs] = useState<Array<{ question: string; answer: string }>>(
    (initial?.faqs as Array<{ question: string; answer: string }> | null) ?? []
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof typeof form, value: string | boolean) => setForm((f) => ({ ...f, [key]: value }));

  async function save(alsoPublish = false) {
    setBusy("save");
    setError(null);
    setNotice(null);
    try {
      const payload = {
        title: form.title,
        slug: form.slug,
        shortDescription: form.shortDescription || undefined,
        fullDescription: form.fullDescription || undefined,
        icon: form.icon || undefined,
        image: form.image || undefined,
        ctaText: form.ctaText || undefined,
        ctaUrl: form.ctaUrl || undefined,
        seoTitle: form.seoTitle || undefined,
        seoDescription: form.seoDescription || undefined,
        visible: form.visible,
        features: features.length ? features : undefined,
        faqs: faqs.length ? faqs : undefined,
      };
      let id = initial?.id;
      if (isNew) {
        const created = await createService({ title: form.title, slug: form.slug || form.title, shortDescription: form.shortDescription || undefined, icon: form.icon || undefined });
        id = created.id;
        router.replace(`/admin/website/services/${created.id}`);
      } else {
        await updateService(initial.id, payload);
      }
      if (alsoPublish && id) {
        await publishService(id);
        setNotice("Service published.");
      } else {
        setNotice("Saved.");
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setBusy(null);
    }
  }

  async function doDelete() {
    if (!initial) return;
    await deleteService(initial.id);
    router.push("/admin/website/services");
    router.refresh();
  }

  const slugExample = useMemo(() => form.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""), [form.title]);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="admin-card overflow-hidden lg:col-span-2">
        <div className="flex flex-col gap-3 border-b border-white/[.08] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link href="/admin/website/services" className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-white">
              <ArrowLeft size={13} /> Services
            </Link>
            <h2 className="mt-1 font-display text-lg font-semibold text-white">{isNew ? "New service" : initial.title}</h2>
            <p className="text-sm text-zinc-500">
              {initial ? `Status: ${initial.status.toLowerCase()}` : "Draft until published"} · {form.visible ? "visible" : "hidden"}
            </p>
          </div>
          {!isNew && (
            <div className="flex flex-wrap gap-2">
              {initial.status === "PUBLISHED" ? (
                <Button size="sm" variant="secondary" onClick={() => setNotice("Published. Re-save and publish again after edits.")}>Published</Button>
              ) : (
                <Button size="sm" onClick={() => save(true)} disabled={busy === "save"}>
                  {busy === "save" ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                  Save & publish
                </Button>
              )}
              <ConfirmButton label="Delete" variant="destructive" message={`Delete "${initial.title}"?`} onConfirm={doDelete} />
            </div>
          )}
        </div>

        <div className="space-y-5 p-5">
          {notice && <p className="rounded-lg bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">{notice}</p>}
          {error && <p className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</p>}

          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <label className="admin-label">Service title *</label>
              <input className="admin-input" value={form.title} onChange={(e) => set("title", e.target.value)} />
            </div>
            <div>
              <label className="admin-label">Slug</label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-zinc-500">/services/</span>
                <input className="admin-input" value={form.slug} onChange={(e) => set("slug", e.target.value)} placeholder={slugExample} />
              </div>
            </div>
          </div>

          <div>
            <label className="admin-label">Short description</label>
            <textarea className="admin-input min-h-20 resize-y" value={form.shortDescription} onChange={(e) => set("shortDescription", e.target.value)} />
          </div>
          <div>
            <label className="admin-label">Full description</label>
            <textarea className="admin-input min-h-28 resize-y" value={form.fullDescription} onChange={(e) => set("fullDescription", e.target.value)} />
          </div>

          <FeaturesEditor value={features} onChange={setFeatures} />
          <FaqsEditor value={faqs} onChange={setFaqs} />

          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <label className="admin-label">Icon</label>
              <input className="admin-input" value={form.icon} onChange={(e) => set("icon", e.target.value)} placeholder="lucide icon name (optional)" />
            </div>
            <div>
              <label className="admin-label">CTA button text</label>
              <input className="admin-input" value={form.ctaText} onChange={(e) => set("ctaText", e.target.value)} />
            </div>
          </div>
          <div>
            <label className="admin-label">CTA URL</label>
            <input className="admin-input" value={form.ctaUrl} onChange={(e) => set("ctaUrl", e.target.value)} />
          </div>

          <ImageUpload label="Service image" value={form.image} onChange={(url) => set("image", url ?? "")} hint="Optional — used as a featured image." />

          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <label className="admin-label">SEO title</label>
              <input className="admin-input" value={form.seoTitle} onChange={(e) => set("seoTitle", e.target.value)} />
            </div>
            <div>
              <label className="admin-label">SEO description</label>
              <textarea className="admin-input min-h-20 resize-y" value={form.seoDescription} onChange={(e) => set("seoDescription", e.target.value)} />
            </div>
          </div>

          <label className="flex min-h-11 cursor-pointer items-center gap-3">
            <input type="checkbox" className="size-4 accent-[var(--admin-accent)]" checked={form.visible} onChange={(e) => set("visible", e.target.checked)} />
            <span className="text-sm text-zinc-300">Visible on the public website</span>
          </label>

          <div className="flex flex-wrap items-center gap-3 sticky bottom-0 -mx-5 -mb-5 rounded-b-xl border-t border-white/[.08] bg-[#141416] px-5 py-4">
            <Button onClick={() => save(false)} disabled={busy === "save"}>
              {busy === "save" ? <Loader2 size={16} className="animate-spin" /> : null}
              {busy === "save" ? "Saving…" : "Save"}
            </Button>
            <Button variant="secondary" onClick={() => save(true)} disabled={busy === "save"}>
              <CheckCircle2 size={16} /> Save & publish
            </Button>
          </div>
        </div>
      </div>

      <div className="admin-card p-5">
        <h3 className="mb-3 text-sm font-semibold text-white">Publication</h3>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-4"><dt className="text-zinc-500">Status</dt><dd className="text-zinc-300">{initial ? initial.status.toLowerCase() : "draft"}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-zinc-500">Visibility</dt><dd className="text-zinc-300">{form.visible ? "visible" : "hidden"}</dd></div>
          {initial?.publishedAt && <div className="flex justify-between gap-4"><dt className="text-zinc-500">Published</dt><dd className="text-zinc-300">{new Date(initial.publishedAt).toLocaleString()}</dd></div>}
        </dl>
        <p className="mt-4 text-xs leading-5 text-zinc-500">A service is shown publicly only when Published and Visible.</p>
        <div className="mt-4 border-t border-white/[.06] pt-4">
          <p className="mb-2 text-xs text-zinc-500">Drag handle note: ordering is managed from the services list page.</p>
        </div>
      </div>
    </div>
  );
}