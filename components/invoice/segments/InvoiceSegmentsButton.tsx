"use client";

/**
 * The Segments control on a saved invoice's page.
 *
 * The editor keeps its override in the invoice it is holding and saves it with everything else.
 * Here there is nothing being edited, so each change is written on its own and the page revalidated,
 * which is what makes this usable on an invoice already raised without reopening the editor.
 */
import { useState, useTransition } from "react";
import { SlidersHorizontal } from "lucide-react";
import { SegmentsPanel } from "./SegmentsPanel";
import type { InvoiceSettings, InvoiceSettingsOverride } from "../invoice-settings";
import "./segments.css";

export function InvoiceSegmentsButton({ base, initial, save }: {
  base: InvoiceSettings;
  initial: InvoiceSettingsOverride;
  save: (override: InvoiceSettingsOverride) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<InvoiceSettingsOverride>(initial);
  const [saving, startSaving] = useTransition();

  const change = (next: InvoiceSettingsOverride) => {
    // Shown straight away, written behind it: a switch that waited for a round trip would feel stuck.
    setValue(next);
    startSaving(async () => { await save(next); });
  };

  return (
    <>
      <button type="button" className="a-btn" onClick={() => setOpen(true)}>
        <SlidersHorizontal className="size-4" aria-hidden /> Segments
      </button>
      {open && (
        <>
          <button type="button" className="seg-scrim" aria-label="Close segments" onClick={() => setOpen(false)} />
          <SegmentsPanel
            base={base}
            value={value}
            busy={saving}
            onChange={change}
            onClose={() => setOpen(false)}
          />
        </>
      )}
    </>
  );
}
