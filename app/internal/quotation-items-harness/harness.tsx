"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ItemsTable } from "@/components/quotation/items-table";
import { ConfirmDialog } from "@/components/quotation/feedback";
import { createHistory, duplicateItem, isPopulatedItem, moveItem, pushHistory, redoHistory, undoHistory, type History } from "@/components/quotation/editor-logic";
import { validateItem, type QuotationItem } from "@/components/quotation/quotation-model";
import "@/components/quotation/editor.css";

// Test-only harness: the same row operations the editor performs, without any server action.
export function Harness() {
  const [h, setH] = useState<History<QuotationItem[]>>(() => createHistory([{ id: "a", description: "Pipe", unit: "m", quantity: 2, rate: 100 }]));
  const ref = useRef(h);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const set = useCallback((fn: (p: QuotationItem[]) => QuotationItem[], key?: string) => { ref.current = pushHistory(ref.current, fn(ref.current.present), key, Date.now()); setH(ref.current); }, []);
  const items = h.present;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const k = e.key.toLowerCase();
      if (k === "z" && !e.shiftKey) { e.preventDefault(); ref.current = undoHistory(ref.current); setH(ref.current); }
      else if (k === "y") { e.preventDefault(); ref.current = redoHistory(ref.current); setH(ref.current); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const errors = new Map(items.map((i) => [i.id, validateItem(i)] as const).filter(([, e]) => Object.keys(e).length));
  const remove = (id: string) => set((x) => x.filter((i) => i.id !== id));
  return (
    <div className="quotation-editor" style={{ display: "block", height: "auto", padding: 16 }}>
    <div className="editor-panel" style={{ height: "auto", padding: 16 }}>
      <ItemsTable
        items={items}
        errors={errors}
        focusId={focusId}
        onEdit={(id, patch, key) => set((x) => x.map((i) => (i.id === id ? { ...i, ...patch } : i)), key)}
        onAdd={() => { const id = crypto.randomUUID(); set((x) => [...x, { id, description: "", unit: "", quantity: 1, rate: 0 }]); setFocusId(id); }}
        onRemove={(id) => { const it = items.find((i) => i.id === id); if (it && isPopulatedItem(it)) setConfirm(id); else remove(id); }}
        onDuplicate={(id) => set((x) => duplicateItem(x, id, crypto.randomUUID()))}
        onMove={(f, t) => set((x) => moveItem(x, f, t))}
        onReorder={(f, t) => set((x) => moveItem(x, f, t))}
      />
      <output data-testid="count">{items.length}</output>
      {confirm && <ConfirmDialog title="Delete this item?" body="This row has content." confirmLabel="Delete item" destructive onConfirm={() => { remove(confirm); setConfirm(null); }} onCancel={() => setConfirm(null)} />}
    </div>
    </div>
  );
}
