"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { FilePlus2, FileUp, Send, Sparkles } from "lucide-react";

type Turn = { role: "user" | "assistant"; content: string };
type Draft = { url: string; items: number; notes: string[] };
type Mode = "ask" | "quotation" | "invoice";

const SUGGESTIONS = [
  "How much do clients owe me?",
  "Which bills are overdue?",
  "This month's billing and payments",
  "Expenses this month by category",
  "How much do I owe the workers?",
  "New enquiries this week",
];

async function call<T>(url: string, init: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || "Something went wrong. Please try again.");
  return data as T;
}

/** **bold** in a reply shown as bold; everything else as plain text with its line breaks. */
function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\*\*[^*]+\*\*)/g).map((part, n) =>
        part.startsWith("**") && part.endsWith("**") ? <strong key={n}>{part.slice(2, -2)}</strong> : <span key={n}>{part}</span>,
      )}
    </>
  );
}

function DraftMade({ draft, kind }: { draft: Draft; kind: string }) {
  return (
    <div className="a-card flex flex-col gap-3 p-4" role="status">
      <p className="a-h2">Draft {kind} ready: {draft.items} {draft.items === 1 ? "line" : "lines"}</p>
      {draft.notes.length > 0 && (
        <div>
          <p className="a-label">Check before you send it</p>
          <ul className="mt-1 list-disc pl-5 text-[0.9375rem]">
            {draft.notes.map((n) => <li key={n}>{n}</li>)}
          </ul>
        </div>
      )}
      <Link href={draft.url} className="a-btn a-btn-primary self-start">Open the draft</Link>
    </div>
  );
}

export function AiHelper() {
  const [mode, setMode] = useState<Mode>("ask");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [question, setQuestion] = useState("");
  const [requirement, setRequirement] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<{ kind: string; draft: Draft } | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  function switchTo(next: Mode) {
    setMode(next);
    setError("");
  }

  async function ask(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    const next = [...turns, { role: "user" as const, content: q }];
    setTurns(next);
    setQuestion("");
    setBusy(true);
    setError("");
    try {
      const { reply } = await call<{ reply: string }>("/api/admin-ai/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ messages: next }) });
      setTurns([...next, { role: "assistant", content: reply }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
      requestAnimationFrame(() => endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }));
    }
  }

  async function makeQuotation() {
    if (busy) return;
    setBusy(true);
    setError("");
    setDraft(null);
    try {
      const d = await call<Draft>("/api/admin-ai/quotation", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: requirement }) });
      setDraft({ kind: "quotation", draft: d });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function makeInvoice() {
    if (busy || !file) return;
    setBusy(true);
    setError("");
    setDraft(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const d = await call<Draft>("/api/admin-ai/invoice", { method: "POST", body: form });
      setDraft({ kind: "invoice", draft: d });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="a-segment self-start" role="group" aria-label="What to do">
        <button type="button" data-active={mode === "ask"} onClick={() => switchTo("ask")}>Ask</button>
        <button type="button" data-active={mode === "quotation"} onClick={() => switchTo("quotation")}>Quotation</button>
        <button type="button" data-active={mode === "invoice"} onClick={() => switchTo("invoice")}>Invoice from PO</button>
      </div>

      {mode === "ask" && (
        <section className="flex flex-col gap-3" aria-label="Ask about your business">
          {turns.length === 0 && (
            <div className="a-card flex flex-col gap-3 p-4">
              <p className="a-muted text-[0.9375rem]">Ask about bills, payments, quotations, expenses, workers or enquiries. It reads your figures and never changes anything.</p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button key={s} type="button" className="a-btn a-btn-secondary a-btn-sm" onClick={() => ask(s)} disabled={busy}>{s}</button>
                ))}
              </div>
            </div>
          )}
          {turns.map((t, n) => (
            <div
              key={n}
              className={`max-w-[92%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-[0.9375rem] leading-relaxed ${t.role === "user" ? "self-end" : "a-card self-start"}`}
              style={t.role === "user" ? { background: "var(--a-brand-soft)", color: "var(--a-ink)" } : undefined}
            >
              {t.role === "assistant" ? <Rich text={t.content} /> : t.content}
            </div>
          ))}
          {busy && <p className="a-muted self-start text-[0.9375rem]">Looking it up…</p>}
          <div ref={endRef} />
          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void ask(question);
            }}
          >
            <textarea
              className="a-input flex-1"
              aria-label="Your question"
              placeholder="e.g. How much did ISGEC pay this year?"
              rows={2}
              maxLength={600}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              style={{ height: "auto", paddingTop: 10, paddingBottom: 10 }}
            />
            <button type="submit" className="a-btn a-btn-primary" disabled={busy || !question.trim()} aria-label="Ask">
              <Send className="size-4" aria-hidden />
            </button>
          </form>
          {turns.length > 0 && (
            <button type="button" className="a-link self-start text-[0.875rem]" onClick={() => setTurns([])} disabled={busy}>Start a new chat</button>
          )}
        </section>
      )}

      {mode === "quotation" && (
        <section className="a-card flex flex-col gap-3 p-4" aria-label="Quotation from requirements">
          <label className="a-label" htmlFor="ai-requirement">Paste what the customer needs</label>
          <textarea
            id="ai-requirement"
            className="a-input"
            rows={8}
            maxLength={6000}
            placeholder={"e.g. Client: Sharma Farms, Gohana\nBorewell 8 inch, 300 ft\nPVC casing 6 inch, 200 ft\nSubmersible pump 7.5 HP with panel"}
            value={requirement}
            onChange={(e) => setRequirement(e.target.value)}
            style={{ height: "auto", paddingTop: 10, paddingBottom: 10 }}
          />
          <p className="a-muted text-[0.875rem]">Rates come from your past quotations and bills. Lines with no known rate are left at 0 for you to fill.</p>
          <button type="button" className="a-btn a-btn-primary self-start" onClick={makeQuotation} disabled={busy || requirement.trim().length < 5}>
            <FilePlus2 className="size-4" aria-hidden /> {busy ? "Writing the draft…" : "Make draft quotation"}
          </button>
        </section>
      )}

      {mode === "invoice" && (
        <section className="a-card flex flex-col gap-3 p-4" aria-label="Invoice from a purchase order">
          <label className="a-label" htmlFor="ai-po">The client&apos;s purchase order (PDF)</label>
          <input id="ai-po" type="file" accept="application/pdf,.pdf" className="text-[0.9375rem]" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <p className="a-muted text-[0.875rem]">The buyer, PO number, items, HSN codes, rates and GST are read from the PO. The invoice stays a draft with no number until you issue it.</p>
          <button type="button" className="a-btn a-btn-primary self-start" onClick={makeInvoice} disabled={busy || !file}>
            <FileUp className="size-4" aria-hidden /> {busy ? "Reading the PO…" : "Make draft invoice"}
          </button>
        </section>
      )}

      {error && <div role="alert" className="a-card p-4 text-[0.9375rem]" style={{ color: "var(--a-danger)" }}>{error}</div>}
      {mode !== "ask" && draft && draft.kind === (mode === "quotation" ? "quotation" : "invoice") && <DraftMade kind={draft.kind} draft={draft.draft} />}

      <p className="a-muted flex items-center gap-1.5 text-[0.8125rem]">
        <Sparkles className="size-3.5" aria-hidden /> Free AI (Groq, with Google Gemini as backup). It only answers and makes drafts; nothing is issued or sent without you.
      </p>
    </div>
  );
}
