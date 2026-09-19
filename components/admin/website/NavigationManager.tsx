"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "./ConfirmButton";
import { Toaster, useToasts } from "@/components/quotation/feedback";
import type { SerializedNavItem } from "@/lib/website/action-types";
import { createNavItem, updateNavItem, deleteNavItem, reorderNavItems, publishNavItem, unpublishNavItem } from "@/lib/website/actions";

export function NavigationManager({ items }: { items: SerializedNavItem[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("/");
  const [busy, setBusy] = useState(false);
  const { toasts, push, dismiss } = useToasts();

  async function run(fn: () => Promise<unknown>, fallback: string) {
    try {
      await fn();
      router.refresh();
    } catch (e) {
      push("error", e instanceof Error && e.message ? e.message : fallback);
    }
  }

  const topLevel = items.filter((i) => !i.parentId);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim()) return;
    setBusy(true);
    try {
      await createNavItem({ label: label.trim(), url: url.trim() || "/" });
      setLabel("");
      setUrl("/");
      setOpen(false);
      router.refresh();
    } catch (e) {
      push("error", e instanceof Error && e.message ? e.message : "Could not add that menu item.");
    } finally {
      setBusy(false);
    }
  }

  async function move(index: number, dir: -1 | 1) {
    const other = topLevel[index + dir];
    if (!other) return;
    const ids = topLevel.map((i) => i.id);
    [ids[index], ids[index + dir]] = [ids[index + dir], ids[index]];
    await run(() => reorderNavItems(ids), "Could not reorder the menu.");
  }

  return (
    <div className="space-y-5">
      <div className="admin-card p-5">
        <Button variant="secondary" onClick={() => setOpen(!open)}><Plus size={16} /> Add menu item</Button>
        {open && (
          <form onSubmit={add} className="mt-5 grid max-w-2xl gap-3 sm:grid-cols-2">
            <input className="admin-input" placeholder="Label * (e.g. Services)" value={label} onChange={(e) => setLabel(e.target.value)} required />
            <input className="admin-input" placeholder="URL (e.g. /services)" value={url} onChange={(e) => setUrl(e.target.value)} />
            <div className="sm:col-span-2">
              <Button type="submit" disabled={busy}>{busy ? <Loader2 size={16} className="animate-spin" /> : null}{busy ? "Adding…" : "Add item"}</Button>
            </div>
          </form>
        )}
      </div>

      {items.length === 0 && (
        <div className="admin-card p-8 text-center text-sm text-zinc-500">No menu items yet.</div>
      )}

      <div className="grid gap-4">
        {topLevel.map((item, i) => {
          const children = items.filter((c) => c.parentId === item.id);
          return (
            <div key={item.id} className="admin-card overflow-hidden">
              <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <div className="flex items-center gap-1">
                  <button type="button" className="grid size-9 place-items-center rounded-md border border-white/[.08] text-zinc-400 hover:border-signal/40 hover:text-white disabled:opacity-30" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m18 15-6-6-6 6"/></svg></button>
                  <button type="button" className="grid size-9 place-items-center rounded-md border border-white/[.08] text-zinc-400 hover:border-signal/40 hover:text-white disabled:opacity-30" onClick={() => move(i, 1)} disabled={i === topLevel.length - 1} aria-label="Move down"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg></button>
                </div>
                <div className="grid flex-1 gap-3 sm:grid-cols-2">
                  <input className="admin-input min-h-10" defaultValue={item.label} onBlur={(e) => { if (e.target.value !== item.label) void run(() => updateNavItem(item.id, { label: e.target.value }), "Could not save the label."); }} />
                  <input className="admin-input min-h-10" defaultValue={item.url} onBlur={(e) => { if (e.target.value !== item.url) void run(() => updateNavItem(item.id, { url: e.target.value }), "Could not save the link."); }} />
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${item.status === "PUBLISHED" ? "bg-emerald-500/15 text-emerald-400" : "bg-zinc-500/15 text-zinc-400"}`}>
                    {item.status === "PUBLISHED" ? "Live" : "Draft"}
                  </span>
                  <button
                    type="button"
                    className={`rounded-md px-2.5 py-2 text-[11px] font-bold uppercase tracking-wider ${item.status === "PUBLISHED" ? "border border-emerald-500/40 text-emerald-400 hover:text-emerald-300" : "bg-signal text-black hover:bg-[#ffd429]"}`}
                    onClick={() => void run(() => (item.status === "PUBLISHED" ? unpublishNavItem(item.id) : publishNavItem(item.id)), "Could not change that menu item.")}
                  >
                    {item.status === "PUBLISHED" ? "Live" : "Publish"}
                  </button>
                  <label className="flex items-center gap-2 text-xs text-zinc-400">
                    <input type="checkbox" className="size-4" checked={item.visible} onChange={() => void run(() => updateNavItem(item.id, { visible: !item.visible }), "Could not change visibility.")} />
                    Visible
                  </label>
                  <label className="flex items-center gap-2 text-xs text-zinc-400">
                    <input type="checkbox" className="size-4" checked={item.openNewTab} onChange={() => void run(() => updateNavItem(item.id, { openNewTab: !item.openNewTab }), "Could not change that setting.")} />
                    New tab
                  </label>
                  <ConfirmButton label="Delete" variant="destructive" message={children.length ? `"${item.label}" has ${children.length} child item(s). Remove or reassign them first.` : `Delete "${item.label}" from navigation?`} onConfirm={async () => { await run(() => deleteNavItem(item.id), "Cannot delete that menu item."); }} />
                </div>
              </div>
              {children.length > 0 && (
                <div className="space-y-2 border-t border-white/[.06] bg-black/20 p-3 pl-10">
                  {children.map((child) => (
                    <div key={child.id} className="flex flex-col gap-2 rounded-lg border border-white/[.05] bg-white/[.02] p-2.5 sm:flex-row sm:items-center">
                      <span className="pl-1 text-xs text-zinc-600">↳ child</span>
                      <input className="admin-input min-h-10 flex-1 !py-1.5 text-sm" defaultValue={child.label} onBlur={(e) => { if (e.target.value !== child.label) void run(() => updateNavItem(child.id, { label: e.target.value }), "Could not save the label."); }} />
                      <input className="admin-input min-h-10 flex-1 !py-1.5 text-sm" defaultValue={child.url} onBlur={(e) => { if (e.target.value !== child.url) void run(() => updateNavItem(child.id, { url: e.target.value }), "Could not save the link."); }} />
                      <ConfirmButton label="Delete" variant="destructive" message={`Delete "${child.label}"?`} onConfirm={async () => { await run(() => deleteNavItem(child.id), "Cannot delete that menu item."); }} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <Toaster toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
