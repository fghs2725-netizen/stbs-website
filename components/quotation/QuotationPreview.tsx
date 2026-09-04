"use client";
import { QuotationDocumentClient as QuotationDocument } from "./QuotationDocumentClient";
import { type QuotationState } from "./quotation-model";

/* ==========================================================================
   QuotationPreview
   Wraps QuotationDocument with toolbar (print, page count).
   Used inside the editor's preview pane.

   `embedded` renders without the full dark stage so it can sit inside an
   existing admin card (e.g. the quotation detail page's document preview).
   ========================================================================== */
export function QuotationPreview({ quotation, onPage4Overflow, embedded }: {
  quotation: QuotationState;
  onPage4Overflow?: (isOverflow: boolean) => void;
  embedded?: boolean;
}) {
  if (embedded) {
    return (
      <div className="ed-embedded-preview">
        <QuotationDocument
          quotation={quotation}
          isEditorPreview={true}
          onPage4Overflow={onPage4Overflow}
        />
      </div>
    );
  }

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
