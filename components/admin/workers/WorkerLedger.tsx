"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Hammer, IndianRupee, Trash2 } from "lucide-react";
import { BottomSheet } from "@/components/admin/shell/BottomSheet";
import { ConfirmDialog } from "@/components/quotation/feedback";
import {
  DEFAULT_WORK_DESCRIPTION, DEFAULT_WORK_UNIT, PAYMENT_METHODS, PAYMENT_PICKS, formatRupees, parseAmount,
  parseQuantity, todayIST, workAmount, type EntryKind, type LedgerRow,
} from "@/lib/worker-ledger";
import { addEntryAction, deleteEntryAction, updateEntryAction } from "@/app/admin/(dashboard)/workers/actions";
import { FormError } from "./WorkerForms";
import { balanceText } from "./BalanceLabel";

type Draft = {
  id?: string; kind: EntryKind; date: string; description: string; site: string;
  quantity: string; unit: string; rate: string; amount: string; method: string;
};

const dateLabel = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

function blank(kind: EntryKind, lastRates: Record<string, number>): Draft {
  const rate = lastRates[DEFAULT_WORK_UNIT];
  return {
    kind, date: todayIST(), description: kind === "WORK" ? DEFAULT_WORK_DESCRIPTION : "", site: "",
    quantity: "", unit: DEFAULT_WORK_UNIT, rate: rate != null ? String(rate) : "", amount: "", method: "Cash",
  };
}

function fromRow(r: LedgerRow): Draft {
  return {
    id: r.id, kind: r.kind, date: r.date, description: r.description, site: r.site ?? "",
    quantity: r.quantity != null ? String(r.quantity) : "", unit: r.unit ?? DEFAULT_WORK_UNIT,
    rate: r.rate != null ? String(r.rate) : "", amount: String(r.amount), method: r.method ?? "Cash",
  };
}

