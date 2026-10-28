"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { Toaster, useToasts } from "@/components/quotation/feedback";
import { FormError } from "@/components/admin/workers/WorkerForms";
import { DAY_LABEL, LIMITS, describeDay, type DayHours, type DayMode, type InfoInput } from "@/lib/google-business/model";
import { resolveGoogleUpdateAction, saveInfoAction } from "@/app/admin/(dashboard)/google-business/actions";

const MODES: Array<{ value: DayMode; label: string }> = [
  { value: "24h", label: "24 hours" },
  { value: "open", label: "Hours" },
  { value: "closed", label: "Closed" },
];

/** Name, description, phones, website and weekly hours. Only changed fields are sent to Google. */
export function InfoForm({ initial, websiteHours }: { initial: InfoInput; websiteHours: string }) {
  const router = useRouter();
  const { toasts, push, dismiss } = useToasts();
  const [form, setForm] = useState<InfoInput>(initial);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const set = (patch: Partial<InfoInput>) => setForm((f) => ({ ...f, ...patch }));
  const setDay = (i: number, patch: Partial<DayHours>) => setForm((f) => ({ ...f, week: f.week.map((d, j) => (j === i ? { ...d, ...patch } : d)) }));
  const nameChanged = form.title.trim() !== initial.title.trim();

  const save = () => start(async () => {
    setError("");
    const r = await saveInfoAction(form);
    if (!r.ok) return setError(r.error);
    push("success", r.message ?? "Saved.");
    router.refresh();
  });

  const copyToAll = (i: number) => setForm((f) => ({ ...f, week: f.week.map((d) => ({ ...d, mode: f.week[i].mode, ranges: f.week[i].ranges.map((r) => ({ ...r })) })) }));

  return (
    <>
      <section className="a-card space-y-4 p-4 sm:p-5" aria-labelledby="info-heading">
        <h2 id="info-heading" className="a-h2">Business details</h2>

        <label className="a-label block">Business name
          <input className="a-input mt-1" value={form.title} maxLength={LIMITS.title} onChange={(e) => set({ title: e.target.value })} />
        </label>
        {nameChanged && <p className="-mt-2 text-[0.8125rem]" style={{ color: "var(--a-warn)" }}>Use the business&apos;s real-world name only. Adding places or services to the name breaks Google&apos;s rules, and a name change can make Google ask you to verify again.</p>}

        <label className="a-label block">Description
          <textarea className="a-input mt-1 py-2" style={{ minHeight: 140 }} value={form.description} onChange={(e) => set({ description: e.target.value })} />
          <span className="mt-1 flex justify-between text-[0.75rem]" style={{ color: form.description.length > LIMITS.description ? "var(--a-danger)" : "var(--a-faint)" }}>
            <span>What you do, where, and since when. No links or phone numbers.</span>
            <span>{form.description.length} / {LIMITS.description}</span>
          </span>
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="a-label">Main phone
            <input className="a-input mt-1" inputMode="tel" value={form.primaryPhone} onChange={(e) => set({ primaryPhone: e.target.value })} placeholder="098120 03001" />
          </label>
          <label className="a-label">Website
            <input className="a-input mt-1" inputMode="url" value={form.websiteUri} onChange={(e) => set({ websiteUri: e.target.value })} placeholder="https://www.stbs.in/" />
          </label>
        </div>

        <div>
          <span className="a-label">Extra phone numbers (up to 2)</span>
          <div className="mt-1 space-y-2">
            {form.additionalPhones.map((p, i) => (
              <div key={i} className="flex gap-2">
                <input className="a-input" inputMode="tel" value={p} aria-label={`Extra phone ${i + 1}`} onChange={(e) => set({ additionalPhones: form.additionalPhones.map((x, j) => (j === i ? e.target.value : x)) })} />
                <button type="button" aria-label="Remove this number" className="a-btn a-btn-secondary a-btn-sm" onClick={() => set({ additionalPhones: form.additionalPhones.filter((_, j) => j !== i) })}><X className="size-4" aria-hidden /></button>
              </div>
            ))}
            {form.additionalPhones.length < 2 && (
              <button type="button" className="a-btn a-btn-quiet a-btn-sm" onClick={() => set({ additionalPhones: [...form.additionalPhones, ""] })}><Plus className="size-4" aria-hidden /> Add a number</button>
            )}
          </div>
        </div>
      </section>

      <section className="a-card p-4 sm:p-5" aria-labelledby="hours-heading">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h2 id="hours-heading" className="a-h2">Opening hours</h2>
          <button type="button" className="a-btn a-btn-quiet a-btn-sm" onClick={() => set({ week: form.week.map((d) => ({ ...d, mode: "24h", ranges: [] })) })}>Set 24 hours, every day</button>
        </div>
        <p className="a-sub mt-1">The website footer says “{websiteHours}”. Keep the two matching (the website&apos;s hours are changed in the site&apos;s code).</p>
        <ul className="a-divide mt-3">
          {form.week.map((d, i) => (
            <li key={d.day} className="py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="w-24 text-[0.9375rem] font-medium" style={{ color: "var(--a-ink)" }}>{DAY_LABEL[d.day]}</p>
                <div className="a-segment" role="radiogroup" aria-label={`${DAY_LABEL[d.day]} hours`}>
                  {MODES.map((m) => (
                    <button key={m.value} type="button" role="radio" aria-checked={d.mode === m.value} data-active={d.mode === m.value} style={{ padding: "0 12px" }}
                      onClick={() => setDay(i, { mode: m.value, ranges: m.value === "open" ? (d.ranges.length ? d.ranges : [{ open: "09:00", close: "18:00" }]) : [] })}>
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
              {d.mode === "open" && (
                <div className="mt-2 space-y-2">
                  {d.ranges.map((r, k) => (
                    <div key={k} className="flex items-center gap-2">
                      <input type="time" className="a-input" aria-label={`${DAY_LABEL[d.day]} opens`} value={r.open} onChange={(e) => setDay(i, { ranges: d.ranges.map((x, j) => (j === k ? { ...x, open: e.target.value } : x)) })} />
                      <span style={{ color: "var(--a-faint)" }}>to</span>
                      <input type="time" className="a-input" aria-label={`${DAY_LABEL[d.day]} closes`} value={r.close === "24:00" ? "00:00" : r.close} onChange={(e) => setDay(i, { ranges: d.ranges.map((x, j) => (j === k ? { ...x, close: e.target.value } : x)) })} />
                      {d.ranges.length > 1 && <button type="button" aria-label="Remove these hours" className="a-btn a-btn-secondary a-btn-sm" onClick={() => setDay(i, { ranges: d.ranges.filter((_, j) => j !== k) })}><X className="size-4" aria-hidden /></button>}
                    </div>
                  ))}
                  <div className="flex flex-wrap gap-2">
                    {d.ranges.length < 2 && <button type="button" className="a-btn a-btn-quiet a-btn-sm" onClick={() => setDay(i, { ranges: [...d.ranges, { open: "14:00", close: "18:00" }] })}><Plus className="size-4" aria-hidden /> Split hours</button>}
                  </div>
                </div>
              )}
              <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                <p className="text-[0.8125rem]" style={{ color: "var(--a-faint)" }}>{describeDay(d)}</p>
                <button type="button" className="text-[0.8125rem]" style={{ color: "var(--a-brand)" }} onClick={() => copyToAll(i)}>Copy to all days</button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <div className="space-y-3">
        <FormError message={error} />
        <button type="button" className="a-btn a-btn-primary min-h-[52px] w-full sm:w-auto" onClick={save} disabled={pending}>{pending ? "Saving to Google…" : "Save changes to Google"}</button>
      </div>
      <Toaster toasts={toasts} onDismiss={dismiss} />
    </>
  );
}

/** Google edited some of the listing (from user suggestions or its own data). The owner accepts it or puts their version back. */
export function GoogleUpdateReview({ fields, other }: { fields: Array<{ path: string; label: string; google: string; yours: string }>; other: string[] }) {
  const router = useRouter();
  const { toasts, push, dismiss } = useToasts();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const resolve = (choice: "accept" | "keep") => start(async () => {
    setError("");
    const r = await resolveGoogleUpdateAction(choice);
    if (!r.ok) return setError(r.error);
    push("success", r.message ?? "Done.");
    router.refresh();
  });

  return (
    <section className="a-card p-4 sm:p-5" style={{ boxShadow: "inset 0 0 0 1px var(--a-warn-soft), var(--a-shadow)" }} aria-labelledby="google-update-heading">
      <h2 id="google-update-heading" className="a-h2">Google changed your listing</h2>
      <p className="a-sub mt-1">Google sometimes updates details from customer suggestions. Check what it shows now.</p>
      {fields.length > 0 && (
        <ul className="a-divide mt-3">
          {fields.map((f) => (
            <li key={f.path} className="py-3 text-[0.875rem]">
              <p className="a-label">{f.label}</p>
              <p className="mt-1" style={{ color: "var(--a-body)" }}><strong>Google shows:</strong> {f.google || "(empty)"}</p>
              <p style={{ color: "var(--a-muted)" }}><strong>You entered:</strong> {f.yours || "(empty)"}</p>
            </li>
          ))}
        </ul>
      )}
      {other.length > 0 && <p className="mt-2 text-[0.8125rem]" style={{ color: "var(--a-faint)" }}>Also changed (review on Google itself): {other.join(", ")}</p>}
      <FormError message={error} />
      {fields.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className="a-btn a-btn-primary a-btn-sm" disabled={pending} onClick={() => resolve("keep")}>Keep mine</button>
          <button type="button" className="a-btn a-btn-secondary a-btn-sm" disabled={pending} onClick={() => resolve("accept")}>Accept Google&apos;s</button>
        </div>
      )}
      <Toaster toasts={toasts} onDismiss={dismiss} />
    </section>
  );
}
