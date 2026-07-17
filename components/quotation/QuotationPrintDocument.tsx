"use client";
import { useEffect, useState } from "react";
import { QuotationDocument } from "./QuotationDocument";
import type { QuotationState } from "./quotation-model";

export function QuotationPrintDocument({ quotation }: { quotation: QuotationState }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const prepare = async () => {
      try {
        await document.fonts.ready;
        const images = Array.from(document.querySelectorAll<HTMLImageElement>(".quotation-print-root img"));
        await Promise.all(images.map(image => image.complete ? Promise.resolve() : new Promise<void>(resolve => {
          image.addEventListener("load", () => resolve(), { once: true });
          image.addEventListener("error", () => resolve(), { once: true });
        })));
        await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
        if (!cancelled) setReady(true);
      } catch { if (!cancelled) setReady(false); }
    };
    void prepare();
    return () => { cancelled = true; };
  }, []);
  return <div className="quotation-print-root" data-print-ready={ready ? "true" : "false"} aria-hidden="true"><QuotationDocument quotation={quotation} /></div>;
}
