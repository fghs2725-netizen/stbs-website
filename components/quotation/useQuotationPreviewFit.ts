"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export const A4_WIDTH_PX = 210 / 25.4 * 96;
export const A4_HEIGHT_PX = 297 / 25.4 * 96;

const FIT_H_PADDING = 28;

/**
 * Single authoritative FIT-width scale for the A4 quotation preview.
 * Returns 0..1; the page is rendered at 100% whenever the container
 * already fits the A4 width, and scaled down proportionally otherwise.
 */
export function fitScaleForWidth(width: number, minScale = 0.25, maxScale = 1) {
  if (!Number.isFinite(width) || width <= 0) return maxScale;
  return Math.min(maxScale, Math.max(minScale, (width - FIT_H_PADDING) / A4_WIDTH_PX));
}

/**
 * Measures a container ref and keeps `scale` in sync with its width.
 * Re-fits only when the measured width actually changes (a ResizeObserver
 * resizing from content height must not clobber manual zoom).
 */
export function useQuotationPreviewFit<T extends HTMLElement>(minScale = 0.25, maxScale = 1) {
  const ref = useRef<T | null>(null);
  const [scale, setScale] = useState(maxScale);
  const lastWidth = useRef(0);

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const width = el.clientWidth;
    if (!width || Math.abs(width - lastWidth.current) < 1) return;
    lastWidth.current = width;
    setScale(fitScaleForWidth(width, minScale, maxScale));
  }, [minScale, maxScale]);

  useEffect(() => {
    measure();
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [measure]);

  return { ref, scale };
}