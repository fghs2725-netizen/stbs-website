"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImageUpload } from "./ImageUpload";
import type { SerializedWebsiteSeo } from "@/lib/website/action-types";
import { updateWebsiteSeo, publishWebsiteSeo } from "@/lib/website/actions";

export function SeoPage({ initial }: { initial: SerializedWebsiteSeo }) {
  const router = useRouter();
  const [form, setForm] = useState({
    globalTitle: initial.globalTitle ?? "",
    globalDescription: initial.globalDescription ?? "",
    defaultOgImage: initial.defaultOgImage ?? "",
    twitterTitle: initial.twitterTitle ?? "",
    twitterDescription: initial.twitterDescription ?? "",
    twitterImage: initial.twitterImage ?? "",
    canonicalUrl: initial.canonicalUrl ?? "https://www.stbs.in",
    robotsSettings: initial.robotsSettings ?? "",
    structuredData: initial.structuredData ? JSON.stringify(initial.structuredData, null, 2) : "",
  });
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }));

  function buildPayload(): Record<string, unknown> {
    const payload: Record<string, unknown> = {};
    if (form.globalTitle) payload.globalTitle = form.globalTitle;
    if (form.globalDescription) payload.globalDescription = form.globalDescription;
    payload.defaultOgImage = form.defaultOgImage || null;
    if (form.twitterTitle) payload.twitterTitle = form.twitterTitle;
    if (form.twitterDescription) payload.twitterDescription = form.twitterDescription;
    payload.twitterImage = form.twitterImage || null;
    if (form.canonicalUrl) payload.canonicalUrl = form.canonicalUrl;
    if (form.robotsSettings) payload.robotsSettings = form.robotsSettings;
    if (form.structuredData.trim()) {
      try { payload.structuredData = JSON.parse(form.structuredData); } catch { throw new Error("Structured data is not valid JSON"); }
    }
    return payload;
  }

  async function save() {
    setBusy("save");
    setError(null);
    setNotice(null);
    try {
      await updateWebsiteSeo(buildPayload());
      setNotice("Draft saved.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setBusy(null);
    }
  }

  async function publish() {
    setBusy("publish");
    setError(null);
    setNotice(null);
    try {
      await updateWebsiteSeo(buildPayload());
      await publishWebsiteSeo();
      setNotice("Published. Public site now uses these SEO settings.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to publish");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      {notice && <p className="rounded-lg bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">{notice}</p>}
      {error && <p className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</p>}

      <div className="admin-card overflow-hidden">
        <div className="border-b border-white/[.08] p-5">
          <h2 className="font-display text-lg font-semibold text-white">Global metadata</h2>
          <p className="mt-0.5 text-sm text-zinc-500">Per-page SEO set in the page editor overrides these defaults. Canonical domain must be https://www.stbs.in.</p>
        </div>
        <div className="grid gap-x-8 gap-y-4 p-5 lg:grid-cols-2">
          <div>
            <label className="admin-label">Global title</label>
            <input className="admin-input" value={form.globalTitle} onChange={(e) => set("globalTitle", e.target.value)} placeholder="Saini Tubewell Boring Service" />
          </div>
          <div>
            <label className="admin-label">Global description</label>
            <textarea className="admin-input min-h-20 resize-y" value={form.globalDescription} onChange={(e) => set("globalDescription", e.target.value)} />
          </div>
          <div>
            <label className="admin-label">Canonical URL</label>
            <input className="admin-input" value={form.canonicalUrl} onChange={(e) => set("canonicalUrl", e.target.value)} />
          </div>
          <div>
            <label className="admin-label">Robots settings</label>
            <input className="admin-input" placeholder="e.g. noimageindex, nofollow" value={form.robotsSettings} onChange={(e) => set("robotsSettings", e.target.value)} />
          </div>
          <ImageUpload label="Default OG image" value={form.defaultOgImage} onChange={(url) => set("defaultOgImage", url ?? "")} />
          <div className="sm:col-span-2" />
          <div>
            <label className="admin-label">Twitter title</label>
            <input className="admin-input" value={form.twitterTitle} onChange={(e) => set("twitterTitle", e.target.value)} />
          </div>
          <div>
            <label className="admin-label">Twitter description</label>
            <textarea className="admin-input min-h-20 resize-y" value={form.twitterDescription} onChange={(e) => set("twitterDescription", e.target.value)} />
          </div>
          <ImageUpload label="Twitter image" value={form.twitterImage} onChange={(url) => set("twitterImage", url ?? "")} />
          <div className="sm:col-span-2" />
          <div className="sm:col-span-2">
            <label className="admin-label">Structured data (LocalBusiness JSON-LD)</label>
            <textarea className="admin-input min-h-40 font-mono text-xs" value={form.structuredData} onChange={(e) => set("structuredData", e.target.value)} />
            <p className="mt-1.5 text-xs text-zinc-500">Optional. Only publish verified business data. Do not fill in made-up values.</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 sticky bottom-0 z-10 rounded-xl border border-white/[.08] bg-[#141416] p-4 shadow-[0_-10px_40px_rgba(0,0,0,.4)]">
        <Button onClick={save} disabled={busy === "save"}>
          {busy === "save" ? <Loader2 size={16} className="animate-spin" /> : null}
          {busy === "save" ? "Saving…" : "Save draft"}
        </Button>
        <Button variant="secondary" onClick={publish} disabled={busy === "publish"}>
          {busy === "publish" ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
          Save & publish
        </Button>
        <span className="text-xs text-zinc-500">
          {initial.publishedAt ? `Last published ${new Date(initial.publishedAt).toLocaleString()}` : "Never published"}
        </span>
      </div>
    </div>
  );
}
