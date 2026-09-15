"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Plus, Trash2, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "./ConfirmButton";
import { FieldInput } from "./field-input";
import { SectionTypeDef, SECTION_TYPES, SECTION_TYPE_DEFS, type SectionField } from "@/lib/website/section-types";
import type { SerializedSection, SerializedPage } from "@/lib/website/action-types";
import { updateSectionContent, updateSectionMeta, deleteSection, toggleSectionVisibility, duplicateSection } from "@/lib/website/actions";

export function SectionEditor({ page, section }: { page: SerializedPage; section: SerializedSection }) {
  const router = useRouter();
  const def: SectionTypeDef | undefined = SECTION_TYPE_DEFS[section.type];
  const [content, setContent] = useState<Record<string, unknown>>(section.content ?? {});
  const [rawJson, setRawJson] = useState<string>(JSON.stringify(section.content ?? {}, null, 2));
  const isStructured = Boolean(SECTION_TYPE_DEFS[section.type]);
  const [name, setName] = useState(section.name);
  const [description, setDescription] = useState(section.description ?? "");
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function setField(key: string, value: unknown) {
    setContent((c) => ({ ...c, [key]: value }));
  }

  function setList(index: number, listKey: string, fieldKey: string, value: string) {
    setContent((c) => {
      const rows = Array.isArray(c[listKey]) ? [...(c[listKey] as Record<string, unknown>[])] : [];
      rows[index] = { ...(rows[index] ?? {}) };
      // Special case: a 'value'-suffixed field on a label-only list stores the string directly
      const listDef = def?.lists?.find((l) => l.key === listKey);
      if (listDef && listDef.fields.length === 1 && listDef.fields[0].key === fieldKey) {
        rows[index] = value as unknown as Record<string, unknown>;
      } else {
        rows[index][fieldKey] = value;
      }
      return { ...c, [listKey]: rows };
    });
  }

  function addRow(listKey: string) {
    setContent((c) => {
      const rows = Array.isArray(c[listKey]) ? [...(c[listKey] as unknown[])] : [];
      rows.push({});
      return { ...c, [listKey]: rows };
    });
  }

  function removeRow(listKey: string, index: number) {
    setContent((c) => {
      const rows = Array.isArray(c[listKey]) ? [...(c[listKey] as unknown[])] : [];
      rows.splice(index, 1);
      return { ...c, [listKey]: rows };
    });
  }

  async function save(asPublish?: boolean) {
    setBusy(asPublish ? "publish" : "save");
    setNotice(null);
    try {
      let payload = content;
      if (!isStructured) {
        try {
          payload = JSON.parse(rawJson) as Record<string, unknown>;
        } catch {
          setNotice("JSON is not valid — check for syntax errors.");
          setBusy(null);
          return;
        }
      }
      await updateSectionContent(section.id, payload as object);
      await updateSectionMeta(section.id, { name, description: description || undefined });
      setNotice(asPublish ? "Saved. Publish the page to make this live." : "Draft saved.");
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function toggleVisibility() {
    await toggleSectionVisibility(section.id);
    router.refresh();
  }

  async function duplicate() {
    await duplicateSection(section.id);
    router.refresh();
  }

  async function doDelete() {
    await deleteSection(section.id);
    router.push(`/admin/website/pages/${page.id}`);
    router.refresh();
  }

  function rowValue(listKey: string, index: number, field: SectionField) {
    const rows = Array.isArray(content[listKey]) ? (content[listKey] as unknown[]) : [];
    const row = rows[index];
    const listDef = def?.lists?.find((l) => l.key === listKey);
    if (listDef && listDef.fields.length === 1 && listDef.fields[0].key === field.key) {
      return typeof row === "string" ? row : "";
    }
    return (row as Record<string, unknown>)?.[field.key] ?? "";
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="admin-card overflow-hidden lg:col-span-2">
        <div className="flex flex-col gap-3 border-b border-white/[.08] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <Link href={`/admin/website/pages/${page.id}`} className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-white">
              <ArrowLeft size={13} /> {page.name}
            </Link>
            <h2 className="mt-1 truncate font-display text-lg font-semibold text-white">{section.name}</h2>
            <p className="text-sm text-zinc-500">
              {SECTION_TYPES[section.type]} section · {section.visible ? "visible" : "hidden"} · {section.publishedAt ? `last published ${new Date(section.publishedAt).toLocaleString()}` : "never published"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="secondary">
              <Link href={`/${page.slug}`} target="_blank"><Eye size={15} /> Preview</Link>
            </Button>
            <Button size="sm" variant="secondary" onClick={toggleVisibility}>
              {section.visible ? <EyeOff size={15} /> : <Eye size={15} />}
              {section.visible ? "Hide" : "Show"}
            </Button>
            <ConfirmButton label="Duplicate" message={`Duplicate "${section.name}"?`} onConfirm={duplicate} />
            <ConfirmButton label="Delete" variant="destructive" message={`Delete "${section.name}"? The live site keeps the last published version.`} onConfirm={doDelete} />
          </div>
        </div>

        <div className="space-y-5 p-5">
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <label className="admin-label">Section name</label>
              <input className="admin-input" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="admin-label">Internal description</label>
              <input className="admin-input" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
          </div>

          {def ? (
            <>
              {(def.fields ?? []).map((field) => (
                <div key={field.key}>
                  <label className="admin-label">{field.label}</label>
                  <FieldInput field={field} value={content[field.key]} onChange={(v) => setField(field.key, v)} />
                </div>
              ))}

              {def.lists?.map((list) => {
                const rows = Array.isArray(content[list.key]) ? (content[list.key] as unknown[]) : [];
                return (
                  <div key={list.key} className="rounded-lg border border-white/[.08] bg-white/[.02] p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-sm font-semibold text-white">{list.label} ({rows.length})</p>
                      <Button size="sm" variant="secondary" onClick={() => addRow(list.key)}><Plus size={14} /> Add</Button>
                    </div>
                    <div className="space-y-3">
                      {rows.map((_row, i) => (
                        <div key={i} className="rounded-lg border border-white/[.06] bg-black/20 p-3">
                          <div className={`grid gap-3 ${list.fields.length > 1 ? "lg:grid-cols-2" : ""}`}>
                            {list.fields.map((field) => (
                              <div key={field.key}>
                                {list.fields.length > 1 && <label className="admin-label">{field.label}</label>}
                                <FieldInput field={field} value={rowValue(list.key, i, field)} onChange={(v) => setList(i, list.key, field.key, v)} />
                              </div>
                            ))}
                          </div>
                          <div className="mt-2 text-right">
                            <button type="button" onClick={() => removeRow(list.key, i)} className="inline-flex min-h-9 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold text-red-400 hover:bg-red-500/10">
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
            <div>
              <label className="admin-label">Content (JSON) — custom section type</label>
              <textarea className="admin-input min-h-56 font-mono text-xs" value={rawJson} onChange={(e) => setRawJson(e.target.value)} />
              <p className="mt-1.5 text-xs text-zinc-500">Advanced: this section type has no structured editor.</p>
            </div>
          )}

          {notice && <p className="rounded-lg bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">{notice}</p>}

          <div className="flex flex-wrap items-center gap-3 sticky bottom-0 -mx-5 -mb-5 rounded-b-xl border-t border-white/[.08] bg-[#141416] px-5 py-4">
            <Button onClick={() => save(false)} disabled={busy === "save"}>
              {busy === "save" ? <Loader2 size={16} className="animate-spin" /> : null}
              {busy === "save" ? "Saving…" : "Save draft"}
            </Button>
            <Button variant="secondary" onClick={() => save(true)} disabled={busy === "publish"}>
              {busy === "publish" ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              Save, then Publish
            </Button>
            <Button asChild variant="ghost"><Link href={`/admin/website/pages/${page.id}`}>Back to page</Link></Button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="admin-card p-5">
          <h3 className="mb-3 text-sm font-semibold text-white">Publication</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-zinc-500">Status</dt><dd className="text-zinc-300">{section.publishedContent ? "Has published content" : "Never published"}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-zinc-500">Visibility</dt><dd className="text-zinc-300">{section.visible ? "Visible" : "Hidden"}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-zinc-500">Position</dt><dd className="text-zinc-300">#{section.position + 1}</dd></div>
          </dl>
          <p className="mt-4 text-xs leading-5 text-zinc-500">
            Sections go live only when the page is Published. Publish the page from the page editor when you are ready.
          </p>
        </div>
        {section.type === "services" && (
          <div className="admin-card p-5 text-sm text-zinc-400">
            This section renders <span className="text-white">published services</span> automatically. Manage them in{" "}
            <Link href="/admin/website/services" className="text-signal hover:text-white">Services</Link>.
          </div>
        )}
        {section.type === "testimonials" && (
          <div className="admin-card p-5 text-sm text-zinc-400">
            This section renders <span className="text-white">approved testimonials</span>. Manage them in{" "}
            <Link href="/admin/website/testimonials" className="text-signal hover:text-white">Testimonials</Link>.
          </div>
        )}
        {section.type === "gallery" && (
          <div className="admin-card p-5 text-sm text-zinc-400">
            This section renders <span className="text-white">published gallery photos</span>. Manage them in{" "}
            <Link href="/admin/website/photos" className="text-signal hover:text-white">Photos</Link>.
          </div>
        )}
        {section.type === "featured_clients" && (
          <div className="admin-card p-5 text-sm text-zinc-400">
            This section renders <span className="text-white">featured clients</span>. Manage them in{" "}
            <Link href="/admin/website/clients" className="text-signal hover:text-white">Clients</Link>.
          </div>
        )}
      </div>
    </div>
  );
}