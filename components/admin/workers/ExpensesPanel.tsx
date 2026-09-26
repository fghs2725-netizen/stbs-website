"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { BottomSheet } from "@/components/admin/shell/BottomSheet";
import { ConfirmDialog } from "@/components/quotation/feedback";
import { EXPENSE_CATEGORIES, PAYMENT_METHODS, formatRupees, todayIST } from "@/lib/worker-ledger";
import type { ExpenseRow } from "@/lib/worker-management";
import { addExpenseAction, deleteExpenseAction, updateExpenseAction } from "@/app/admin/(dashboard)/expenses/actions";
import { FormError } from "./WorkerForms";

type Draft = { id?: string; date: string; amount: string; category: string; description: string; forWhat: string; method: string };

const dateLabel = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

/** "Add expense", the month's list, and edit or delete on tap. */
export function ExpensesPanel({ expenses, defaultDate }: { expenses: ExpenseRow[]; defaultDate: string }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, start] = useTransition();
  const set = (patch: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...patch } : d));
  const close = () => { setDraft(null); setConfirmDelete(false); };

  const openNew = () => {
    setError("");
    // A past month's page adds to that month; the current month's adds today.
    const date = defaultDate.slice(0, 7) === todayIST().slice(0, 7) ? todayIST() : defaultDate;
    setDraft({ date, amount: "", category: EXPENSE_CATEGORIES[0], description: "", forWhat: "", method: "Cash" });
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!draft) return;
    setError("");
    const input = { ...draft };
    start(async () => {
      const r = draft.id ? await updateExpenseAction(draft.id, input) : await addExpenseAction(input);
      if (!r.ok) return setError(r.error);
      close();
      router.refresh();
    });
  };

  const remove = () => start(async () => {
    if (!draft?.id) return;
    const r = await deleteExpenseAction(draft.id);
    if (!r.ok) { setConfirmDelete(false); return setError(r.error); }
    close();
    router.refresh();
  });

  return (
    <>
      <button type="button" className="a-btn a-btn-primary min-h-[52px]" onClick={openNew}><Plus className="size-5" aria-hidden /> Add expense</button>

      <section className="a-card overflow-hidden" aria-label="Expenses">
        {expenses.length ? (
          <ul className="a-divide">
            {expenses.map((x) => (
              <li key={x.id}>
                <button
                  type="button"
                  className="flex w-full items-start gap-3 p-4 text-left sm:px-5"
                  onClick={() => { setError(""); setDraft({ id: x.id, date: x.date, amount: String(x.amount), category: x.category, description: x.description ?? "", forWhat: x.forWhat ?? "", method: x.method ?? "Cash" }); }}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[0.9375rem] font-medium" style={{ color: "var(--a-ink)" }}>{x.description || x.category}</p>
                    <p className="mt-[2px] truncate text-[0.8125rem]" style={{ color: "var(--a-faint)" }}>{[dateLabel(x.date), x.category, x.forWhat, x.method].filter(Boolean).join(" · ")}</p>
                  </div>
                  <p className="a-num shrink-0 text-[0.9375rem] font-semibold" style={{ color: "var(--a-ink)" }}>{formatRupees(x.amount)}</p>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="p-6 text-center text-[0.9375rem]" style={{ color: "var(--a-faint)" }}>No expenses this month.</p>
        )}
      </section>

      <BottomSheet open={!!draft} title={draft?.id ? "Edit expense" : "Add expense"} onClose={close}>
        {draft && (
          <form onSubmit={submit} className="space-y-4" noValidate>
            <label className="a-label">Amount
              <input className="a-input a-num mt-1 text-[1.25rem]" inputMode="decimal" placeholder="₹ 1500" value={draft.amount} onChange={(e) => set({ amount: e.target.value })} />
            </label>
            <div>
              <span className="a-label">Category</span>
              <div className="mt-1 flex flex-wrap gap-2">
                {EXPENSE_CATEGORIES.map((c) => (
                  <button key={c} type="button" onClick={() => set({ category: c })} className="a-pill"
                    style={draft.category === c ? { background: "var(--a-brand)", color: "#fff" } : undefined}>{c}</button>
                ))}
              </div>
            </div>
            <label className="a-label">What was it (optional)
              <input className="a-input mt-1" placeholder="Rig diesel, 40 litres" value={draft.description} onChange={(e) => set({ description: e.target.value })} maxLength={200} />
            </label>
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
            <label className="a-label">For (site, vehicle or rig: optional)
              <input className="a-input mt-1" placeholder="Gohana site" value={draft.forWhat} onChange={(e) => set({ forWhat: e.target.value })} maxLength={120} />
            </label>
            <FormError message={error} />
            <button type="submit" className="a-btn a-btn-primary w-full" disabled={pending}>{pending ? "Saving…" : draft.id ? "Save changes" : "Save"}</button>
            {draft.id && (
              <button type="button" className="a-btn a-btn-danger w-full" disabled={pending} onClick={() => setConfirmDelete(true)}>
                <Trash2 className="size-4" aria-hidden /> Delete this expense
              </button>
            )}
          </form>
        )}
      </BottomSheet>
      {confirmDelete && (
        <ConfirmDialog title="Delete this expense?" body="It is removed from this month's totals." confirmLabel="Delete expense" destructive busy={pending} onConfirm={remove} onCancel={() => setConfirmDelete(false)} />
      )}
    </>
  );
}
