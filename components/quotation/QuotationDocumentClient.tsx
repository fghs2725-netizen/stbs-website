"use client";
import { useEffect } from "react";
import { QuotationDocument } from "./QuotationDocument";
import type { QuotationState } from "./quotation-model";

export function QuotationDocumentClient({ quotation, isEditorPreview = false, onPage4Overflow }: {
  quotation: QuotationState;
  isEditorPreview?: boolean;
  onPage4Overflow?: (isOverflow: boolean) => void;
}) {
  useEffect(() => {
    const check = () => {
      const page = document.querySelector<HTMLElement>(".quotation-stage .q-page:nth-child(4), .quotation-editor .q-page:nth-child(4)");
      onPage4Overflow?.(Boolean(page && page.scrollHeight > page.clientHeight + 1));
    };
    check();
    const observer = new ResizeObserver(check);
    const target = document.querySelector<HTMLElement>(".quotation-stage, .quotation-editor");
    if (target) observer.observe(target);
    return () => observer.disconnect();
  }, [onPage4Overflow]);

  return <QuotationDocument quotation={quotation} isEditorPreview={isEditorPreview} />;
}
