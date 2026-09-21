"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ChevronLeft, Plus, Trash2 } from "lucide-react";
import { ConfirmDialog, Toaster, useToasts } from "@/components/quotation/feedback";
import { LIMITS, TEMPLATE_LAYOUTS, validateContent, type TemplateContent, type TemplateTerm } from "@/components/quotation/template/template-model";
import type { TemplateRow } from "@/lib/quotation-templates";
import {
  archiveTemplateAction,
  duplicateTemplateAction,
  restoreTemplateAction,
  saveTemplateAction,
  setDefaultTemplateAction,
} from "@/app/admin/(dashboard)/templates/actions";
import { TemplateMeasure, TemplatePreview, PREVIEW_PAGES } from "./TemplatePreview";

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

/* ---------- small controls ---------- */

function Counter({ value, max }: { value: string; max: number }) {
  if (value.length < max * 0.8) return null;
  const over = value.length > max;
  return <span className="a-num text-[0.75rem]" style={{ color: over ? "var(--a-danger)" : "var(--a-faint)" }}>{value.length}/{max}</span>;
}

function Field({ label, value, max, onChange, rows, hint, id }: { label: string; value: string; max: number; onChange: (v: string) => void; rows?: number; hint?: string; id: string }) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="a-label">{label}</label>
        <Counter value={value} max={max} />
      </div>
      {rows ? (
        <textarea id={id} className="a-input" rows={rows} value={value} onChange={(e) => onChange(e.target.value)} style={{ resize: "vertical", lineHeight: 1.5 }} />
      ) : (
        <input id={id} className="a-input" value={value} onChange={(e) => onChange(e.target.value)} />
      )}
      {hint && <p className="mt-1 text-[0.75rem]" style={{ color: "var(--a-faint)" }}>{hint}</p>}
    </div>
  );
}

/**
 * One entry per line. It keeps the raw text while you type, so a blank line you are about to fill in
 * is not swallowed, and hands the cleaned list up.
 */
function LinesField({ label, items, maxItems, maxLen, onChange, rows = 5, hint, id }: { label: string; items: string[]; maxItems: number; maxLen: number; onChange: (v: string[]) => void; rows?: number; hint?: string; id: string }) {
  const [text, setText] = useState(items.join("\n"));
  const longest = items.reduce((m, i) => Math.max(m, i.length), 0);
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="a-label">{label}</label>
        <span className="a-num text-[0.75rem]" style={{ color: items.length > maxItems || longest > maxLen ? "var(--a-danger)" : "var(--a-faint)" }}>{items.length}/{maxItems}</span>
      </div>
      <textarea
        id={id}
        className="a-input"
        rows={rows}
        value={text}
        onChange={(e) => { setText(e.target.value); onChange(e.target.value.split("\n").map((l) => l.trim()).filter(Boolean)); }}
        style={{ resize: "vertical", lineHeight: 1.5 }}
      />
      <p className="mt-1 text-[0.75rem]" style={{ color: "var(--a-faint)" }}>{hint ?? "One per line."}</p>
    </div>
  );
}

