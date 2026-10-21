"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setInvoiceClientAreaAction } from "@/app/admin/(dashboard)/areas/actions";
import type { InvoiceClientRow } from "@/lib/website/area-clients";

/** One invoiced client: off, or shown on a town page under a chosen name and locality. */
export function AreaClientRow({ row, areas }: { row: InvoiceClientRow; areas: Array<{ slug: string; name: string }> }) {
  const router = useRouter();
  const [area, setArea] = useState(row.shown?.area ?? "");
  const [name, setName] = useState(row.shown?.name ?? row.invoiceName);
  const [locality, setLocality] = useState(row.shown?.locality ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dirty = area !== (row.shown?.area ?? "") || (area !== "" && (name !== row.shown?.name || locality !== row.shown?.locality));

  async function save() {
    setBusy(true);
    setError("");
    const r = await setInvoiceClientAreaAction({ key: row.key, area, name, locality });
    setBusy(false);
    if (!r.ok) return setError(r.error);
    router.refresh();
  }

  return (
    <li className="flex flex-col gap-3 p-4 sm:px-5">
      <div className="min-w-0">
        <h2 className="truncate text-[0.9375rem] font-semibold" style={{ color: "var(--a-ink)" }}>{row.invoiceName}</h2>
        <p className="mt-[3px] text-[0.8125rem]" style={{ color: "var(--a-faint)" }}>
          {[row.city, `${row.invoices} invoice${row.invoices === 1 ? "" : "s"}`, row.lastDate && `last ${row.lastDate}`].filter(Boolean).join(" · ")}
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-[12rem_minmax(0,1fr)_12rem_auto] sm:items-end">
        <label className="block text-[0.8125rem]">
          <span className="a-sub">Show on</span>
          <select className="a-input mt-1" value={area} onChange={(e) => setArea(e.target.value)} disabled={busy}>
            <option value="">Hidden</option>
            {areas.map((a) => <option key={a.slug} value={a.slug}>{a.name} page</option>)}
          </select>
        </label>
        {area && (
          <>
            <label className="block text-[0.8125rem]">
              <span className="a-sub">Name on the website</span>
              <input className="a-input mt-1" value={name} onChange={(e) => setName(e.target.value)} disabled={busy} maxLength={120} />
            </label>
            <label className="block text-[0.8125rem]">
              <span className="a-sub">Locality (optional)</span>
              <input className="a-input mt-1" value={locality} onChange={(e) => setLocality(e.target.value)} disabled={busy} maxLength={80} placeholder="e.g. HSIIDC Barhi" />
            </label>
          </>
        )}
        {dirty && <button type="button" className="a-btn a-btn-primary a-btn-sm" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</button>}
      </div>
      {error && <p role="alert" className="text-[0.8125rem]" style={{ color: "var(--a-danger)" }}>{error}</p>}
    </li>
  );
}
