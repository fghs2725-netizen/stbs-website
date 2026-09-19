"use client";

import { useMemo, useState, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Compass, Eye, EyeOff, Globe, Pencil, Settings2, SearchCheck } from "lucide-react";
import { WebsiteFrame } from "@/components/website/website-frame";
import { SectionRenderer, type RenderableSection, type SectionData } from "@/components/public/sections";
import { WebsiteEditorProvider, useWebsiteEditor } from "@/lib/website/editor-context";
import { DrawerContent } from "./panel";
import { anyDrawerDirty, confirmDiscard } from "../use-unsaved-guard";
import { resolveSettings, primaryPhone } from "@/lib/website/public-config";
import { publishWebsiteNow, unpublishPage } from "@/lib/website/actions";
import * as websiteActions from "@/lib/website/actions";
import { ConfirmDialog, Toaster, useToasts } from "@/components/quotation/feedback";
import type {
  SerializedClient,
  SerializedGalleryItem,
  SerializedNavItem,
  SerializedPage,
  SerializedSection,
  SerializedService,
  SerializedTestimonial,
  SerializedWebsiteSeo,
  SerializedWebsiteSettings,
} from "@/lib/website/action-types";
import type { CmsClient, CmsGalleryItem, CmsService, CmsSettings, CmsTestimonial } from "@/components/public/sections";

import { DEFAULT_NAV_LINKS } from "@/lib/website/nav-defaults";

type PublishPreview = { items?: Array<{ kind: string; name: string; status: string; changed: boolean }>; counts?: Record<string, number>; problems?: string[] };
type PublishResult = { revalidated?: string[]; problems?: string[] } | void;
// previewPublish is added by the server side of this feature; a missing export must not break the editor.
const previewPublish = (websiteActions as unknown as { previewPublish?: () => Promise<PublishPreview> }).previewPublish;

const KIND_LABELS: Record<string, [string, string]> = {
  page: ["page", "pages"], section: ["section", "sections"], service: ["service", "services"], gallery: ["gallery photo", "gallery photos"],
  client: ["client", "clients"], nav: ["menu item", "menu items"], settings: ["settings update", "settings updates"], seo: ["SEO update", "SEO updates"],
  testimonial: ["testimonial", "testimonials"],
};
export const describeCounts = (counts: Record<string, number>) =>
  Object.entries(counts).filter(([, n]) => n > 0).map(([kind, n]) => { const [one, many] = KIND_LABELS[kind] ?? [kind, `${kind}s`]; return `${n} ${n === 1 ? one : many}`; });

export interface WebsiteEditorData {
  pages: SerializedPage[];
  page: SerializedPage & { sections: SerializedSection[] };
  services: SerializedService[];
  gallery: SerializedGalleryItem[];
  clients: SerializedClient[];
  testimonials: SerializedTestimonial[];
  navItems: SerializedNavItem[];
  settings: SerializedWebsiteSettings | null;
  seo: SerializedWebsiteSeo | null;
}

function buildPreviewData(input: WebsiteEditorData): { data: SectionData; navLinks: Array<{ label: string; href: string }>; phone: string } {
  const services: CmsService[] = input.services.filter((s) => s.visible);
  const testimonials: CmsTestimonial[] = input.testimonials.filter((t) => t.visible && t.approval === "APPROVED");
  const clients: CmsClient[] = input.clients.filter((c) => c.visible);
  const featuredClients: CmsClient[] = clients.filter((c) => c.featured);
  const gallery: CmsGalleryItem[] = input.gallery.filter((g) => g.visible);

  const raw = (input.settings ?? {}) as unknown as Record<string, unknown>;
  const settings: CmsSettings = resolveSettings(raw);

  const navItems = input.navItems
    .filter((n) => n.visible && n.url.startsWith("/"))
    .map((n) => ({ label: n.label, href: n.url }));

  return {
    data: { services, testimonials, gallery, clients, featuredClients, settings },
    navLinks: navItems.length > 0 ? navItems : DEFAULT_NAV_LINKS,
    phone: primaryPhone(settings),
  };
}

function ToolbarQuickLinks({ data, mobile = false }: { data: WebsiteEditorData; mobile?: boolean }) {
  const editor = useWebsiteEditor();
  const btnClass = mobile
    ? "inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-white/10 bg-black/40 text-xs font-semibold text-zinc-300 hover:bg-white/10 hover:text-white active:bg-white/20"
    : "inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-zinc-400 hover:bg-white/[.06] hover:text-white";

  return (
    <div className="flex items-center gap-1">
      <button type="button" onClick={() => editor.openEditor({ kind: "nav" })} className={btnClass} title="Edit navigation" aria-label="Edit navigation">
        <Compass size={15} />
      </button>
      <button type="button" onClick={() => editor.openEditor({ kind: "settings" })} className={btnClass} title="Global settings" aria-label="Global settings">
        <Settings2 size={15} />
      </button>
      <button type="button" onClick={() => editor.openEditor({ kind: "seo" })} className={btnClass} title="SEO settings" aria-label="SEO settings">
        <SearchCheck size={15} />
      </button>
    </div>
  );
}

