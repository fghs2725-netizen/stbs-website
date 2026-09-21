"use client";
/**
 * The harness itself. Rendered by the dev-only page, which keeps it out of production and supplies
 * the Suspense boundary that `useSearchParams` needs.
 */
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { InvoiceEditor } from "@/components/invoice/editor/InvoiceEditor";
import { buildDraft, type InvoiceState } from "@/components/invoice/invoice-model";
import { DEFAULT_INVOICE_SETTINGS } from "@/components/invoice/invoice-settings";
import { inferGstMode } from "@/lib/india-gst";

export function Harness() {
  const params = useSearchParams();
  const settings = {
    ...DEFAULT_INVOICE_SETTINGS,
    columns: { ...DEFAULT_INVOICE_SETTINGS.columns, hsn: params.get("hsn") !== "off" },
  };
  const [savedJson, setSavedJson] = useState("");

  const save = async (inv: InvoiceState) => {
    // Stands in for the server action: hands back what it was given, with an id as a real save would.
    const saved = { ...inv, id: inv.id ?? "harness-invoice" };
    setSavedJson(JSON.stringify({
      id: saved.id,
      client: saved.client.companyName,
      items: saved.items.map((i) => ({ description: i.description, quantity: i.quantity, rate: i.rate, hsn: i.hsn ?? null })),
      gstEnabled: saved.gstEnabled,
      gstMode: saved.gstMode,
    }));
    return saved;
  };

  const gstModeFor = async (state: string, gstin?: string) => inferGstMode("Haryana", state, gstin);

  return (
    <main className="a-page" data-harness="invoice-editor">
      <h1 className="a-h1">Invoice editor harness</h1>
      <InvoiceEditor
        initial={buildDraft(settings, "2026-09-21")}
        settings={settings}
        save={save}
        gstModeFor={gstModeFor}
        onSaved={() => { /* stay on the page so the test can read what was saved */ }}
      />
      <pre data-testid="saved-payload" className="a-card overflow-auto p-4 text-[0.75rem]">{savedJson}</pre>
    </main>
  );
}