/** Add money given / Add work, the ledger (newest first, with the balance after each line), and edit on tap. */
export function WorkerLedger({ workerId, rows, units, lastRates, emptyText }: {
  workerId: string; rows: LedgerRow[]; units: string[]; lastRates: Record<string, number>; emptyText: string;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, start] = useTransition();
  const newestFirst = useMemo(() => [...rows].reverse(), [rows]);

  const set = (patch: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...patch } : d));
  const openNew = (kind: EntryKind) => { setError(""); setDraft(blank(kind, lastRates)); };
  const close = () => { setDraft(null); setConfirmDelete(false); };

  const qty = draft ? parseQuantity(draft.quantity) : null;
  const rate = draft ? parseAmount(draft.rate) : null;
  const workTotal = qty != null && rate != null ? workAmount(qty, rate) : null;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!draft) return;
    setError("");
    const input = { ...draft };
    start(async () => {
      const r = draft.id ? await updateEntryAction(draft.id, workerId, input) : await addEntryAction(workerId, input);
      if (!r.ok) return setError(r.error);
      close();
      router.refresh();
    });
  };

  const remove = () => {
    if (!draft?.id) return;
    start(async () => {
      const r = await deleteEntryAction(draft.id!, workerId);
      if (!r.ok) { setConfirmDelete(false); return setError(r.error); }
      close();
      router.refresh();
    });
  };

  const unitOptions = draft && !units.includes(draft.unit) ? [draft.unit, ...units] : units;

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <button type="button" className="a-btn a-btn-primary min-h-[56px]" onClick={() => openNew("PAYMENT")}>
          <IndianRupee className="size-5" aria-hidden /> Money given
        </button>
        <button type="button" className="a-btn a-btn-secondary min-h-[56px]" onClick={() => openNew("WORK")}>
          <Hammer className="size-5" aria-hidden /> Add work
        </button>
      </div>

      <section className="a-card overflow-hidden" aria-label="Work and payments">
        {newestFirst.length ? (
          <ul className="a-divide">
            {newestFirst.map((r) => (
              <li key={r.id}>
                <button type="button" onClick={() => { setError(""); setDraft(fromRow(r)); }} className="flex w-full items-start gap-3 p-4 text-left sm:px-5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[0.9375rem] font-medium" style={{ color: "var(--a-ink)" }}>{r.description}</p>
                    <p className="mt-[2px] truncate text-[0.8125rem]" style={{ color: "var(--a-faint)" }}>
                      {[
                        dateLabel(r.date),
                        r.kind === "WORK" && r.quantity != null ? `${r.quantity} ${r.unit ?? ""} × ${formatRupees(r.rate ?? 0)}` : r.method,
                        r.site,
                      ].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="a-num text-[0.9375rem] font-semibold" style={{ color: r.kind === "WORK" ? "var(--a-positive)" : "var(--a-ink)" }}>
                      {r.kind === "WORK" ? "+" : "−"}{formatRupees(r.amount)}
                    </p>
                    <p className="a-num mt-[2px] text-[0.75rem]" style={{ color: "var(--a-faint)" }}>{balanceText(r.balanceAfter)}</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="p-6 text-center text-[0.9375rem]" style={{ color: "var(--a-faint)" }}>{emptyText}</p>
        )}
      </section>

      <BottomSheet
        open={!!draft}
        title={draft ? `${draft.id ? "Edit" : "Add"} ${draft.kind === "WORK" ? "work" : "money given"}` : ""}
        onClose={close}
      >
        {draft && (
          <form onSubmit={submit} className="space-y-4" noValidate>
            {draft.kind === "PAYMENT" ? (
              <>
                <label className="a-label">Amount
                  <input className="a-input a-num mt-1 text-[1.25rem]" inputMode="decimal" placeholder="₹ 500" value={draft.amount} onChange={(e) => set({ amount: e.target.value })} />
                </label>
                <div>
                  <span className="a-label">For</span>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {PAYMENT_PICKS.map((p) => (
                      <button key={p} type="button" onClick={() => set({ description: p })} className="a-pill" data-active={draft.description === p}
                        style={draft.description === p ? { background: "var(--a-brand)", color: "#fff" } : undefined}>{p}</button>
                    ))}
                  </div>
                  <input className="a-input mt-2" placeholder="Or write what it was for" value={draft.description} onChange={(e) => set({ description: e.target.value })} maxLength={120} aria-label="Description" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <label className="a-label">Date
                    <input type="date" className="a-input mt-1" value={draft.date} onChange={(e) => set({ date: e.target.value })} />
                  </label>
                  <label className="a-label">Paid by
                    <select className="a-input mt-1" value={draft.method} onChange={(e) => set({ method: e.target.value })}>
                      {PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}
                    </select>
                  </label>
                </div>
              </>
            ) : (
              <>
                <label className="a-label">Work
                  <input className="a-input mt-1" value={draft.description} onChange={(e) => set({ description: e.target.value })} maxLength={120} />
                </label>
                <div className="grid grid-cols-[1fr_1fr_1.1fr] gap-2">
                  <label className="a-label">How much
                    <input className="a-input a-num mt-1" inputMode="decimal" placeholder="200" value={draft.quantity} onChange={(e) => set({ quantity: e.target.value })} />
                  </label>
                  <label className="a-label">Unit
                    <select className="a-input mt-1" value={draft.unit} onChange={(e) => set({ unit: e.target.value, rate: lastRates[e.target.value] != null && !draft.id ? String(lastRates[e.target.value]) : draft.rate })}>
                      {unitOptions.map((u) => <option key={u}>{u}</option>)}
                    </select>
                  </label>
                  <label className="a-label">Rate (₹)
                    <input className="a-input a-num mt-1" inputMode="decimal" placeholder="75" value={draft.rate} onChange={(e) => set({ rate: e.target.value })} />
                  </label>
                </div>
                <p className="a-num rounded-[10px] p-3 text-[0.9375rem]" style={{ background: "var(--a-positive-soft)", color: "var(--a-positive)" }}>
                  {workTotal != null ? `${qty} ${draft.unit} × ${formatRupees(rate!)} = ${formatRupees(workTotal)}` : "Enter how much and the rate to see the amount."}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <label className="a-label">Date
                    <input type="date" className="a-input mt-1" value={draft.date} onChange={(e) => set({ date: e.target.value })} />
                  </label>
                  <label className="a-label">Site (optional)
                    <input className="a-input mt-1" placeholder="Gohana" value={draft.site} onChange={(e) => set({ site: e.target.value })} maxLength={120} />
                  </label>
                </div>
              </>
            )}
            <FormError message={error} />
            <button type="submit" className="a-btn a-btn-primary w-full" disabled={pending}>{pending ? "Saving…" : draft.id ? "Save changes" : "Save"}</button>
            {draft.id && (
              <button type="button" className="a-btn a-btn-danger w-full" disabled={pending} onClick={() => setConfirmDelete(true)}>
                <Trash2 className="size-4" aria-hidden /> Delete this entry
              </button>
            )}
          </form>
        )}
      </BottomSheet>
      {confirmDelete && (
        <ConfirmDialog
          title="Delete this entry?"
          body="It is removed from his balance and from future statements."
          confirmLabel="Delete entry"
          destructive
          busy={pending}
          onConfirm={remove}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </>
  );
}
