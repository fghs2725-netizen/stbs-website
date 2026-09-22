"use client";

/**
 * What `/admin/quotations/new` shows: the preset wizard first, then the studio the owner already
 * knows, carrying whatever the wizard wrote.
 *
 * Nothing is saved until the owner saves, which is how the page behaved before this existed — a
 * wizard that created a draft per visit would leave a trail of abandoned quotations.
 */
import { useState } from "react";
import { QuotationStudio } from "../studio/QuotationStudio";
import { PresetWizard } from "./PresetWizard";
import { buildPresetItems, type Preset } from "@/lib/quotation-presets";
import type { QuotationState } from "../quotation-model";
import type { ReusableClient } from "@/lib/quotation-management";
import type { QuotationTemplateRef } from "../template/template-model";

export function NewQuotationFlow({ initial, presets, clients, templates, units, onCreateUnit }: {
  initial: QuotationState;
  presets: Preset[];
  clients: ReusableClient[];
  templates: QuotationTemplateRef[];
  units: string[];
  onCreateUnit?: (unit: string) => void | Promise<void>;
}) {
  const [start, setStart] = useState<QuotationState | null>(presets.length ? null : initial);

  if (!start) {
    return (
      <PresetWizard
        presets={presets}
        onBlank={() => setStart(initial)}
        onDone={(preset: Preset, answers) => setStart({
          ...initial,
          // The subject is the one thing the preset knows better than the empty default.
          subject: preset.subject || initial.subject,
          items: buildPresetItems(preset, answers),
        })}
      />
    );
  }

  return (
    <QuotationStudio
      initial={start}
      units={units}
      onCreateUnit={onCreateUnit}
      clients={clients}
      templates={templates}
      backHref="/admin/quotations"
      backLabel="Quotations"
    />
  );
}
