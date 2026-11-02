"use client";
/**
 * The delivery challan editor, kept short: who, where, which vehicle, and what is going. Everything
 * else (GSTIN, a separate site, driver, e-way bill, HSN, rates, remarks) sits under "More details".
 * Saves a draft; the number is taken from the challan's page when it is issued.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { CHALLAN_PURPOSES, emptyItem, newItemId, quantityByUnit, whatIsMissing, type ChallanItem, type ChallanParty, type ChallanState } from "@/lib/challan";
import { CHALLAN_PRESETS } from "@/lib/challan-presets";
import { ChallanDocument } from "./ChallanDocument";
import { saveChallanAction } from "@/app/admin/(dashboard)/delivery-challans/actions";

const UNITS = ["Nos", "No.", "Rft", "m", "CFt", "Kg", "Bag", "Trolley", "Set", "Ltr"];

function Field({ label, value, onChange, type = "text", placeholder, className }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; className?: string;
}) {
  return (
    <label className={className}>
      <span className="a-label">{label}</span>
      <input className="a-input mt-1" type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

export function ChallanEditor({ initial }: { initial: ChallanState }) {
  const router = useRouter();
  const [c, setC] = useState<ChallanState>(initial);
  const [more, setMore] = useState(false);
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const set = <K extends keyof ChallanState>(k: K, v: ChallanState[K]) => setC((prev) => ({ ...prev, [k]: v }));
  const setClient = (k: keyof ChallanParty) => (v: string) => set("client", { ...c.client, [k]: v });
  const setSite = (k: keyof ChallanParty) => (v: string) => set("deliverTo", { ...c.deliverTo, [k]: v });
  const setItem = (id: string, patch: Partial<ChallanItem>) => set("items", c.items.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  /** A preset's lines go in with no quantity, replacing the single empty row a new challan starts with. */
  const addPreset = (key: string) => {
    const preset = CHALLAN_PRESETS.find((p) => p.key === key);
    if (!preset) return;
    const lines = preset.items.map((i) => ({ ...emptyItem(), id: newItemId(), description: i.description, unit: i.unit, quantity: 0 }));
    const kept = c.items.filter((i) => i.description.trim());
    set("items", [...kept, ...lines]);
  };

  const missing = whatIsMissing(c);
  const save = () => start(async () => {
    setError("");
    try {
      const saved = await saveChallanAction(c);
      router.push(`/admin/delivery-challans/${saved.id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error && e.message === "ISSUED_READ_ONLY" ? "This challan has been issued and can no longer be edited." : "Could not save the challan. Please try again.");
    }
  });

  return (
    <div className="flex flex-col gap-4">
      <section className="a-card grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
        <Field label="Client name" value={c.client.name} onChange={setClient("name")} />
        <Field label="Phone" type="tel" value={c.client.phone} onChange={setClient("phone")} />
        <Field label="Address" value={c.client.addressLine1} onChange={setClient("addressLine1")} />
        <Field label="City" value={c.client.city} onChange={setClient("city")} />
        <Field label="Date" type="date" value={c.date} onChange={(v) => set("date", v)} />
        <Field label="Vehicle number" value={c.vehicleNumber} onChange={(v) => set("vehicleNumber", v.toUpperCase())} placeholder="HR06AB1234" />
      </section>

      <section className="a-card p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="a-label mr-1">Add preset</span>
          {CHALLAN_PRESETS.map((p) => (
            <button key={p.key} type="button" className="a-btn a-btn-secondary a-btn-sm" onClick={() => addPreset(p.key)}>
              <Plus className="size-4" />{p.name}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          {c.items.map((item, n) => (
            <div key={item.id} className="flex flex-col gap-2 rounded-lg border p-2 sm:flex-row sm:items-start" style={{ borderColor: "var(--a-hairline)" }}>
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <input className="a-input" aria-label={`Line ${n + 1} description`} placeholder="Material, with size (e.g. uPVC casing pipe 180 mm)" value={item.description} onChange={(e) => setItem(item.id, { description: e.target.value })} />
                {more && (
                  <div className="flex flex-wrap gap-2">
                    <input className="a-input w-28" placeholder="HSN" value={item.hsn} onChange={(e) => setItem(item.id, { hsn: e.target.value })} />
                    <input className="a-input min-w-[10rem] flex-1" placeholder="Details (optional)" value={item.details} onChange={(e) => setItem(item.id, { details: e.target.value })} />
                    {c.showRates && <input className="a-input a-num w-28" type="number" min={0} step="any" placeholder="Rate" value={item.rate || ""} onChange={(e) => setItem(item.id, { rate: Number(e.target.value) || 0 })} />}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <input
                  className="a-input a-num w-24" type="number" min={0} step="any" aria-label={`Line ${n + 1} quantity`} placeholder="Qty"
                  value={item.quantity || ""} onChange={(e) => setItem(item.id, { quantity: Number(e.target.value) || 0 })}
                  style={item.description.trim() && !(item.quantity > 0) ? { borderColor: "var(--a-warn)" } : undefined}
                />
                <input className="a-input w-20" list="challan-units" aria-label={`Line ${n + 1} unit`} value={item.unit} onChange={(e) => setItem(item.id, { unit: e.target.value })} />
                <button type="button" className="a-btn a-btn-quiet a-btn-sm" aria-label={`Remove line ${n + 1}`} disabled={c.items.length === 1} onClick={() => set("items", c.items.filter((i) => i.id !== item.id))}>
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          ))}
          <datalist id="challan-units">{UNITS.map((u) => <option key={u} value={u} />)}</datalist>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <button type="button" className="a-btn a-btn-secondary a-btn-sm" onClick={() => set("items", [...c.items, emptyItem()])}><Plus className="size-4" />Add line</button>
          <span className="a-num text-[0.875rem]" style={{ color: "var(--a-body)" }}>Total: {quantityByUnit(c) || "—"}</span>
        </div>
      </section>

      <button type="button" className="a-btn a-btn-quiet self-start" onClick={() => setMore((m) => !m)} aria-expanded={more}>
        {more ? "Hide more details" : "More details (site, driver, GSTIN, rates, remarks)"}
      </button>

      {more && (
        <section className="a-card grid gap-3 p-4 sm:grid-cols-3 sm:p-5">
          <label>
            <span className="a-label">Purpose</span>
            <select className="a-input mt-1" value={c.purpose} onChange={(e) => set("purpose", e.target.value)}>
              {CHALLAN_PURPOSES.map((p) => <option key={p}>{p}</option>)}
            </select>
          </label>
          <Field label="Against invoice" value={c.invoiceRef} onChange={(v) => set("invoiceRef", v)} />
          <Field label="Quotation" value={c.quotationRef} onChange={(v) => set("quotationRef", v)} />
          <Field label="Contact person" value={c.client.contactPerson} onChange={setClient("contactPerson")} />
          <Field label="Client GSTIN" value={c.client.gstin} onChange={(v) => setClient("gstin")(v.toUpperCase())} />
          <Field label="PIN code" value={c.client.pinCode} onChange={setClient("pinCode")} />
          <Field label="Driver name" value={c.driverName} onChange={(v) => set("driverName", v)} />
          <Field label="Driver phone" type="tel" value={c.driverPhone} onChange={(v) => set("driverPhone", v)} />
          <Field label="E-way bill" value={c.ewayBill} onChange={(v) => set("ewayBill", v)} />

          <label className="flex items-center gap-2 text-[0.9375rem] sm:col-span-3" style={{ color: "var(--a-body)" }}>
            <input type="checkbox" checked={!c.deliverToSame} onChange={(e) => set("deliverToSame", !e.target.checked)} />
            Goods go to a different site
          </label>
          {!c.deliverToSame && (
            <>
              <Field label="Site name" value={c.deliverTo.name} onChange={setSite("name")} />
              <Field label="Site address" value={c.deliverTo.addressLine1} onChange={setSite("addressLine1")} />
              <Field label="Site city" value={c.deliverTo.city} onChange={setSite("city")} />
              <Field label="Site contact phone" type="tel" value={c.deliverTo.phone} onChange={setSite("phone")} />
            </>
          )}

          <label className="flex items-center gap-2 text-[0.9375rem] sm:col-span-3" style={{ color: "var(--a-body)" }}>
            <input type="checkbox" checked={c.showRates} onChange={(e) => set("showRates", e.target.checked)} />
            Print rates and value
          </label>
          <label className="sm:col-span-3">
            <span className="a-label">Remarks (printed)</span>
            <textarea className="a-input mt-1" rows={2} value={c.remarks} onChange={(e) => set("remarks", e.target.value)} />
          </label>
        </section>
      )}

      {missing.length > 0 && (
        <p className="text-[0.875rem]" style={{ color: "var(--a-faint)" }}>To issue it, add {missing.join(", ")}. A draft can be saved as it is.</p>
      )}
      {error && <p role="alert" className="a-card p-3 text-[0.9375rem]" style={{ color: "var(--a-danger)" }}>{error}</p>}

      <div className="flex flex-wrap gap-2">
        <button type="button" className="a-btn a-btn-primary" disabled={pending} onClick={save}>{pending ? "Saving…" : "Save draft"}</button>
        <button type="button" className="a-btn a-btn-secondary" onClick={() => setPreview((p) => !p)}>
          {preview ? <EyeOff className="size-4" /> : <Eye className="size-4" />}{preview ? "Hide preview" : "Preview"}
        </button>
      </div>

      {preview && (
        <div className="a-card overflow-x-auto p-3" style={{ background: "#e9ecef" }}>
          <div style={{ zoom: 0.75 }}><ChallanDocument challan={c} /></div>
        </div>
      )}
    </div>
  );
}
