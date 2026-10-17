"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { MessageCircle, MessagesSquare, Phone, SendHorizontal, X } from "lucide-react";
import { WhatsAppFloat } from "@/components/whatsapp-float";
import { useWebsiteEditor } from "@/lib/website/editor-context";
import { ASSISTANT_NAME, leadDetails, MAX_MESSAGE_CHARS, type ChatAction, type ChatFailure, type ChatMessage, type ChatReply } from "@/lib/assistant/shared";
import { fieldErrors, quoteSchema, SERVICE_CHOICES, type QuoteFieldErrors } from "@/lib/quote-request";

/**
 * "Ask STBS": the website chat assistant, in the corner where the WhatsApp button used to be.
 * The panel offers the AI chat, WhatsApp and a call. When a visitor wants a quote, a short form inside
 * the chat sends a normal enquiry (/api/quote: admin Enquiries + email + phone notification) with the
 * visitor's questions attached. Without an AI key (or inside the visual editor) the plain WhatsApp
 * button is shown instead.
 */

type Item =
  | { kind: "msg"; role: "user" | "assistant"; text: string; action?: ChatAction }
  | { kind: "fallback"; text: string }
  | { kind: "lead" }
  | { kind: "done"; text: string };

const STORE_KEY = "stbs-assistant";
const WELCOME = "Namaste! I'm the STBS Assistant. Ask me about borewell drilling, water testing, tubewells or rainwater harvesting. Hindi ya English, jaise aap chahein.";
const CHIPS: Array<{ label: string; ask?: string; lead?: true; person?: true }> = [
  { label: "Which areas do you serve?", ask: "Which areas do you serve?" },
  { label: "Water testing kya hota hai?", ask: "Water testing kya hota hai?" },
  { label: "Get a site assessment", lead: true },
  { label: "Talk to a person", person: true },
];
const SITE_PATHS = /(\/(?:quote|water-testing|borewell-drilling|tubewell-construction|borewell-material-supply|rainwater-harvesting|projects|clients|about|contact|services))(?![\w/-])/g;

const digits = (p?: string) => (p ?? "").replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "");

/** Bot text with the site's own pages turned into links. Everything else stays plain text. */
function BotText({ text }: { text: string }) {
  const parts: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(SITE_PATHS)) {
    const i = m.index ?? 0;
    if (i > last) parts.push(text.slice(last, i));
    parts.push(<Link key={i} href={m[1]} className="font-medium text-stbs-brand-mid underline underline-offset-2">{m[1]}</Link>);
    last = i + m[0].length;
  }
  parts.push(text.slice(last));
  return <>{parts}</>;
}

function guessService(history: ChatMessage[]): (typeof SERVICE_CHOICES)[number] {
  const t = history.filter((m) => m.role === "user").map((m) => m.content.toLowerCase()).join(" ");
  if (/rain|barish|baarish|recharge|harvest|बारिश/.test(t)) return "Rainwater Harvesting";
  if (/test|survey|jaanch|janch|जांच/.test(t)) return "Water Testing";
  if (/pipe|pump|motor|material|saman|samaan/.test(t)) return "Borewell Material Supply";
  if (/tubewell|ट्यूबवेल/.test(t)) return "Tubewell Construction";
  if (/bore|boring|drill|बोर/.test(t)) return "Borewell Drilling";
  return "Not sure yet";
}

export function SiteAssistant({ phone, enabled }: { phone?: string; enabled: boolean }) {
  const editor = useWebsiteEditor();
  if (!enabled || editor.isEditor) return <WhatsAppFloat phone={phone} />;
  return <AssistantPanel phone={phone} />;
}

