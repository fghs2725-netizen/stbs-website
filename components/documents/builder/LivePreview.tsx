'use client';

import React, { useEffect, useRef, useState } from 'react';
import { DocumentRenderer } from '@/components/documents/DocumentRenderer';

interface LivePreviewProps {
  document: any;
  zoom: number;
  onZoomChange?: (zoom: number) => void;
}

const A4_WIDTH_PX = 794; // 210mm at 96dpi

export function LivePreview({ document, zoom, onZoomChange }: LivePreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const [pageHeight, setPageHeight] = useState(0);

  // Latest-zoom ref so resize fitting never reads a stale closure value.
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  // Fit the page to the available width when the panel is too narrow for the
  // current zoom (e.g. first render on phones/tablets).
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !onZoomChange) return;
    const fit = () => {
      const available = el.clientWidth - 48;
      if (available > 200 && A4_WIDTH_PX * zoomRef.current > available) {
        onZoomChange(Math.max(0.3, Math.round((available / A4_WIDTH_PX) * 100) / 100));
      }
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    return () => observer.disconnect();
    // Only re-fit on mount; manual zoom changes afterwards are respected.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reserve exact layout space for the scaled preview. transform does not
  // affect layout height, so the wrapper must be sized to the unscaled page
  // height times zoom; measuring (instead of computing 1123px per sheet)
  // stays correct for any number of stacked A4 sheets.
  useEffect(() => {
    const el = pageRef.current;
    if (!el) return;
    const measure = () => setPageHeight(el.offsetHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [document]);

  return (
    <div className="pdf-live-preview pdf-scrollable pb-20">
      <div ref={containerRef} className="flex-1 flex justify-center py-10 px-4">
        <div style={{ height: pageHeight ? pageHeight * zoom : undefined }}>
          <div
            ref={pageRef}
            className="page-container"
            style={{
              width: '210mm',
              transform: `scale(${zoom})`,
              transformOrigin: 'top center',
            }}
          >
            <DocumentRenderer document={document} items={document?.items || []} sections={document?.sections || []} />
          </div>
        </div>
      </div>

      {/* Zoom indicator */}
      <div className="absolute bottom-6 right-6 bg-black/80 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 text-white text-xs font-medium shadow-xl">
        A4 Format • {Math.round(zoom * 100)}%
      </div>
    </div>
  );
}
