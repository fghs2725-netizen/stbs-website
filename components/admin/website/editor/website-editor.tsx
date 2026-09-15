"use client";

import { useMemo, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Compass, Eye, EyeOff, Globe, Pencil, Settings2, SearchCheck } from "lucide-react";
import { WebsiteFrame } from "@/components/website/website-frame";
import { SectionRenderer, type RenderableSection, type SectionData } from "@/components/public/sections";
import { WebsiteEditorProvider, useWebsiteEditor } from "@/lib/website/editor-context";
import { DrawerContent } from "./panel";
import { resolveSettings, primaryPhone } from "@/lib/website/public-config";
import { publishWebsiteNow } from "@/lib/website/actions";
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

const DEFAULT_LINKS = [
  { label: "About", href: "/about" },
  { label: "Services", href: "/services" },
  { label: "Clients", href: "/clients" },
  { label: "Gallery", href: "/gallery" },
  { label: "Contact", href: "/contact" },
];

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
    navLinks: navItems.length > 0 ? navItems : DEFAULT_LINKS,
    phone: primaryPhone(settings),
  };
}

function EditorToolbar({ data }: { data: WebsiteEditorData }) {
  const router = useRouter();
  const editor = useWebsiteEditor();
  const { page, pages } = data;

  return (
    <div className="sticky top-14 z-[85] -mx-4 border-b border-white/[.08] bg-[#101012]/95 px-4 py-2.5 backdrop-blur-xl lg:-mx-6 lg:px-6">
      <div className="flex flex-wrap items-center gap-2">
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
          <Link href="/" target="_blank" rel="noopener noreferrer" title="Open live website" className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-zinc-400 hover:bg-white/[.06] hover:text-white">
            <Globe size={15} />
          </Link>
        </div>

        <button
          type="button"
          onClick={async () => {
            await publishWebsiteNow(page.id);
            router.refresh();
          }}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-signal px-4 text-xs font-extrabold uppercase tracking-wider text-black transition hover:-translate-y-px hover:bg-white"
          title="Publish this page's draft sections plus draft nav, settings, SEO, services, gallery photos and clients"
        >
          <CheckCircle2 size={15} /> Publish website
        </button>
      </div>
      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-zinc-500">
        <span>
          {page.name}: {page.status === "PUBLISHED" ? "live (past version)" : "draft"} · {page.publishedAt ? `published ${new Date(page.publishedAt).toLocaleDateString()}` : "never published"}
        </span>
        <span>Editor shows DRAFT content. Public visitors only ever see published content.</span>
      </p>
    </div>
  );
}

function ToolbarQuickLinks({ data }: { data: WebsiteEditorData }) {
  const editor = useWebsiteEditor();
  return (
    <div className="flex flex-wrap items-center gap-1">
      <button type="button" onClick={() => editor.openEditor({ kind: "nav" })} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-zinc-400 hover:bg-white/[.06] hover:text-white" title="Edit navigation">
        <Compass size={15} />
      </button>
      <button type="button" onClick={() => editor.openEditor({ kind: "settings" })} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-zinc-400 hover:bg-white/[.06] hover:text-white" title="Global settings">
        <Settings2 size={15} />
      </button>
      <button type="button" onClick={() => editor.openEditor({ kind: "seo" })} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-zinc-400 hover:bg-white/[.06] hover:text-white" title="SEO settings">
        <SearchCheck size={15} />
      </button>
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
    if (target.closest("[data-editor-safe]")) return;
    const interactive = target.closest("a, button, [role='button'], input, textarea, select");
    if (interactive) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  return (
    <div data-editor-context onClickCapture={intercept}>
      <WebsiteFrame navLinks={navLinks} settings={settings} phone={phone}>
        <div>
          {sections.map((section) => (
            <SectionRenderer key={section.id ?? section.type} section={section} data={sectionData} />
          ))}
        </div>
      </WebsiteFrame>

      {editor.signal && (
        <div className="fixed inset-0 z-[120]">
          <div className="absolute inset-0 bg-black/60" onClick={editor.closeEditor} />
          <div className="absolute inset-x-0 bottom-0 h-[84vh] overflow-hidden rounded-t-2xl border-t border-white/10 bg-[#101012] shadow-2xl lg:inset-x-auto lg:right-0 lg:top-0 lg:h-full lg:w-[440px] lg:rounded-none lg:border-l lg:border-t-0">
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
            <ToolbarQuickLinks data={data} />
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