"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImageUpload } from "./ImageUpload";

export function FeaturesEditor({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [text, setText] = useState(stringify(value));
  const [error, setError] = useState<string | null>(null);

  function stringify(list: string[]) {
    return list.join("\n");
  }

  function commit(raw: string) {
    setText(raw);
    const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
    onChange(lines);
    setError(null);
  }

  return (
    <div>
      <label className="admin-label">Features (one per line)</label>
      <textarea className="admin-input min-h-24 resize-y" value={text} onChange={(e) => commit(e.target.value)} placeholder={"Durable casing materials\nFast follow-up support"} />
      <p className="mt-1.5 text-xs text-zinc-500">{error ?? "Each line becomes a bullet point."}</p>
    </div>
  );
}

export function FaqsEditor({ value, onChange }: { value: Array<{ question: string; answer: string }>; onChange: (v: Array<{ question: string; answer: string }>) => void }) {
  const [rows, setRows] = useState(value);
  const [input, setInput] = useState({ question: "", answer: "" });

  function update(index: number, field: "question" | "answer", next: string) {
    const nextRows = rows.map((r, i) => (i === index ? { ...r, [field]: next } : r));
    setRows(nextRows);
    onChange(nextRows);
  }

  function remove(index: number) {
    const nextRows = rows.filter((_, i) => i !== index);
    setRows(nextRows);
    onChange(nextRows);
  }

  function add() {
    if (!input.question.trim() && !input.answer.trim()) return;
    const nextRows = [...rows, { question: input.question.trim(), answer: input.answer.trim() }];
    setRows(nextRows);
    setInput({ question: "", answer: "" });
    onChange(nextRows);
  }

  return (
    <div className="rounded-lg border border-white/[.08] bg-white/[.02] p-4">
      <p className="mb-3 text-sm font-semibold text-white">FAQs ({rows.length})</p>
      <div className="space-y-3">
        {rows.map((row, i) => (
          <div key={i} className="rounded-lg border border-white/[.06] bg-black/20 p-3">
            <label className="admin-label">Question</label>
            <input className="admin-input" value={row.question} onChange={(e) => update(i, "question", e.target.value)} />
            <label className="admin-label mt-3">Answer</label>
            <textarea className="admin-input min-h-20 resize-y" value={row.answer} onChange={(e) => update(i, "answer", e.target.value)} />
            <div className="mt-2 text-right">
              <button type="button" onClick={() => remove(i)} className="inline-flex min-h-9 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold text-red-400 hover:bg-red-500/10">
                <Trash2 size={13} /> Remove
              </button>
            </div>
          </div>
        ))}
        {rows.length === 0 && <p className="text-xs text-zinc-500">No FAQs yet.</p>}
      </div>
      <div className="mt-3 grid gap-2 lg:grid-cols-2">
        <input className="admin-input" placeholder="Question" value={input.question} onChange={(e) => setInput((s) => ({ ...s, question: e.target.value }))} />
        <div className="flex gap-2">
          <input className="admin-input" placeholder="Answer" value={input.answer} onChange={(e) => setInput((s) => ({ ...s, answer: e.target.value }))} />
          <Button type="button" size="icon" variant="secondary" onClick={add} aria-label="Add FAQ"><Plus size={16} /></Button>
        </div>
      </div>
    </div>
  );
}

export function BusySaveLabel({ busy, label, busyLabel }: { busy: boolean; label: string; busyLabel: string }) {
  return busy ? <Loader2 size={16} className="animate-spin" /> : null;
}