function EditorToolbar({ data }: { data: WebsiteEditorData }) {
  const router = useRouter();
  const editor = useWebsiteEditor();
  const { page, pages } = data;
  const [publishState, setPublishState] = useState<string | null>(null);
  const busy = publishState === "Publishing…" || publishState === "Unpublishing…";
  const { toasts, push, dismiss } = useToasts();
  const [confirm, setConfirm] = useState<null | { loading: boolean; counts: string[]; problems: string[]; unavailable: boolean }>(null);

  // Publishing is a two-step action: look at what will change first, then confirm.
  const handlePublish = async () => {
    setConfirm({ loading: true, counts: [], problems: [], unavailable: false });
    try {
      if (!previewPublish) { setConfirm({ loading: false, counts: [], problems: [], unavailable: true }); return; }
      const preview = await previewPublish();
      setConfirm({ loading: false, counts: describeCounts(preview.counts ?? {}), problems: preview.problems ?? [], unavailable: false });
    } catch (error) {
      setConfirm(null);
      push("error", error instanceof Error && error.message ? error.message : "Could not check what will be published. Nothing was published.");
    }
  };

  const doPublish = async () => {
    setConfirm(null);
    setPublishState("Publishing…");
    try {
      const result = (await publishWebsiteNow(page.id)) as PublishResult;
      const paths = result && result.revalidated?.length ? result.revalidated : null;
      setPublishState("Published. The live website now uses this draft.");
      push("success", paths ? `Published. Live site refreshed: ${paths.join(", ")}` : "Published. The live website now uses this draft.");
      router.refresh();
    } catch (error) {
      const message = error instanceof Error && error.message ? error.message : "Publishing failed. Please try again.";
      setPublishState(message);
      push("error", `Publishing failed: ${message} Nothing new went live.`);
    }
  };

  const handleUnpublish = async () => {
    setPublishState("Unpublishing…");
    try {
      await unpublishPage(page.id);
      setPublishState("Unpublished. The public page now uses its fallback.");
      router.refresh();
    } catch (error) {
      setPublishState(error instanceof Error ? error.message : "Unpublishing failed. Please try again.");
    }
  };

  return (
    <div className="sticky top-0 z-[85] border-b border-white/[.08] bg-[#101012]/95 px-3 py-2 sm:px-4 sm:py-2.5 backdrop-blur-xl">
      {/* Mobile / Compact Layout (<1024px) */}
      <div className="flex flex-col gap-2 lg:hidden">
        {/* Row 1: Page Select + Mode Switcher + View Website */}
        <div className="flex items-center gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            <Globe size={14} className="shrink-0 text-signal" />
            <select
              aria-label="Switch edited page"
              value={page.slug}
              onChange={(e) => {
                editor.closeEditor();
                router.push(`/admin/website?page=${e.target.value}`);
              }}
              className="h-11 w-full min-w-0 rounded-lg border border-white/10 bg-black/50 px-2 text-[16px] text-white focus:border-signal outline-none"
            >
              {pages.map((p) => (
                <option key={p.id} value={p.slug}>
                  {p.name} ({p.status === "PUBLISHED" ? "Live" : "Draft"})
                </option>
              ))}
            </select>
          </div>

          <div className="flex shrink-0 items-center rounded-lg border border-white/10 bg-black/40 p-0.5">
            <button
              type="button"
              onClick={() => editor.setMode("edit")}
              className={`inline-flex min-h-11 items-center gap-1 rounded-md px-2.5 text-xs font-bold uppercase tracking-wider transition ${
                editor.mode === "edit" ? "bg-white/15 text-white" : "text-zinc-400 hover:text-white"
              }`}
            >
              <Pencil size={12} /> Edit
            </button>
            <button
              type="button"
              onClick={() => editor.setMode("preview")}
              className={`inline-flex min-h-11 items-center gap-1 rounded-md px-2.5 text-xs font-bold uppercase tracking-wider transition ${
                editor.mode === "preview" ? "bg-white/15 text-white" : "text-zinc-400 hover:text-white"
              }`}
            >
              <Eye size={12} /> Preview
            </button>
          </div>

          {/* View Website — always data-editor-safe so tap isn't intercepted */}
          <a
            href="/"
            data-editor-safe
            target="_blank"
            rel="noopener noreferrer"
            title="View live website"
            className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-black/40 text-xs font-semibold text-zinc-300 hover:bg-white/10 hover:text-white active:bg-white/20"
          >
            <Globe size={16} />
            <span className="sr-only">View website</span>
          </a>
        </div>

        {/* Row 2: Publish + Quick Drawer Links */}
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handlePublish}
            disabled={busy}
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg bg-signal px-3 text-xs font-extrabold uppercase tracking-wider text-black transition hover:bg-white disabled:opacity-50 active:scale-95"
            title="Publish this page's draft sections plus draft nav, settings, SEO, services, gallery photos and clients"
          >
            <CheckCircle2 size={15} /> {publishState === "Publishing…" ? "Publishing…" : "Publish website"}
          </button>

          <div className="flex shrink-0 items-center gap-1">
            <ToolbarQuickLinks data={data} mobile />
          </div>
        </div>

        {/* Row 3: Compact Status */}
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-[11px] text-zinc-400">
          <span>
            {page.name}: <span className={page.status === "PUBLISHED" ? "text-emerald-400 font-semibold" : "text-amber-400 font-semibold"}>{page.status === "PUBLISHED" ? "Live" : "Draft"}</span>
            {page.publishedAt ? ` · ${new Date(page.publishedAt).toLocaleDateString()}` : " · not published"}
          </span>
          {page.publishedAt && (
            <button
              type="button"
              onClick={handleUnpublish}
              disabled={busy}
              className="text-[11px] text-zinc-400 underline hover:text-zinc-200 disabled:opacity-50"
            >
              {publishState === "Unpublishing…" ? "Unpublishing…" : "Unpublish"}
            </button>
          )}
        </div>
      </div>

      {/* Desktop Layout (>=1024px) - unchanged desktop layout */}
      <div className="hidden lg:flex lg:flex-wrap lg:items-center lg:gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Globe size={16} className="shrink-0 text-signal" />
          <div className="flex max-w-full items-center gap-1 overflow-x-auto py-1">
            {pages.map((p) => (
              <Link
                key={p.id}
                href={`/admin/website?page=${p.slug}`}
                onClick={() => editor.closeEditor()}
                className={`inline-flex min-h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-xs font-bold uppercase tracking-wider transition-colors ${
                  p.id === page.id
                    ? "bg-signal text-black"
                    : "text-zinc-400 hover:bg-white/[.06] hover:text-white"
                }`}
              >
                <span className={`size-1.5 rounded-full ${p.status === "PUBLISHED" ? "bg-emerald-400" : "bg-amber-400"}`} />
                {p.name}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-black/30 p-1">
          <button
            type="button"
            onClick={() => editor.setMode("edit")}
            className={`inline-flex min-h-9 items-center gap-1.5 rounded-md px-3 text-xs font-bold uppercase tracking-wider ${
              editor.mode === "edit" ? "bg-white/10 text-white" : "text-zinc-500 hover:text-white"
            }`}
          >
            <Pencil size={13} /> Edit
          </button>
          <button
            type="button"
            onClick={() => editor.setMode("preview")}
            className={`inline-flex min-h-9 items-center gap-1.5 rounded-md px-3 text-xs font-bold uppercase tracking-wider ${
              editor.mode === "preview" ? "bg-white/10 text-white" : "text-zinc-500 hover:text-white"
            }`}
          >
            <Eye size={13} /> Preview
          </button>
        </div>

        <ToolbarQuickLinks data={data} />

        <div className="flex items-center gap-1">
          <a
            href="/"
            data-editor-safe
            target="_blank"
            rel="noopener noreferrer"
            title="View website"
            className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-zinc-400 hover:bg-white/[.06] hover:text-white"
          >
            <Globe size={15} /><span className="text-[11px]">View</span>
          </a>
        </div>

        <button
          type="button"
          onClick={handlePublish}
          disabled={busy}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-signal px-4 text-xs font-extrabold uppercase tracking-wider text-black transition hover:-translate-y-px hover:bg-white"
          title="Publish this page's draft sections plus draft nav, settings, SEO, services, gallery photos and clients"
        >
          <CheckCircle2 size={15} /> {publishState === "Publishing…" ? "Publishing…" : "Publish website"}
        </button>
      </div>

      {page.publishedAt && (
        <div className="hidden lg:block">
          <button
            type="button"
            onClick={handleUnpublish}
            disabled={busy}
            className="mt-2 inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/15 px-4 text-xs font-extrabold uppercase tracking-wider text-zinc-300 transition hover:bg-white/[.06] disabled:opacity-50"
          >
            <EyeOff size={15} /> {publishState === "Unpublishing…" ? "Unpublishing…" : "Unpublish page"}
          </button>
        </div>
      )}

      <p className="mt-1 hidden lg:flex lg:flex-wrap lg:items-center lg:gap-x-3 lg:gap-y-1 text-[11px] text-zinc-500">
        <span>
          {page.name}: {page.status === "PUBLISHED" ? "live (past version)" : "draft"} · {page.publishedAt ? `published ${new Date(page.publishedAt).toLocaleDateString()}` : "never published"}
        </span>
        <span>Editor shows DRAFT content. Public visitors only ever see published content.</span>
      </p>

      {publishState && !busy && (
        <p role="status" className={`mt-1 text-xs ${publishState.startsWith("Published") || publishState.startsWith("Unpublished") ? "text-emerald-400" : "text-red-400"}`}>
          {publishState}
        </p>
      )}
      {confirm && (
        <ConfirmDialog
          title={confirm.problems.length ? "Fix these before publishing" : "Publish the website?"}
          body={confirm.loading ? "Checking what will change…" : confirm.problems.length ? "These problems would break the live site, so publishing is blocked." : confirm.unavailable ? "This publishes the page's draft sections plus any draft navigation, settings, SEO, services, gallery photos and clients." : confirm.counts.length ? `This will make the live site use: ${confirm.counts.join(", ")}.` : "Nothing has changed since the last publish. Publishing again refreshes the live site."}
          confirmLabel="Publish"
          confirmDisabled={confirm.loading || confirm.problems.length > 0}
          onConfirm={() => void doPublish()}
          onCancel={() => setConfirm(null)}
        >
          {confirm.problems.length > 0 && (
            <ul role="alert" style={{ margin: "0 0 14px", paddingLeft: 18, color: "#e06060", fontSize: 12, lineHeight: 1.5 }}>
              {confirm.problems.map((p) => <li key={p}>{p}</li>)}
            </ul>
          )}
        </ConfirmDialog>
      )}
      <Toaster toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}

function EditorCanvas({ data }: { data: WebsiteEditorData }) {
  const editor = useWebsiteEditor();
  const { data: sectionData, navLinks, phone } = useMemo(() => buildPreviewData(data), [data]);
  const sections: RenderableSection[] = data.page.sections
    .filter((s) => !s.deletedAt)
    .map((s) => ({ type: s.type, content: s.content, id: s.id, name: s.name, visible: s.visible, position: s.position, publishedAt: s.publishedAt }));

  const settings = sectionData.settings ?? null;

  const intercept = (e: MouseEvent<HTMLDivElement>) => {
    const target = e.target as Element;
    // Always allow data-editor-safe elements (logos, drawer triggers, etc.)
    if (target.closest("[data-editor-safe]")) return;
    // Block non-editor interactive elements from performing their default action
    const interactive = target.closest("a, button, [role='button'], input, textarea, select");
    if (interactive) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  return (
    // No negative margins — just full-width, clips overflow on mobile
    <div data-editor-context onClickCapture={intercept} className="w-full min-w-0 overflow-x-clip">
      <WebsiteFrame navLinks={navLinks} settings={settings} phone={phone}>
        <div className="w-full min-w-0">
          {sections.map((section) => (
            <SectionRenderer key={section.id ?? section.type} section={section} data={sectionData} />
          ))}
        </div>
      </WebsiteFrame>

      {editor.signal && (
        <div className="fixed inset-0 z-[120]">
          <div className="absolute inset-0 bg-black/60" onClick={() => { if (confirmDiscard(anyDrawerDirty())) editor.closeEditor(); }} />
          <div
            data-editor-safe
            className="absolute inset-x-0 bottom-0 h-[88dvh] max-h-[88dvh] overflow-hidden rounded-t-2xl border-t border-white/10 bg-[#101012] shadow-2xl flex flex-col pb-[env(safe-area-inset-bottom)] lg:inset-x-auto lg:right-0 lg:top-0 lg:h-full lg:max-h-full lg:w-[440px] lg:rounded-none lg:border-l lg:border-t-0"
          >
            <DrawerContent
              signal={editor.signal}
              services={data.services}
              gallery={data.gallery}
              clients={data.clients}
              testimonials={data.testimonials}
              navItems={data.navItems}
              settings={data.settings}
              seo={data.seo}
              onClose={editor.closeEditor}
            />
          </div>
        </div>
      )}

      {!editor.signal && (
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[90] flex justify-center lg:hidden">
          <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-white/10 bg-black/90 px-2 py-1 shadow-2xl">
            <ToolbarQuickLinks data={data} mobile />
          </div>
        </div>
      )}
    </div>
  );
}

export function WebsiteEditor(data: WebsiteEditorData) {
  return (
    <WebsiteEditorProvider pageId={data.page.id} sections={data.page.sections}>
      <EditorToolbar data={data} />
      <EditorCanvas data={data} />
    </WebsiteEditorProvider>
  );
}