function Group({ title, page, children, onFocus }: { title: string; page: number; children: React.ReactNode; onFocus: (p: number) => void }) {
  return (
    <section className="a-card p-4 sm:p-5" onFocusCapture={() => onFocus(page)}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="a-h2">{title}</h2>
        <span className="a-pill a-pill-neutral">Page {page}</span>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

/* ---------- the editor ---------- */

export function TemplateEditor({ template }: { template: TemplateRow }) {
  const router = useRouter();
  const { toasts, push, dismiss } = useToasts();

  const [name, setName] = useState(template.name);
  const [content, setContent] = useState<TemplateContent>(() => clone(template.content));
  const [saved, setSaved] = useState(() => JSON.stringify({ name: template.name, content: template.content }));
  const [page, setPage] = useState(1);
  const [view, setView] = useState<"edit" | "preview">("edit");
  const [overflowPages, setOverflowPages] = useState<number[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState<"save" | "default" | "duplicate" | "archive" | null>(null);
  const [confirmArchive, setConfirmArchive] = useState(false);

  const dirty = JSON.stringify({ name, content }) !== saved;
  const check = useMemo(() => validateContent(content), [content]);
  const nameBad = !name.trim() || name.trim().length > LIMITS.name;
  const problems = [
    ...(nameBad ? ["Give the template a name."] : []),
    ...(check.ok ? [] : check.errors),
    ...overflowPages.map((p) => `Page ${p} (${PREVIEW_PAGES[p - 1].label}) is too full for one A4 sheet. Shorten the wording on that page.`),
  ];
  const canSave = dirty && problems.length === 0 && busy === null;

  useEffect(() => {
    if (!dirty) return;
    const fn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", fn);
    return () => window.removeEventListener("beforeunload", fn);
  }, [dirty]);

  const set = useCallback((fn: (c: TemplateContent) => void) => setContent((c) => { const next = clone(c); fn(next); return next; }), []);

  const save = async () => {
    if (!canSave) return;
    setBusy("save"); setErrors([]);
    try {
      const r = await saveTemplateAction(template.id, { name, content });
      if (!r.ok) { setErrors(r.errors); return; }
      // What the server stored is trimmed and cleaned; show exactly that.
      setName(r.data.name); setContent(clone(r.data.content));
      setSaved(JSON.stringify({ name: r.data.name, content: r.data.content }));
      push("success", "Template saved. New quotations and drafts will use it.");
      router.refresh();
    } catch {
      push("error", "Could not save. Your changes are still here; try again.");
    } finally { setBusy(null); }
  };

  const run = async (kind: "default" | "duplicate" | "archive", fn: () => Promise<{ ok: true } | { ok: false; errors: string[] }>, done: string) => {
    setBusy(kind);
    try {
      const r = await fn();
      if (!r.ok) { push("error", r.errors[0]); return false; }
      push("success", done);
      router.refresh();
      return true;
    } catch { push("error", "That did not work. Nothing was changed."); return false; }
    finally { setBusy(null); }
  };

  const duplicate = async () => {
    setBusy("duplicate");
    try {
      const r = await duplicateTemplateAction(template.id);
      if (!r.ok) { push("error", r.errors[0]); return; }
      router.push(`/admin/templates/${r.data.id}`);
    } catch { push("error", "Could not duplicate the template."); }
    finally { setBusy(null); }
  };

  const leave = (e: React.MouseEvent) => { if (dirty && !window.confirm("You have unsaved changes. Leave without saving?")) e.preventDefault(); };
  const L = content.letter;
  const move = (i: number, d: -1 | 1) => set((c) => { const j = i + d; if (j < 0 || j >= c.terms.length) return; [c.terms[i], c.terms[j]] = [c.terms[j], c.terms[i]]; });
  const layoutLabel = TEMPLATE_LAYOUTS.find((l) => l.key === template.layout)?.label ?? template.layout;

  return (
    <div className="a-page">
      <div>
        <Link href="/admin/templates" onClick={leave} className="a-link inline-flex min-h-[36px] items-center gap-1 text-[0.875rem]"><ChevronLeft size={16} aria-hidden /> Templates</Link>
      </div>

      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-[6px] flex flex-wrap items-center gap-2">
            <p className="a-eyebrow">Quotation template · {layoutLabel} design</p>
            {template.isDefault && <span className="a-pill a-pill-brand">Default</span>}
            {template.archived && <span className="a-pill a-pill-neutral">Archived</span>}
          </div>
          <label htmlFor="tpl-name" className="sr-only">Template name</label>
          <input id="tpl-name" className="a-input" style={{ fontSize: "1.375rem", fontWeight: 600, letterSpacing: "-0.02em", maxWidth: 480 }} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!template.isDefault && !template.archived && (
            <button type="button" className="a-btn a-btn-secondary" disabled={busy !== null || dirty} title={dirty ? "Save your changes first" : undefined}
              onClick={() => void run("default", () => setDefaultTemplateAction(template.id), "This is now the default for new quotations.")}>Make default</button>
          )}
          <button type="button" className="a-btn a-btn-secondary" disabled={busy !== null || dirty} title={dirty ? "Save your changes first" : undefined} onClick={() => void duplicate()}>Duplicate</button>
          {template.archived ? (
            <button type="button" className="a-btn a-btn-secondary" disabled={busy !== null} onClick={() => void run("archive", () => restoreTemplateAction(template.id), "Template restored.")}>Restore</button>
          ) : !template.isDefault && (
            <button type="button" className="a-btn a-btn-danger" disabled={busy !== null} onClick={() => setConfirmArchive(true)}>Archive</button>
          )}
          <button type="button" className="a-btn a-btn-primary" disabled={!canSave} onClick={() => void save()}>{busy === "save" ? "Saving…" : "Save"}</button>
        </div>
      </header>

      {(dirty && problems.length > 0) || errors.length > 0 ? (
        <div role="alert" className="a-card p-4 text-[0.875rem]" style={{ background: "var(--a-danger-soft)", color: "var(--a-danger)" }}>
          <p className="font-semibold">{errors.length ? "That could not be saved" : "Fix this before saving"}</p>
          <ul className="mt-1 list-disc space-y-[2px] pl-5">{(errors.length ? errors : problems).slice(0, 6).map((p) => <li key={p}>{p}</li>)}</ul>
        </div>
      ) : template.quotationCount > 0 && (
        <p className="a-sub">Used by {template.quotationCount} {template.quotationCount === 1 ? "quotation" : "quotations"}. Finalised ones keep the wording they were sent with, whatever you change here.</p>
      )}

      {/* Phones show one column at a time; desktop shows the form beside a sticky preview. */}
      {/* The wrapper hides it on desktop: .a-segment sets its own display, which would beat a utility on the element. */}
      <div className="lg:hidden">
        <div className="a-segment" role="tablist" aria-label="Edit or preview">
          <button type="button" role="tab" aria-selected={view === "edit"} data-active={view === "edit"} onClick={() => setView("edit")}>Edit</button>
          <button type="button" role="tab" aria-selected={view === "preview"} data-active={view === "preview"} onClick={() => setView("preview")}>Preview</button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,540px)]">
        <div className={`space-y-4 ${view === "edit" ? "" : "hidden lg:block lg:space-y-4"}`}>
          <Group title="Cover letter" page={1} onFocus={setPage}>
            <Field id="t-greeting" label="Greeting" value={L.greeting} max={LIMITS.short} onChange={(v) => set((c) => { c.letter.greeting = v; })} />
            <Field id="t-opening" label="Opening paragraph" value={L.opening} max={LIMITS.paragraph} rows={4} onChange={(v) => set((c) => { c.letter.opening = v; })} />
            <Field id="t-annintro" label="Line before the annexure list" value={L.annexuresIntro} max={LIMITS.line} onChange={(v) => set((c) => { c.letter.annexuresIntro = v; })} hint="Optional." />
            <LinesField id="t-annexures" label="Annexure list" items={L.annexures} maxItems={LIMITS.annexures} maxLen={LIMITS.line} rows={4} onChange={(v) => set((c) => { c.letter.annexures = v; })} />
            <Field id="t-closing" label="Closing paragraph" value={L.closing} max={LIMITS.paragraph} rows={3} onChange={(v) => set((c) => { c.letter.closing = v; })} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="t-signoff" label="Sign-off" value={L.signOff} max={LIMITS.short} onChange={(v) => set((c) => { c.letter.signOff = v; })} />
              <Field id="t-sigco" label="Signing company" value={L.signatoryCompany} max={LIMITS.short} onChange={(v) => set((c) => { c.letter.signatoryCompany = v; })} />
              <Field id="t-signame" label="Signatory name" value={L.signatoryName} max={LIMITS.short} onChange={(v) => set((c) => { c.letter.signatoryName = v; })} />
              <Field id="t-sigtitle" label="Signatory title" value={L.signatoryTitle} max={LIMITS.short} onChange={(v) => set((c) => { c.letter.signatoryTitle = v; })} />
            </div>
          </Group>

          <Group title="Prepared by" page={1} onFocus={setPage}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="t-pbco" label="Company name" value={content.preparedBy.company} max={LIMITS.short} onChange={(v) => set((c) => { c.preparedBy.company = v; })} />
              <Field id="t-pbcontact" label="Contact person line" value={content.preparedBy.contact} max={LIMITS.short} onChange={(v) => set((c) => { c.preparedBy.contact = v; })} />
              <Field id="t-pbphones" label="Phone numbers" value={content.preparedBy.phones} max={LIMITS.short} onChange={(v) => set((c) => { c.preparedBy.phones = v; })} />
              <Field id="t-pbemail" label="Email" value={content.preparedBy.email} max={LIMITS.short} onChange={(v) => set((c) => { c.preparedBy.email = v; })} />
            </div>
          </Group>

          <Group title="Company profile" page={2} onFocus={setPage}>
            <Field id="t-about" label="About us" value={content.profile.about} max={LIMITS.profileParagraph} rows={5} onChange={(v) => set((c) => { c.profile.about = v; })} />
            <Field id="t-mission" label="Mission" value={content.profile.mission} max={LIMITS.profileParagraph} rows={4} onChange={(v) => set((c) => { c.profile.mission = v; })} />
            <Field id="t-vision" label="Vision" value={content.profile.vision} max={LIMITS.profileParagraph} rows={2} onChange={(v) => set((c) => { c.profile.vision = v; })} />
            <LinesField id="t-caps" label="Core capabilities" items={content.profile.capabilities} maxItems={LIMITS.capabilities} maxLen={LIMITS.capability} onChange={(v) => set((c) => { c.profile.capabilities = v; })} />
            <LinesField id="t-clients" label="Esteemed clients" items={content.profile.clients} maxItems={LIMITS.clients} maxLen={LIMITS.client} rows={10} hint="One per line. Clients that have a logo on file show as logos." onChange={(v) => set((c) => { c.profile.clients = v; })} />
          </Group>

          <Group title="Terms & conditions" page={3} onFocus={setPage}>
            <ol className="space-y-3">
              {content.terms.map((t: TemplateTerm, i: number) => (
                <li key={i} className="rounded-[12px] p-3" style={{ background: "var(--a-surface-2)", border: "1px solid var(--a-hairline)" }}>
                  <div className="flex items-center gap-2">
                    <span className="a-num w-6 shrink-0 text-[0.8125rem] font-semibold" style={{ color: "var(--a-faint)" }}>{String(i + 1).padStart(2, "0")}</span>
                    <label className="sr-only" htmlFor={`term-title-${i}`}>Term {i + 1} title</label>
                    <input id={`term-title-${i}`} className="a-input" placeholder="Title" value={t.title} onChange={(e) => set((c) => { c.terms[i].title = e.target.value; })} />
                    <button type="button" className="a-btn a-btn-quiet size-11 !px-0" aria-label={`Move term ${i + 1} up`} disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp size={16} aria-hidden /></button>
                    <button type="button" className="a-btn a-btn-quiet size-11 !px-0" aria-label={`Move term ${i + 1} down`} disabled={i === content.terms.length - 1} onClick={() => move(i, 1)}><ArrowDown size={16} aria-hidden /></button>
                    <button type="button" className="a-btn a-btn-quiet size-11 !px-0" aria-label={`Remove term ${i + 1}`} onClick={() => set((c) => { c.terms.splice(i, 1); })} style={{ color: "var(--a-danger)" }}><Trash2 size={16} aria-hidden /></button>
                  </div>
                  <label className="sr-only" htmlFor={`term-text-${i}`}>Term {i + 1} wording</label>
                  <textarea id={`term-text-${i}`} className="a-input mt-2" rows={2} placeholder="Wording" value={t.text} onChange={(e) => set((c) => { c.terms[i].text = e.target.value; })} style={{ resize: "vertical", lineHeight: 1.5 }} />
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <label className="inline-flex min-h-[36px] cursor-pointer items-center gap-2 text-[0.8125rem]" style={{ color: "var(--a-muted)" }}>
                      <input type="checkbox" className="size-4" style={{ accentColor: "var(--a-brand)" }} checked={t.hideWhenGst === true} onChange={(e) => set((c) => { if (e.target.checked) c.terms[i].hideWhenGst = true; else delete c.terms[i].hideWhenGst; })} />
                      Hide when GST is shown in the totals
                    </label>
                    <Counter value={t.text} max={LIMITS.termText} />
                  </div>
                </li>
              ))}
            </ol>
            <button type="button" className="a-btn a-btn-secondary a-btn-sm" disabled={content.terms.length >= LIMITS.terms} onClick={() => set((c) => { c.terms.push({ title: "", text: "" }); })}><Plus size={15} aria-hidden /> Add a term</button>
          </Group>

          <Group title="At a glance" page={3} onFocus={setPage}>
            <p className="a-sub -mt-2">The four figures in the panel under the terms.</p>
            <div className="space-y-2">
              {content.glance.map((g, i) => (
                <div key={i} className="grid grid-cols-[96px_minmax(0,1fr)] gap-2">
                  <label className="sr-only" htmlFor={`glance-v-${i}`}>Figure {i + 1} value</label>
                  <input id={`glance-v-${i}`} className="a-input" placeholder="34+" value={g.value} onChange={(e) => set((c) => { c.glance[i].value = e.target.value; })} />
                  <label className="sr-only" htmlFor={`glance-l-${i}`}>Figure {i + 1} label</label>
                  <input id={`glance-l-${i}`} className="a-input" placeholder="Years Experience" value={g.label} onChange={(e) => set((c) => { c.glance[i].label = e.target.value; })} />
                </div>
              ))}
            </div>
          </Group>

          <Group title="New quotations" page={1} onFocus={setPage}>
            <Field id="t-validity" label="Validity wording" value={content.validity} max={LIMITS.line} onChange={(v) => set((c) => { c.validity = v; })} hint="Filled in on new quotations made from this template. It can still be changed on each one." />
          </Group>
        </div>

        <div className={`${view === "preview" ? "" : "hidden lg:block"} lg:sticky lg:top-[72px] lg:self-start`}>
          <TemplatePreview content={content} layout={template.layout} page={page} onPage={setPage} overflowPages={overflowPages} />
          <p className="mt-2 text-[0.75rem]" style={{ color: "var(--a-faint)" }}>A made-up quotation, shown in this wording. Nothing here is saved to a real quotation.</p>
        </div>
      </div>

      <TemplateMeasure content={content} layout={template.layout} onOverflow={setOverflowPages} />

      {confirmArchive && (
        <ConfirmDialog
          title={`Archive “${template.name}”?`}
          body="It disappears from the template picker. Quotations already using it keep printing exactly as they do now, and you can restore it any time."
          confirmLabel="Archive"
          destructive
          busy={busy === "archive"}
          onConfirm={() => { void run("archive", () => archiveTemplateAction(template.id), "Template archived.").then((ok) => { setConfirmArchive(false); if (ok) router.push("/admin/templates"); }); }}
          onCancel={() => setConfirmArchive(false)}
        />
      )}
      <Toaster toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