function AssistantPanel({ phone }: { phone?: string }) {
  const number = digits(phone);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [nudge, setNudge] = useState(false);
  const panelId = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    window.setTimeout(() => launcherRef.current?.focus(), 0);
  }, []);

  // Keep the conversation for this browser tab, so it survives moving between pages and reloads.
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORE_KEY);
      if (saved) setItems(JSON.parse(saved) as Item[]);
    } catch { /* storage blocked */ }
  }, []);
  useEffect(() => {
    try { sessionStorage.setItem(STORE_KEY, JSON.stringify(items.slice(-40))); } catch { /* ignore */ }
  }, [items]);
  // A one-time hint next to the button, once the visitor has had time to look around.
  useEffect(() => {
    let seen = false;
    try { seen = sessionStorage.getItem(`${STORE_KEY}-hint`) === "1"; } catch { /* ignore */ }
    if (seen) return;
    const t = window.setTimeout(() => setNudge(true), 20_000);
    return () => window.clearTimeout(t);
  }, []);
  useEffect(() => {
    if (!open) return;
    setNudge(false);
    try { sessionStorage.setItem(`${STORE_KEY}-hint`, "1"); } catch { /* ignore */ }
    const t = window.setTimeout(() => inputRef.current?.focus(), 60);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => { window.clearTimeout(t); window.removeEventListener("keydown", onKey); };
  }, [open, close]);
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [items, busy, open]);

  const history = (list: Item[]): ChatMessage[] =>
    list.flatMap((it) => (it.kind === "msg" ? [{ role: it.role, content: it.text }] : []));

  const waHref = (text: string) => `https://wa.me/91${number}?text=${encodeURIComponent(text)}`;
  const lastQuestion = [...items].reverse().find((i): i is Extract<Item, { kind: "msg" }> => i.kind === "msg" && i.role === "user")?.text;
  const waText = lastQuestion ? `Hi, I was chatting with the STBS Assistant. ${lastQuestion}` : "Hi, I have a question about borewell work.";

  async function ask(text: string) {
    const q = text.trim().slice(0, MAX_MESSAGE_CHARS);
    if (!q || busy) return;
    const next: Item[] = [...items.filter((i) => i.kind !== "lead"), { kind: "msg", role: "user", text: q }];
    setItems(next);
    setDraft("");
    setBusy(true);
    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ messages: history(next) }) });
      const data = (await res.json()) as ChatReply | ChatFailure;
      if (data.ok) {
        setItems((cur) => [...cur, { kind: "msg", role: "assistant", text: data.reply, action: data.action }, ...(data.action === "lead" ? [{ kind: "lead" } as Item] : [])]);
      } else {
        setItems((cur) => [...cur, { kind: "fallback", text: data.error || "I can't answer right now." }]);
      }
    } catch {
      setItems((cur) => [...cur, { kind: "fallback", text: "I can't reach the server right now. Please WhatsApp or call us." }]);
    } finally {
      setBusy(false);
    }
  }

  function chip(c: (typeof CHIPS)[number]) {
    if (c.lead) setItems((cur) => [...cur.filter((i) => i.kind !== "lead"), { kind: "lead" }]);
    else if (c.person) setItems((cur) => [...cur, { kind: "fallback", text: "Happy to connect you with the team." }]);
    else if (c.ask) void ask(c.ask);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void ask(draft);
  }

  const started = items.some((i) => i.kind === "msg");

  return (
    <aside aria-label={`${ASSISTANT_NAME} chat`} className="font-copy">
      {!open && (
        <div className="fixed bottom-u2 right-u2 z-50 flex items-center gap-2 md:bottom-u3 md:right-u3">
          {nudge && (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="hidden max-w-[220px] rounded-2xl rounded-br-md border border-stbs-hairline bg-white px-3.5 py-2.5 text-left text-[0.875rem] leading-snug text-stbs-ink shadow-[0_12px_32px_-12px_rgba(0,0,0,.35)] sm:block"
            >
              Questions about your borewell? Ask here, in Hindi or English.
            </button>
          )}
          <button
            ref={launcherRef}
            type="button"
            onClick={() => setOpen(true)}
            aria-expanded={false}
            aria-controls={panelId}
            className="flex h-14 items-center gap-2 rounded-full bg-stbs-accent pl-4 pr-5 text-white shadow-[0_14px_34px_-12px_rgba(168,120,40,.7)] transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stbs-ink max-sm:w-14 max-sm:justify-center max-sm:p-0"
          >
            <MessagesSquare size={24} strokeWidth={1.75} aria-hidden />
            <span className="text-[0.9375rem] font-bold tracking-[.01em] max-sm:sr-only">Ask STBS</span>
          </button>
        </div>
      )}

      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label={ASSISTANT_NAME}
          className="fixed inset-x-0 bottom-0 z-[60] flex h-[86svh] max-h-[calc(100svh-12px)] flex-col overflow-hidden rounded-t-[20px] border border-black/5 bg-[#FBF8F2] shadow-[0_24px_80px_-12px_rgba(0,0,0,.5)] sm:inset-x-auto sm:bottom-u3 sm:right-u3 sm:h-[620px] sm:w-[390px] sm:rounded-[20px]"
        >
          <header className="flex items-center gap-3 bg-stbs-brand-deep px-4 py-3 text-stbs-ink-on-dark">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/stbs-logo-hd.svg" alt="" width={58} height={25} className="h-[25px] w-[58px] shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-[0.9375rem] font-bold leading-tight">{ASSISTANT_NAME}</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-[0.75rem] text-stbs-muted-on-dark">
                <span className="inline-block size-1.5 rounded-full bg-[#4ade80]" aria-hidden /> AI assistant · Hindi or English
              </p>
            </div>
            <button type="button" onClick={close} aria-label="Close chat" className="grid size-9 place-items-center rounded-full text-stbs-ink-on-dark/80 hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-stbs-bronze-light">
              <X size={20} strokeWidth={1.75} aria-hidden />
            </button>
          </header>

          <div ref={listRef} className="flex flex-1 flex-col gap-3 overflow-y-auto px-3 py-4" aria-live="polite">
            <Bubble role="assistant">{WELCOME}</Bubble>
            {!started && (
              <div className="flex flex-wrap gap-2 pl-1">
                {CHIPS.map((c) => (
                  <button key={c.label} type="button" onClick={() => chip(c)} className="rounded-full border border-stbs-hairline-strong bg-white px-3 py-1.5 text-[0.8125rem] text-stbs-ink transition-colors hover:border-stbs-brand-mid hover:text-stbs-brand-mid">
                    {c.label}
                  </button>
                ))}
              </div>
            )}
            {items.map((it, i) => {
              if (it.kind === "msg") return <Bubble key={i} role={it.role}>{it.role === "assistant" ? <BotText text={it.text} /> : it.text}</Bubble>;
              if (it.kind === "fallback") return <Handoff key={i} text={it.text} wa={waHref(waText)} number={number} />;
              if (it.kind === "done") return <Bubble key={i} role="assistant">{it.text}</Bubble>;
              return (
                <LeadForm
                  key={i}
                  initialService={guessService(history(items))}
                  details={leadDetails(history(items))}
                  onDone={(name, ph) => setItems((cur) => [...cur.filter((x) => x.kind !== "lead"), { kind: "done", text: `Thank you, ${name}. Your request has reached the STBS team, and they will call you on ${ph}.` }])}
                  waHref={waHref}
                />
              );
            })}
            {busy && (
              <div className="flex items-center gap-1 self-start rounded-2xl rounded-bl-md border border-stbs-hairline bg-white px-4 py-3" aria-label="Typing">
                {[0, 1, 2].map((d) => <span key={d} className="size-1.5 animate-bounce rounded-full bg-stbs-muted" style={{ animationDelay: `${d * 120}ms` }} />)}
              </div>
            )}
          </div>

          <form onSubmit={onSubmit} className="border-t border-stbs-hairline bg-white px-3 pb-[max(10px,env(safe-area-inset-bottom))] pt-2.5">
            <div className="flex items-end gap-2">
              <label htmlFor={`${panelId}-q`} className="sr-only">Your question</label>
              <textarea
                id={`${panelId}-q`}
                ref={inputRef}
                rows={1}
                value={draft}
                maxLength={MAX_MESSAGE_CHARS}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void ask(draft); } }}
                placeholder="Type your question…"
                className="max-h-28 min-h-[44px] flex-1 resize-none rounded-xl border border-stbs-hairline bg-[#FBF8F2] px-3 py-2.5 text-[0.9375rem] text-stbs-ink placeholder:text-stbs-muted focus:border-stbs-brand-mid focus:shadow-[0_0_0_3px_rgba(168,120,40,.18)] focus-visible:outline-none"
              />
              <button type="submit" disabled={busy || !draft.trim()} aria-label="Send" className="grid size-11 shrink-0 place-items-center rounded-full bg-stbs-accent text-white transition-opacity disabled:opacity-40">
                <SendHorizontal size={19} strokeWidth={1.9} aria-hidden />
              </button>
            </div>
            <div className="mt-2 flex items-center justify-between gap-2 text-[0.75rem] text-stbs-muted">
              <span>AI answers can be wrong; the team confirms every detail.</span>
              {number && (
                <span className="flex shrink-0 items-center gap-3">
                  <a href={waHref(waText)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-stbs-verified hover:underline"><MessageCircle size={13} aria-hidden />WhatsApp</a>
                  <a href={`tel:+91${number}`} className="inline-flex items-center gap-1 font-medium text-stbs-ink hover:underline"><Phone size={13} aria-hidden />Call</a>
                </span>
              )}
            </div>
          </form>
        </div>
      )}
    </aside>
  );
}

