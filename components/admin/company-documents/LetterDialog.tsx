"use client";
/**
 * Write a letter on the STBS letterhead. The server numbers it STBS/LTR/{FY}/NNN, makes the PDF and
 * saves it to the library under Letters, where it can be downloaded or shared like any document.
 */
import { useEffect, useRef, useState } from "react";
import { letterSchema } from "@/lib/letter";
import type { CompanyDocumentItem } from "@/lib/company-documents/shared";

const todayIso = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
const START = {
  date: "", to: "", attention: "", subject: "", salutation: "Dear Sir/Madam,", body: "",
  closing: "Yours faithfully,", signatory: "Rajesh Saini", designation: "Managing Director", withSignature: true,
};

export function LetterDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (document: CompanyDocumentItem) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [form, setForm] = useState({ ...START, date: todayIso() });
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { const dialog = ref.current; dialog?.showModal(); return () => dialog?.close(); }, []);
  const set = (key: keyof typeof START) => (event: { target: { value: string } }) => setForm((p) => ({ ...p, [key]: event.target.value }));

  return (
    <dialog ref={ref} className="cd-dialog" aria-labelledby="letter-title" onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}>
      <form onSubmit={async (event) => {
        event.preventDefault(); setError("");
        const parsed = letterSchema.safeParse(form);
        if (!parsed.success) { setError(parsed.error.issues[0]?.message || "Check the letter."); return; }
        setBusy(true);
        try {
          const response = await fetch("/api/company-documents/letter", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data) });
          const data = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(data.error || "Could not create the letter.");
          onCreated(data.document);
        } catch (err) { setError(err instanceof Error ? err.message : "Could not create the letter."); }
        finally { setBusy(false); }
      }}>
        <h2 id="letter-title" className="text-xl font-semibold">Write a letter</h2>
        <p className="a-sub mt-1 mb-4 text-sm">Printed on the STBS letterhead with the next letter number, and saved to your library under Letters.</p>
        <div className="grid gap-3">
          <label className="block text-sm font-medium">To (name and address)
            <textarea className="cd-input mt-1 w-full" rows={3} required value={form.to} onChange={set("to")} placeholder={"The Manager\nCompany name\nCity"} />
          </label>
          <label className="block text-sm font-medium">Subject
            <input className="cd-input mt-1 w-full" required value={form.subject} onChange={set("subject")} autoComplete="off" />
          </label>
          <label className="block text-sm font-medium">Letter
            <textarea className="cd-input mt-1 w-full" rows={9} required value={form.body} onChange={set("body")} placeholder="Leave an empty line between paragraphs." />
          </label>
          <label className="block text-sm font-medium">Date
            <input type="date" className="cd-input mt-1 w-full" required value={form.date} onChange={set("date")} />
          </label>
          <button type="button" className="self-start text-sm underline" onClick={() => setMore((m) => !m)} aria-expanded={more}>
            {more ? "Hide more options" : "More options (attention, greeting, signature)"}
          </button>
          {more && (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium sm:col-span-2">Kind attention (optional)<input className="cd-input mt-1 w-full" value={form.attention} onChange={set("attention")} /></label>
              <label className="block text-sm font-medium">Greeting<input className="cd-input mt-1 w-full" value={form.salutation} onChange={set("salutation")} /></label>
              <label className="block text-sm font-medium">Closing<input className="cd-input mt-1 w-full" value={form.closing} onChange={set("closing")} /></label>
              <label className="block text-sm font-medium">Signed by<input className="cd-input mt-1 w-full" value={form.signatory} onChange={set("signatory")} /></label>
              <label className="block text-sm font-medium">Designation<input className="cd-input mt-1 w-full" value={form.designation} onChange={set("designation")} /></label>
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <input type="checkbox" className="cd-checkbox" checked={form.withSignature} onChange={(e) => setForm((p) => ({ ...p, withSignature: e.target.checked }))} />
                Print the signature (untick to sign by hand)
              </label>
            </div>
          )}
        </div>
        {error && <p role="alert" className="cd-error mt-4">{error}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="a-btn a-btn-secondary" disabled={busy} onClick={onClose}>Cancel</button>
          <button type="submit" className="a-btn a-btn-primary" disabled={busy}>{busy ? "Creating…" : "Create letter"}</button>
        </div>
      </form>
    </dialog>
  );
}
