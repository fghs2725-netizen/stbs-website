"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { QuotationDocumentClient as QuotationDocument } from "@/components/quotation/QuotationDocumentClient";
import { A4_HEIGHT_PX, useQuotationPreviewFit } from "@/components/quotation/useQuotationPreviewFit";
import type { TemplateContent } from "@/components/quotation/template/template-model";
import { sampleQuotation } from "./sample";
import "./template-preview.css";

export const PREVIEW_PAGES = [
  { n: 1, label: "Cover letter" },
  { n: 2, label: "Profile" },
  { n: 3, label: "Terms" },
  { n: 4, label: "Price" },
] as const;

const FIXED_PAGE_COUNT = 3;
const MEASURE_DEBOUNCE_MS = 250;

/**
 * Measures the wording against the real pages. Pages 1-3 have a fixed size, so wording that outgrows one
 * would run into the footer or off the sheet; the pages that do are reported so saving can be refused
 * before it reaches a printed quotation.
 *
 * It lives apart from the visible preview on purpose: on a phone the preview is hidden while you edit,
 * and a hidden (display:none) page has no layout to measure. This copy is always laid out, off-screen.
 * It measures with GST off, the case where every term prints, which is the fullest page 3 can be.
 */
export function TemplateMeasure({ content, layout, onOverflow }: { content: TemplateContent; layout: string; onOverflow: (pages: number[]) => void }) {
  const measureRef = useRef<HTMLDivElement>(null);
  const report = useRef(onOverflow);
  report.current = onOverflow;
  const quotation = useMemo(() => sampleQuotation(content, layout, false), [content, layout]);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      // Measuring before the brand fonts load would use fallback metrics and misjudge every page.
      await document.fonts?.ready;
      if (cancelled || !measureRef.current) return;
      const pages = Array.from(measureRef.current.querySelectorAll<HTMLElement>(".q-page")).slice(0, FIXED_PAGE_COUNT);
      const over = pages.flatMap((el, i) => {
        const main = el.querySelector<HTMLElement>(".q-main");
        return main && main.scrollHeight > main.clientHeight + 1 ? [i + 1] : [];
      });
      report.current(over);
    }, MEASURE_DEBOUNCE_MS);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [quotation]);

  return (
    <div className="tpl-measure" ref={measureRef} aria-hidden="true">
      <div className="preview-scale-content" style={{ "--preview-scale": 1 } as React.CSSProperties}>
        <QuotationDocument quotation={quotation} />
      </div>
    </div>
  );
}

/** Shows one A4 page of a sample quotation, in the wording being edited, so a template is judged on the real document. */
export function TemplatePreview({ content, layout, page, onPage, overflowPages }: {
  content: TemplateContent;
  layout: string;
  page: number;
  onPage: (n: number) => void;
  overflowPages: number[];
}) {
  const [withGst, setWithGst] = useState(false);
  const { ref, scale } = useQuotationPreviewFit<HTMLDivElement>(0.3, 1);
  const quotation = useMemo(() => sampleQuotation(content, layout, withGst), [content, layout, withGst]);

  return (
    <div className="tpl-preview">
      <div className="tpl-preview-bar">
        <div className="a-segment" role="tablist" aria-label="Page to preview">
          {PREVIEW_PAGES.map((p) => (
            <button key={p.n} type="button" role="tab" aria-selected={page === p.n} data-active={page === p.n} onClick={() => onPage(p.n)} className="tpl-tab">
              {p.label}
              {overflowPages.includes(p.n) && <i className="tpl-dot" aria-label="Too full" />}
            </button>
          ))}
        </div>
        <label className="tpl-gst">
          <input type="checkbox" checked={withGst} onChange={(e) => setWithGst(e.target.checked)} />
          Sample with GST
        </label>
      </div>

      <div className="tpl-stage" data-page={page} ref={ref}>
        <div className="preview-viewport">
          <div className="preview-scale-container" style={{ "--preview-scale": scale, "--preview-height": `${A4_HEIGHT_PX * scale}px` } as React.CSSProperties}>
            <div className="preview-scale-content">
              <QuotationDocument quotation={quotation} isEditorPreview />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
