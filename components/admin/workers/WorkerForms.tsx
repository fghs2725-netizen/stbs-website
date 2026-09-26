"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Archive, Pencil, RotateCcw, UserPlus } from "lucide-react";
import { BottomSheet } from "@/components/admin/shell/BottomSheet";
import { ConfirmDialog } from "@/components/quotation/feedback";
import { WORKER_ROLES } from "@/lib/worker-ledger";
import { createWorkerAction, setWorkerActiveAction, updateWorkerAction } from "@/app/admin/(dashboard)/workers/actions";

export type WorkerDraft = { id: string; name: string; phone: string | null; role: string | null; notes: string | null; openingBalance: number };

export function FormError({ message }: { message: string }) {
  if (!message) return null;
  return <p role="alert" className="rounded-[10px] p-3 text-[0.875rem]" style={{ background: "var(--a-danger-soft)", color: "var(--a-danger)" }}>{message}</p>;
}

/** Add a worker, or edit one. The opening balance is what was pending before the app. */
export function WorkerFormButton({ worker }: { worker?: WorkerDraft }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const [side, setSide] = useState<"OWE" | "ADVANCE">(worker && worker.openingBalance < 0 ? "ADVANCE" : "OWE");

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const input = { name: f.get("name"), phone: f.get("phone"), role: f.get("role"), notes: f.get("notes"), opening: f.get("opening"), openingSide: side };
    setError("");
    start(async () => {
      const r = worker ? await updateWorkerAction(worker.id, input) : await createWorkerAction(input);
      if (!r.ok) return setError(r.error);
      setOpen(false);
      if (!worker && r.id) router.push(`/admin/workers/${r.id}`);
      else router.refresh();
    });
  };

  return (
    <>
      {worker ? (
        <button type="button" className="a-btn a-btn-secondary a-btn-sm" onClick={() => setOpen(true)}><Pencil className="size-4" aria-hidden /> Edit</button>
      ) : (
        <button type="button" className="a-btn a-btn-primary" onClick={() => setOpen(true)}><UserPlus className="size-4" aria-hidden /> Add worker</button>
      )}
      <BottomSheet open={open} title={worker ? "Edit worker" : "Add worker"} onClose={() => setOpen(false)}>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <label className="a-label">Name
            <input name="name" className="a-input mt-1" defaultValue={worker?.name} required maxLength={80} autoComplete="off" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="a-label">Phone
              <input name="phone" className="a-input mt-1" defaultValue={worker?.phone ?? ""} inputMode="tel" maxLength={20} placeholder="98120 00000" />
            </label>
            <label className="a-label">Role
              <input name="role" className="a-input mt-1" defaultValue={worker?.role ?? ""} list="worker-roles" maxLength={40} placeholder="Driller" />
              <datalist id="worker-roles">{WORKER_ROLES.map((r) => <option key={r} value={r} />)}</datalist>
            </label>
          </div>
          <fieldset className="space-y-2">
            <legend className="a-label">Pending from before (optional)</legend>
            <div className="a-segment" role="radiogroup" aria-label="Who owes whom">
              <button type="button" role="radio" aria-checked={side === "OWE"} data-active={side === "OWE"} onClick={() => setSide("OWE")}>We owe him</button>
              <button type="button" role="radio" aria-checked={side === "ADVANCE"} data-active={side === "ADVANCE"} onClick={() => setSide("ADVANCE")}>He has advance</button>
            </div>
            <input name="opening" className="a-input a-num" inputMode="decimal" placeholder="₹ 0" defaultValue={worker && worker.openingBalance !== 0 ? String(Math.abs(worker.openingBalance)) : ""} aria-label="Opening amount" />
          </fieldset>
          <label className="a-label">Notes
            <textarea name="notes" className="a-input mt-1 min-h-[72px]" defaultValue={worker?.notes ?? ""} maxLength={500} />
          </label>
          <FormError message={error} />
          <button type="submit" className="a-btn a-btn-primary w-full" disabled={pending}>{pending ? "Saving…" : worker ? "Save changes" : "Add worker"}</button>
        </form>
      </BottomSheet>
    </>
  );
}

/** Remove (archive) or restore. Removing keeps every record; he just leaves the dashboard. */
export function WorkerArchiveButton({ id, name, active }: { id: string; name: string; active: boolean }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();
  const run = (next: boolean) => start(async () => {
    const r = await setWorkerActiveAction(id, next);
    setConfirm(false);
    if (r.ok) {
      if (next) router.refresh();
      else router.push("/admin/workers");
    }
  });
  if (!active) {
    return <button type="button" className="a-btn a-btn-secondary a-btn-sm" disabled={pending} onClick={() => run(true)}><RotateCcw className="size-4" aria-hidden /> Restore</button>;
  }
  return (
    <>
      <button type="button" className="a-btn a-btn-danger a-btn-sm" onClick={() => setConfirm(true)}><Archive className="size-4" aria-hidden /> Remove</button>
      {confirm && (
        <ConfirmDialog
          title={`Remove ${name}?`}
          body="He leaves the dashboard, but all his work and payment records are kept. You can restore him any time from Removed workers."
          confirmLabel="Remove worker"
          destructive
          busy={pending}
          onConfirm={() => run(false)}
          onCancel={() => setConfirm(false)}
        />
      )}
    </>
  );
}
