"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "./ConfirmButton";
import { ImageUpload } from "./ImageUpload";
import type { SerializedClient } from "@/lib/website/action-types";
import { createWebsiteClient, updateWebsiteClient, deleteWebsiteClient, reorderWebsiteClients, publishWebsiteClient, unpublishWebsiteClient } from "@/lib/website/actions";

export function ClientsManager({ clients }: { clients: SerializedClient[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      await createWebsiteClient({ name: name.trim() });
      setName("");
      setOpen(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function move(index: number, dir: -1 | 1) {
    const other = clients[index + dir];
    if (!other) return;
    const ids = clients.map((c) => c.id);
    [ids[index], ids[index + dir]] = [ids[index + dir], ids[index]];
    await reorderWebsiteClients(ids);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="admin-card p-5">
        <Button variant="secondary" onClick={() => setOpen(!open)}><Plus size={16} /> Add client</Button>
        {open && (
          <form onSubmit={add} className="mt-5 flex max-w-xl gap-3">
            <input className="admin-input" placeholder="Client name *" value={name} onChange={(e) => setName(e.target.value)} required />
            <Button type="submit" disabled={busy}>{busy ? <Loader2 size={16} className="animate-spin" /> : null}{busy ? "Adding…" : "Add"}</Button>
          </form>
        )}
      </div>

      {clients.length === 0 && (
        <div className="admin-card p-8 text-center text-sm text-zinc-500">No clients yet. Add your first relationship above.</div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {clients.map((client, i) => (
          <div key={client.id} className="admin-card overflow-hidden">
            <div className="flex items-center gap-2 border-b border-white/[.08] p-3.5">
              <div className="flex items-center gap-1">
                <button type="button" className="grid size-9 place-items-center rounded-md border border-white/[.08] text-zinc-400 hover:border-signal/40 hover:text-white disabled:opacity-30" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m18 15-6-6-6 6"/></svg></button>
                <button type="button" className="grid size-9 place-items-center rounded-md border border-white/[.08] text-zinc-400 hover:border-signal/40 hover:text-white disabled:opacity-30" onClick={() => move(i, 1)} disabled={i === clients.length - 1} aria-label="Move down"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg></button>
              </div>
              <div className="ml-auto flex items-center gap-1.5">
                <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${client.status === "PUBLISHED" ? "bg-emerald-500/15 text-emerald-400" : "bg-zinc-500/15 text-zinc-400"}`}>
                  {client.status === "PUBLISHED" ? "Live" : "Draft"}
                </span>
                <button type="button" className={`grid size-9 place-items-center rounded-md border ${client.featured ? "border-signal/60 text-signal" : "border-white/[.08] text-zinc-400 hover:border-signal/40 hover:text-white"}`} onClick={async () => { await updateWebsiteClient(client.id, { featured: !client.featured }); router.refresh(); }} aria-label="Toggle featured" title="Featured"><Star size={14} fill={client.featured ? "currentColor" : "none"} /></button>
                <button type="button" className={`rounded-md px-2.5 py-2 text-[11px] font-bold uppercase tracking-wider ${client.status === "PUBLISHED" ? "border border-emerald-500/40 text-emerald-400 hover:text-emerald-300" : "bg-signal text-black hover:bg-[#ffd429]"}`} onClick={async () => { await (client.status === "PUBLISHED" ? unpublishWebsiteClient(client.id) : publishWebsiteClient(client.id)); router.refresh(); }}>
                  {client.status === "PUBLISHED" ? "Live" : "Publish"}
                </button>
                <ConfirmButton label="Delete" variant="destructive" message={`Delete client "${client.name}"?`} onConfirm={async () => { await deleteWebsiteClient(client.id); router.refresh(); }} />
              </div>
            </div>
            <div className="space-y-3 p-4">
              <ImageUpload label="Logo" value={client.logoUrl} onChange={async (url) => { await updateWebsiteClient(client.id, { logoUrl: url ?? undefined }); router.refresh(); }} hint="Self-hosted logo. Avoid third-party logo APIs." />
              <div>
                <label className="admin-label">Client name</label>
                <input className="admin-input" defaultValue={client.name} onBlur={(e) => e.target.value !== client.name && updateWebsiteClient(client.id, { name: e.target.value })} />
              </div>
              <div>
                <label className="admin-label">Website URL</label>
                <input className="admin-input" placeholder="https://…" defaultValue={client.websiteUrl ?? ""} onBlur={(e) => e.target.value !== client.websiteUrl && updateWebsiteClient(client.id, { websiteUrl: e.target.value || undefined })} />
              </div>
              <div>
                <label className="admin-label">Alt text</label>
                <input className="admin-input" defaultValue={client.altText ?? ""} onBlur={(e) => e.target.value !== client.altText && updateWebsiteClient(client.id, { altText: e.target.value || undefined })} />
              </div>
              <div>
                <label className="admin-label">Sector</label>
                <input className="admin-input" defaultValue={client.sector ?? ""} onBlur={(e) => e.target.value !== client.sector && updateWebsiteClient(client.id, { sector: e.target.value || undefined })} />
              </div>
              <div>
                <label className="admin-label">Description</label>
                <textarea className="admin-input min-h-16 resize-y" defaultValue={client.description ?? ""} onBlur={(e) => e.target.value !== client.description && updateWebsiteClient(client.id, { description: e.target.value || undefined })} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}