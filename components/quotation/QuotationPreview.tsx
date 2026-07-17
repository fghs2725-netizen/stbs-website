"use client";
import { QuotationDocument } from "./QuotationDocument";
import { type QuotationState } from "./quotation-model";

/* ==========================================================================
   QuotationPreview
   Wraps QuotationDocument with toolbar (print, page count).
   Used inside the editor's preview pane.
   ========================================================================== */
export function QuotationPreview({ quotation, onPage4Overflow }: {
  quotation: QuotationState;
  onPage4Overflow?: (isOverflow: boolean) => void;
}) {
  return (
    <div className="quotation-stage">
      <div className="q-tools">
        <span>Template preview · 4 fixed A4 pages</span>
        <button onClick={() => window.print()}>Print preview</button>
      </div>
      <QuotationDocument
        quotation={quotation}
        isEditorPreview={true}
        onPage4Overflow={onPage4Overflow}
      />
    </div>
  );
}
