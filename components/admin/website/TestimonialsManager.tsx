"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "./ConfirmButton";
import { ImageUpload } from "./ImageUpload";
import type { SerializedTestimonial } from "@/lib/website/action-types";
import { createTestimonial, updateTestimonial, updateTestimonialApproval, deleteTestimonial, reorderTestimonials } from "@/lib/website/actions";

const APPROVAL_LABELS: Record<string, string> = { DRAFT: "Draft", VERIFIED: "Verified", APPROVED: "Approved" };

export function TestimonialsManager({ testimonials }: { testimonials: SerializedTestimonial[] }) {
  const router = useRouter();
  const [form, setForm] = useState({ personName: "", designation: "", company: "", location: "", project: "", quote: "", rating: 5 });
  const [open, setOpen] = useState(false);
  const [busyRow, setBusyRow] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!form.personName.trim() || !form.quote.trim()) return;
    setBusy(true);
    try {
      await createTestimonial({ personName: form.personName, designation: form.designation || undefined, company: form.company || undefined, location: form.location || undefined, project: form.project || undefined, quote: form.quote, rating: form.rating || undefined });
      setForm({ personName: "", designation: "", company: "", location: "", project: "", quote: "", rating: 5 });
      setOpen(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function run(id: string, fn: () => Promise<void>) {
    setBusyRow(id);
    try {
      await fn();
      router.refresh();
    } finally {
      setBusyRow(null);
    }
  }

  async function move(index: number, dir: -1 | 1) {
    const other = testimonials[index + dir];
    if (!other) return;
    const ids = testimonials.map((t) => t.id);
    [ids[index], ids[index + dir]] = [ids[index + dir], ids[index]];
    await reorderTestimonials(ids);
    router.refresh();
  }

  function Field({ t, field, label, textarea }: { t: SerializedTestimonial; field: keyof Omit<SerializedTestimonial, "id" | "createdAt" | "updatedAt" | "deletedAt" | "position" | "approval" | "approvalNote" | "visible" | "publishedAt" | "rating" | "photo" | "sourceNote">; label: string; textarea?: boolean }) {
    const commit = (v: string) => updateTestimonial(t.id, { [field]: v || undefined });
    return (
      <div>
        <label className="admin-label">{label}</label>
        {textarea ? (
          <textarea className="admin-input min-h-16 resize-y text-sm" defaultValue={(t as any)[field] ?? ""} onBlur={(e) => e.target.value !== (t as any)[field] && commit(e.target.value)} />
        ) : (
          <input className="admin-input min-h-10 text-sm" defaultValue={(t as any)[field] ?? ""} onBlur={(e) => e.target.value !== (t as any)[field] && commit(e.target.value)} />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="admin-card p-5">
        <Button variant="secondary" onClick={() => setOpen(!open)}>
          <Plus size={16} /> Add testimonial
        </Button>
        {open && (
          <form onSubmit={add} className="mt-5 grid gap-4 rounded-lg border border-white/[.08] bg-white/[.02] p-5 sm:grid-cols-2">
            <input className="admin-input" placeholder="Person name *" value={form.personName} onChange={(e) => setForm((f) => ({ ...f, personName: e.target.value }))} required />
            <input className="admin-input" placeholder="Designation" value={form.designation} onChange={(e) => setForm((f) => ({ ...f, designation: e.target.value }))} />
            <input className="admin-input" placeholder="Company" value={form.company} onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))} />
            <input className="admin-input" placeholder="Location" value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
            <input className="admin-input" placeholder="Project" value={form.project} onChange={(e) => setForm((f) => ({ ...f, project: e.target.value }))} />
            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-400">Rating</span>
              <button type="button" className="grid size-9 place-items-center rounded-md border border-white/[.08] text-zinc-300" onClick={() => setForm((f) => ({ ...f, rating: Math.max(1, f.rating - 1) }))}><Minus size={14} /></button>
              <span className="w-8 text-center text-sm font-bold text-white">{form.rating}</span>
              <button type="button" className="grid size-9 place-items-center rounded-md border border-white/[.08] text-zinc-300" onClick={() => setForm((f) => ({ ...f, rating: Math.min(5, f.rating + 1) }))}><Plus size={14} /></button>
            </div>
            <div className="sm:col-span-2">
              <textarea className="admin-input min-h-20 resize-y" placeholder="Quote *" value={form.quote} onChange={(e) => setForm((f) => ({ ...f, quote: e.target.value }))} required />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={busy}>{busy ? <Loader2 size={16} className="animate-spin" /> : null}{busy ? "Saving…" : "Add testimonial"}</Button>
            </div>
            <p className="text-xs text-zinc-500 sm:col-span-2">Testimonials start as <span className="text-zinc-300">Draft</span>. They only appear publicly once Approved.</p>
          </form>
        )}
      </div>

      <div className="admin-card overflow-x-auto">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/[.08] text-xs uppercase tracking-wider text-zinc-500">
              <th className="w-24 px-5 py-3.5 font-medium">Order</th>
              <th className="px-5 py-3.5 font-medium">Testimonial</th>
              <th className="px-5 py-3.5 font-medium">Approval</th>
              <th className="px-5 py-3.5 font-medium">Source note</th>
              <th className="px-5 py-3.5 text-right font-medium">Manage</th>
            </tr>
          </thead>
          <tbody>
            {testimonials.map((t, i) => (
              <tr key={t.id} className="border-b border-white/[.05] last:border-0 hover:bg-white/[.02]">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-1">
                    <button type="button" className="grid size-9 place-items-center rounded-md border border-white/[.08] text-zinc-400 hover:border-signal/40 hover:text-white disabled:opacity-30" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m18 15-6-6-6 6"/></svg></button>
                    <button type="button" className="grid size-9 place-items-center rounded-md border border-white/[.08] text-zinc-400 hover:border-signal/40 hover:text-white disabled:opacity-30" onClick={() => move(i, 1)} disabled={i === testimonials.length - 1} aria-label="Move down"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg></button>
                  </div>
                </td>
                <td className="px-5 py-3">
                  <div className="min-w-[360px]">
                    <div className="flex items-center gap-3">
                      <input className="admin-input min-h-10 !py-1 font-semibold text-white" defaultValue={t.personName} onBlur={(e) => { if (e.target.value !== t.personName) void updateTestimonial(t.id, { personName: e.target.value }); }} />
                      <span className="shrink-0 text-sm text-zinc-400">★ {t.rating ?? "–"}</span>
                    </div>
                    <textarea className="admin-input mt-2 min-h-14 resize-y text-sm" defaultValue={t.quote} onBlur={(e) => { if (e.target.value !== t.quote) void updateTestimonial(t.id, { quote: e.target.value }); }} />
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <input className="admin-input min-h-10 !py-1 text-sm" placeholder="Designation" defaultValue={t.designation ?? ""} onBlur={(e) => { if (e.target.value !== t.designation) void updateTestimonial(t.id, { designation: e.target.value || undefined }); }} />
                      <input className="admin-input min-h-10 !py-1 text-sm" placeholder="Company" defaultValue={t.company ?? ""} onBlur={(e) => { if (e.target.value !== t.company) void updateTestimonial(t.id, { company: e.target.value || undefined }); }} />
                      <input className="admin-input min-h-10 !py-1 text-sm" placeholder="Location" defaultValue={t.location ?? ""} onBlur={(e) => { if (e.target.value !== t.location) void updateTestimonial(t.id, { location: e.target.value || undefined }); }} />
                      <input className="admin-input min-h-10 !py-1 text-sm" placeholder="Project" defaultValue={t.project ?? ""} onBlur={(e) => { if (e.target.value !== t.project) void updateTestimonial(t.id, { project: e.target.value || undefined }); }} />
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3">
                  <select className="admin-input min-h-10 text-sm" value={t.approval} onChange={(e) => run(t.id, async () => { await updateTestimonialApproval(t.id, e.target.value as "DRAFT" | "VERIFIED" | "APPROVED"); })} disabled={busyRow === t.id}>
                    <option value="DRAFT">Draft</option>
                    <option value="VERIFIED">Verified</option>
                    <option value="APPROVED">Approved</option>
                  </select>
                  <p className="mt-1.5 text-[11px] text-zinc-500">Public only when Approved.</p>
                  <button type="button" className="mt-1 text-[11px] font-semibold text-zinc-400 hover:text-white" onClick={() => run(t.id, async () => { await updateTestimonial(t.id, { visible: !t.visible }); })}>
                    {t.visible ? "Visible" : "Hidden"}
                  </button>
                </td>
                <td className="px-5 py-3">
                  <div className="w-56 space-y-2">
                    <input className="admin-input min-h-10 !py-1 text-sm" placeholder="Source / internal note" defaultValue={t.sourceNote ?? ""} onBlur={(e) => { if (e.target.value !== t.sourceNote) void updateTestimonial(t.id, { sourceNote: e.target.value || undefined }); }} />
                    <ImageUpload label="Photo" value={t.photo} onChange={(url) => updateTestimonial(t.id, { photo: url ?? undefined })} />
                  </div>
                </td>
                <td className="px-5 py-3 text-right">
                  <ConfirmButton label="Delete" variant="destructive" message={`Delete testimonial from "${t.personName}"?`} onConfirm={async () => { await deleteTestimonial(t.id); router.refresh(); }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}