function Bubble({ role, children }: { role: "user" | "assistant"; children: ReactNode }) {
  return role === "user" ? (
    <p className="max-w-[85%] self-end whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-stbs-accent px-3.5 py-2.5 text-[0.9375rem] leading-relaxed text-white">{children}</p>
  ) : (
    <p className="max-w-[88%] self-start whitespace-pre-wrap break-words rounded-2xl rounded-bl-md border border-stbs-hairline bg-white px-3.5 py-2.5 text-[0.9375rem] leading-relaxed text-stbs-ink">{children}</p>
  );
}

function Handoff({ text, wa, number }: { text: string; wa: string; number: string }) {
  return (
    <div className="max-w-[88%] self-start rounded-2xl rounded-bl-md border border-stbs-hairline bg-white px-3.5 py-3 text-[0.9375rem] text-stbs-ink">
      <p>{text}</p>
      {number && (
        <div className="mt-2.5 flex flex-wrap gap-2">
          <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-stbs-verified px-4 text-[0.875rem] font-bold text-white"><MessageCircle size={16} aria-hidden />WhatsApp</a>
          <a href={`tel:+91${number}`} className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-stbs-hairline-strong px-4 text-[0.875rem] font-bold text-stbs-ink"><Phone size={16} aria-hidden />Call {number.slice(0, 5)} {number.slice(5)}</a>
        </div>
      )}
    </div>
  );
}

