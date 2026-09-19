"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { History, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Toaster, useToasts } from "@/components/quotation/feedback";
import * as actions from "@/lib/website/actions";

type Revision = { id: string; label: string; createdAt: string | Date };
type RevisionApi = {
  listRevisions?: (entityType: string, entityId: string) => Promise<Revision[]>;
  restoreRevision?: (revisionId: string) => Promise<{ ok?: boolean; message?: string }>;
};

// The revision actions are added by the server side of this feature; a missing export must not break the editor.
const api = actions as unknown as RevisionApi;

/** Collapsible "Version history" panel with one-click restore (restores into the DRAFT; nothing goes live until published). */
export function VersionHistory({ entityType, entityId, onRestored }: { entityType: string; entityId: string; onRestored?: () => void }) {
  const router = useRouter();
  const { toasts, push, dismiss } = useToasts();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [revisions, setRevisions] = useState<Revision[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<Revision | null>(null);
  const [restoring, setRestoring] = useState(false);

  async function load() {
    if (!api.listRevisions) { setRevisions([]); setError("Version history isn't available yet."); return; }
    setLoading(true);
    setError(null);
    try {
      setRevisions(await api.listRevisions(entityType, entityId));
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Could not load earlier versions.");
    } finally {
      setLoading(false);
    }
  }

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && revisions === null) void load();
  }

  async function restore() {
    if (!pending) return;
    if (!api.restoreRevision) { push("error", "Restoring isn't available yet."); setPending(null); return; }
    setRestoring(true);
    try {
      const result = await api.restoreRevision(pending.id);
      if (result?.ok === false) throw new Error(result.message || "Could not restore that version.");
      push("success", "Restored to draft. Review it, then publish.");
      setPending(null);
      onRestored?.();
      router.refresh();
      void load();
    } catch (e) {
      push("error", e instanceof Error && e.message ? e.message : "Could not restore that version. Nothing was changed.");
    } finally {
      setRestoring(false);
    }
  }

  return (
    <div className="mt-6 rounded-lg border border-white/[.08] bg-white/[.02]">
      <button type="button" onClick={toggle} aria-expanded={open} className="flex min-h-11 w-full items-center gap-2 px-4 text-left text-sm font-semibold text-white">
        <History size={15} aria-hidden /> Version history
        <span className="ml-auto text-xs font-normal text-zinc-500">{open ? "Hide" : "Show"}</span>
      </button>
      {open && (
        <div className="border-t border-white/[.08] p-4">
          {loading && <p className="flex items-center gap-2 text-sm text-zinc-400"><Loader2 size={14} className="animate-spin" /> Loading earlier versions…</p>}
          {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
          {!loading && !error && revisions && revisions.length === 0 && <p className="text-sm text-zinc-500">No earlier versions yet.</p>}
          {!loading && revisions && revisions.length > 0 && (
            <ul className="space-y-2">
              {revisions.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 rounded-md border border-white/[.06] bg-black/20 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-zinc-200">{r.label}</p>
                    <p className="text-xs text-zinc-500">{new Date(r.createdAt).toLocaleString()}</p>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => setPending(r)}><RotateCcw size={14} /> Restore this version</Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {pending && (
        <ConfirmDialog
          title="Restore this version?"
          body={`"${pending.label}" (${new Date(pending.createdAt).toLocaleString()}) replaces your current draft. The live site does not change until you publish.`}
          confirmLabel="Restore to draft"
          busy={restoring}
          onConfirm={() => void restore()}
          onCancel={() => setPending(null)}
        />
      )}
      <Toaster toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
