"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Pencil } from "lucide-react";
import { ConfirmButton } from "@/components/admin/photos/ConfirmButton";
import { deleteProjectAction, moveProjectAction, setProjectPublishedAction } from "@/app/admin/(dashboard)/projects/actions";

export function ProjectRowActions({ id, published, first, last }: { id: string; published: boolean; first: boolean; last: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setBusy(true);
    setError("");
    const r = await fn();
    setBusy(false);
    if (!r.ok) return setError(r.error ?? "That could not be saved.");
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Link href={`/admin/projects/${id}`} className="a-btn a-btn-sm a-btn-secondary"><Pencil size={14} aria-hidden /> Edit</Link>
        <button type="button" className="a-btn a-btn-sm a-btn-secondary" disabled={busy} onClick={() => run(() => setProjectPublishedAction(id, !published))}>
          {published ? "Take off website" : "Put on website"}
        </button>
        <button type="button" className="a-btn a-btn-sm a-btn-secondary" disabled={busy || first} onClick={() => run(() => moveProjectAction(id, -1))} aria-label="Move up"><ArrowUp size={14} aria-hidden /></button>
        <button type="button" className="a-btn a-btn-sm a-btn-secondary" disabled={busy || last} onClick={() => run(() => moveProjectAction(id, 1))} aria-label="Move down"><ArrowDown size={14} aria-hidden /></button>
        <ConfirmButton
          label="Delete"
          confirmLabel="Delete project"
          variant="destructive"
          message="Delete this project? It leaves the website immediately."
          onConfirm={async () => { await run(() => deleteProjectAction(id)); }}
        />
      </div>
      {error && <p role="alert" className="text-[0.8125rem]" style={{ color: "var(--a-danger)" }}>{error}</p>}
    </div>
  );
}