function LeadForm({ initialService, details, onDone, waHref }: {
  initialService: (typeof SERVICE_CHOICES)[number];
  details: string;
  onDone: (name: string, phone: string) => void;
  waHref: (text: string) => string;
}) {
  const id = useId();
  const [v, setV] = useState({ name: "", phone: "", service: initialService as string, location: "" });
  const [errors, setErrors] = useState<QuoteFieldErrors>({});
  const [state, setState] = useState<"idle" | "sending" | "failed">("idle");

  async function submit(e: FormEvent) {
    e.preventDefault();
    const payload = { ...v, organisation: "", email: "", details, website: "" };
    const parsed = quoteSchema.safeParse(payload);
    if (!parsed.success) { setErrors(fieldErrors(parsed.error.issues)); return; }
    setErrors({});
    setState("sending");
    try {
      const res = await fetch("/api/quote", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(parsed.data) });
      const data = (await res.json()) as { ok: boolean; fields?: QuoteFieldErrors };
      if (data.ok) { onDone(parsed.data.name.split(" ")[0], parsed.data.phone); return; }
      if (data.fields) { setErrors(data.fields); setState("idle"); return; }
      setState("failed");
    } catch {
      setState("failed");
    }
  }

  const field = "mt-1 w-full rounded-lg border border-stbs-hairline bg-[#FBF8F2] px-3 py-2 text-[0.9375rem] text-stbs-ink focus:border-stbs-brand-mid focus:shadow-[0_0_0_3px_rgba(168,120,40,.18)] focus-visible:outline-none";
  const err = (k: keyof QuoteFieldErrors) => errors[k] && <span className="mt-1 block text-[0.75rem] text-[#B42318]">{errors[k]}</span>;

  return (
    <form onSubmit={submit} noValidate className="w-full rounded-2xl border border-stbs-hairline bg-white p-3.5 text-[0.875rem] text-stbs-ink">
      <p className="font-bold">Get a site assessment</p>
      <p className="mt-0.5 text-[0.8125rem] text-stbs-muted">The team calls you back. Your questions from this chat are attached.</p>
      <div className="mt-3 grid gap-2.5">
        <label htmlFor={`${id}-n`}>Your name<input id={`${id}-n`} autoComplete="name" className={field} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />{err("name")}</label>
        <label htmlFor={`${id}-p`}>Phone number<input id={`${id}-p`} type="tel" inputMode="tel" autoComplete="tel" className={field} value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} />{err("phone")}</label>
        <label htmlFor={`${id}-s`}>Service
          <select id={`${id}-s`} className={field} value={v.service} onChange={(e) => setV({ ...v, service: e.target.value })}>
            {SERVICE_CHOICES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>{err("service")}
        </label>
        <label htmlFor={`${id}-l`}>Site location<input id={`${id}-l`} placeholder="Village / town, e.g. Kundli" className={field} value={v.location} onChange={(e) => setV({ ...v, location: e.target.value })} />{err("location")}</label>
      </div>
      <button type="submit" disabled={state === "sending"} className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-stbs-accent font-bold text-white disabled:opacity-60">
        {state === "sending" ? "Sending…" : "Request a call back"}
      </button>
      {state === "failed" && (
        <p className="mt-2 text-[0.8125rem] text-stbs-ink">
          That didn&apos;t go through. <a className="font-bold text-stbs-verified underline" target="_blank" rel="noopener noreferrer" href={waHref(`Hi, I'd like a site assessment.\nName: ${v.name}\nPhone: ${v.phone}\nService: ${v.service}\nSite: ${v.location}`)}>Send it on WhatsApp instead</a>.
        </p>
      )}
    </form>
  );
}
