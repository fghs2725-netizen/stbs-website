"use client";

import { NewQuotationFlow } from "@/components/quotation/presets/NewQuotationFlow";
import { initialQuotation, type QuotationState } from "@/components/quotation/quotation-model";
import { SEED_PRESETS } from "@/lib/quotation-presets";
import { BUILT_IN_UNITS } from "@/lib/units";

export function Harness() {
  // The shipped wording rather than the database's copy, so the test asserts against something
  // that cannot drift underneath it.
  const initial: QuotationState = { ...initialQuotation, quotationDate: "21/09/2026" };
  return (
    <main data-harness="quotation-preset">
      <NewQuotationFlow
        initial={initial}
        presets={SEED_PRESETS}
        clients={[]}
        templates={[]}
        units={BUILT_IN_UNITS as unknown as string[]}
      />
    </main>
  );
}
