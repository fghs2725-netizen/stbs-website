"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCw, Sparkles } from "lucide-react";

type Summary = { day: string; facts: string[]; text: string | null; at: string };

/** The "Today" card on Home: a short note on what needs attention, made once a day. */
export function TodaySummary() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "hidden" | "error">("loading");

  async function load(refresh: boolean) {
    setState("loading");
    try {
      const res = await fetch("/api/admin-ai/summary", { method: refresh ? "POST" : "GET", cache: "no-store" });
      if (res.status === 401) return setState("hidden");
      if (!res.ok) throw new Error();
      setSummary(await res.json());
      setState("ready");
    } catch {
      setState("error");
    }
  }

  useEffect(() => {
    void load(false);
  }, []);

  if (state === "hidden") return null;
  const time = summary ? new Date(summary.at).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" }) : "";

  return (
    <section className="a-card flex flex-col gap-3 p-4 sm:p-5" aria-labelledby="today-heading" aria-busy={state === "loading"}>
      <div className="flex items-center justify-between gap-2">
        <h2 id="today-heading" className="a-h2 flex items-center gap-2">
          <Sparkles className="size-4" aria-hidden style={{ color: "var(--a-brand)" }} /> Today
        </h2>
        <button type="button" className="a-btn a-btn-secondary a-btn-sm" onClick={() => load(true)} disabled={state === "loading"} aria-label="Make today's summary again">
          <RefreshCw className={`size-4 ${state === "loading" ? "animate-spin" : ""}`} aria-hidden />
        </button>
      </div>
      {state === "loading" && !summary && <p className="a-muted text-[0.9375rem]">Reading today&apos;s figures…</p>}
      {state === "error" && <p className="text-[0.9375rem]" style={{ color: "var(--a-danger)" }}>Today&apos;s summary could not be made. Tap refresh to try again.</p>}
      {summary && (
        <>
          {summary.text ? (
            <p className="whitespace-pre-wrap text-[0.9375rem] leading-relaxed">{summary.text.replace(/\*\*/g, "")}</p>
          ) : summary.facts.length ? (
            <ul className="list-disc pl-5 text-[0.9375rem] leading-relaxed">
              {summary.facts.map((f) => <li key={f}>{f}</li>)}
            </ul>
          ) : (
            <p className="a-muted text-[0.9375rem]">Nothing needs attention right now.</p>
          )}
          <div className="flex items-center justify-between gap-2 text-[0.8125rem]">
            <span className="a-muted">Updated {time}</span>
            <Link href="/admin/ai" className="a-link">Ask the AI</Link>
          </div>
        </>
      )}
    </section>
  );
}
