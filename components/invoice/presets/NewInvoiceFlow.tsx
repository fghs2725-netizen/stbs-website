"use client";

/**
 * What `/admin/invoices/new` shows: the quotation's preset wizard first (rainwater harvesting,
 * borewell), then the invoice editor carrying the lines it wrote. The presets are the same ones the
 * quotation uses, edited in one place, so an invoice starts from the owner's own wording.
 *
 * Nothing is saved until the owner saves, as on the quotation side.
 */
import { useState, type ComponentProps } from "react";
import { InvoiceEditor } from "../editor/InvoiceEditor";
import { PresetWizard } from "@/components/quotation/presets/PresetWizard";
import { buildPresetItems, type Preset } from "@/lib/quotation-presets";
import type { InvoiceState } from "../invoice-model";

type EditorProps = ComponentProps<typeof InvoiceEditor>;

export function NewInvoiceFlow({ presets, ...editor }: EditorProps & { presets: Preset[] }) {
  const [start, setStart] = useState<InvoiceState | null>(presets.length ? null : editor.initial);

  if (!start) {
    return (
      <PresetWizard
        document="invoice"
        presets={presets}
        onBlank={() => setStart(editor.initial)}
        onDone={(preset, answers) => setStart({
          ...editor.initial,
          subject: preset.subject?.replace(/^Quotation for/i, "Invoice for") || editor.initial.subject,
          // Quantities start empty, as on a quotation: the job's measurements are filled in next.
          items: buildPresetItems(preset, answers).map(({ id, description, unit, quantity, rate }) => ({ id, description, unit, quantity, rate })),
        })}
      />
    );
  }

  return <InvoiceEditor {...editor} initial={start} />;
}
