"use client";
import { useId, useMemo, useState } from "react";
import { Link2Off } from "lucide-react";
import type { ClientDetails, QuotationState } from "../quotation-model";
import type { ReusableClient } from "@/lib/quotation-management";

type Field = keyof ClientDetails;

/** The "Prepared for" block. Typing a company name suggests saved clients; picking one fills the whole block. */
export function ClientBlock({ q, clients, onField, onPick, onUnlink, onSaveForFuture }: {
  q: QuotationState;
  clients: ReusableClient[];
  onField: (field: Field, value: string) => void;
  onPick: (client: ReusableClient) => void;
  onUnlink: () => void;
  onSaveForFuture: (on: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();
  const term = q.client.companyName.trim().toLowerCase();
  const matches = useMemo(() => {
    const pool = q.clientId ? [] : clients;
    const hit = term ? pool.filter((c) => c.companyName.toLowerCase().includes(term) || c.contactPerson.toLowerCase().includes(term)) : pool;
    return hit.slice(0, 6);
  }, [clients, term, q.clientId]);
  const showList = open && matches.length > 0;
  const linked = q.clientId ? clients.find((c) => c.id === q.clientId) : undefined;

  const pick = (c: ReusableClient) => { onPick(c); setOpen(false); };
  const input = (field: Field, label: string, extra?: { className?: string; placeholder?: string; type?: string }) => (
    <input
      aria-label={label}
      className={`qs-line ${extra?.className ?? ""}`}
      placeholder={extra?.placeholder ?? label}
      type={extra?.type}
      value={q.client[field]}
      onChange={(e) => onField(field, e.target.value)}
    />
  );

  return (
    <div className="qs-block qs-client" data-qs-target="client">
      <label className="qs-eyebrow" htmlFor="qs-company">Prepared for</label>
      <div className="qs-combo">
        <input
          id="qs-company"
          data-qs-target="client-company"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-invalid={!q.client.companyName.trim() || undefined}
          autoComplete="off"
          className="qs-line qs-strong"
          placeholder="Client company name"
          value={q.client.companyName}
          onFocus={() => { setOpen(true); setActive(0); }}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onChange={(e) => { onField("companyName", e.target.value); setOpen(true); setActive(0); }}
          onKeyDown={(e) => {
            if (!showList) return;
            if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => (a + 1) % matches.length); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => (a - 1 + matches.length) % matches.length); }
            else if (e.key === "Enter") { e.preventDefault(); pick(matches[active]); }
            else if (e.key === "Escape") { e.stopPropagation(); setOpen(false); }
          }}
        />
        {showList && (
          <ul id={listId} role="listbox" aria-label="Saved clients" className="qs-suggest">
            {matches.map((c, i) => (
              <li key={c.id} role="option" aria-selected={i === active} data-active={i === active || undefined} onMouseDown={(e) => { e.preventDefault(); pick(c); }} onMouseEnter={() => setActive(i)}>
                <b>{c.companyName}</b>
                <small>{[c.contactPerson, c.city].filter(Boolean).join(" · ") || "Saved client"}</small>
              </li>
            ))}
          </ul>
        )}
      </div>
      {linked && (
        <p className="qs-linked">
          Saved client
          <button type="button" onClick={onUnlink} title="Stop linking this quotation to the saved client"><Link2Off size={12} aria-hidden /> Unlink</button>
        </p>
      )}
      {input("contactPerson", "Contact person", { placeholder: "Contact person (optional)" })}
      {input("addressLine1", "Address line 1", { placeholder: "Address" })}
      {input("addressLine2", "Address line 2", { placeholder: "Address line 2 (optional)" })}
      <div className="qs-line-row qs-3">
        {input("city", "City")}
        {input("state", "State")}
        {input("pinCode", "PIN code", { placeholder: "PIN" })}
      </div>
      <div className="qs-line-row">
        {input("phone", "Phone", { type: "tel" })}
        {input("email", "Email", { type: "email" })}
      </div>
      {input("gstin", "GSTIN", { placeholder: "GSTIN (optional)" })}
      {!q.clientId && q.client.companyName.trim() && (
        <label className="qs-check">
          <input type="checkbox" checked={Boolean(q.saveClientForFuture)} onChange={(e) => onSaveForFuture(e.target.checked)} />
          Save this client for future quotations
        </label>
      )}
    </div>
  );
}
