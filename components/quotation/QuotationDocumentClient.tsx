"use client";
import { useEffect } from "react";
import { QuotationDocument } from "./QuotationDocument";
import type { QuotationState } from "./quotation-model";

/**
 * Safety net for the paginator: reports true if any price page's content spills past its A4 box or
 * runs into the footer. The paginator should make this impossible; this catches a wrong estimate.
 * (The prop keeps its historical name; it now covers every price page, not just page 4.)
 */
export function QuotationDocumentClient({ quotation, isEditorPreview = false, onPage4Overflow }: {
  quotation: QuotationState;
  isEditorPreview?: boolean;
  onPage4Overflow?: (isOverflow: boolean) => void;
}) {
  useEffect(() => {
    const check = () => {
      const pages = Array.from(document.querySelectorAll<HTMLElement>(".quotation-stage .q-page[data-price-page], .quotation-editor .q-page[data-price-page]"));
      const over = pages.some((page) => {
        if (page.scrollHeight > page.clientHeight + 1) return true;
        const footer = page.querySelector("footer")?.getBoundingClientRect();
        const last = (page.querySelector(".q-words") ?? page.querySelector("table"))?.getBoundingClientRect();
        return Boolean(footer && last && last.bottom > footer.top - 2);
      });
      onPage4Overflow?.(over);
    };
    check();
    const observer = new ResizeObserver(check);
    const target = document.querySelector<HTMLElement>(".quotation-stage, .quotation-editor");
    if (target) observer.observe(target);
    return () => observer.disconnect();
  }, [onPage4Overflow, quotation]);

  return <QuotationDocument quotation={quotation} isEditorPreview={isEditorPreview} />;
}
