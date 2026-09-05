"use client";
import { QuotationDocumentClient as QuotationDocument } from "./QuotationDocumentClient";
import { type QuotationState } from "./quotation-model";
import { useQuotationPreviewFit, A4_HEIGHT_PX } from "./useQuotationPreviewFit";

/* ==========================================================================
   QuotationPreview
   Wraps QuotationDocument with toolbar (print, page count).
   Used inside the editor's preview pane.

   `embedded` renders without the full dark stage so it can sit inside an
   existing admin card (e.g. the quotation detail page's document preview).
   It reuses the same container-measured FIT scaling as the editor preview
   so the complete A4 page always fits the available width, centered.
   ========================================================================== */
const PREVIEW_PAGE_COUNT = 4;

export function QuotationPreview({ quotation, onPage4Overflow, embedded }: {
  quotation: QuotationState;
  onPage4Overflow?: (isOverflow: boolean) => void;
  embedded?: boolean;
}) {
  const { ref, scale } = useQuotationPreviewFit<HTMLDivElement>(0.25, 1);

  if (embedded) {
    const previewHeight = (A4_HEIGHT_PX * PREVIEW_PAGE_COUNT) * scale + 36;
    return (
      <div className="ed-embedded-preview">
        <div className="preview-viewport" ref={ref}>
          <div className="preview-scale-container" style={{ "--preview-scale": scale, "--preview-height": `${previewHeight}px` } as React.CSSProperties}>
            <div className="preview-scale-content">
              <QuotationDocument
                quotation={quotation}
                isEditorPreview={true}
                onPage4Overflow={onPage4Overflow}
              />
            </div>
          </div>
        </div>
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