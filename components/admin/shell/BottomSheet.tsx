"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

/**
 * A form that slides up from the bottom on a phone and sits centred on a desktop. Rendered into
 * <body>, so it carries .theme-admin itself for the admin colours. Escape and the backdrop close it.
 */
export function BottomSheet({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Focus the first field, so the keyboard comes up ready on a phone.
    const t = setTimeout(() => panel.current?.querySelector<HTMLElement>("input, select, textarea, button:not([data-close])")?.focus(), 60);
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = overflow; clearTimeout(t); };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className="theme-admin fixed inset-0 z-[70] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,.4)" }} onClick={onClose} aria-hidden />
      <div
        ref={panel}
        className="relative max-h-[92dvh] w-full max-w-[520px] overflow-y-auto rounded-t-[22px] px-5 pb-[calc(20px+env(safe-area-inset-bottom))] pt-4 sm:rounded-[18px] sm:pb-5"
        style={{ background: "var(--a-surface)", boxShadow: "var(--a-shadow-lift)" }}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 id={titleId} className="a-h2">{title}</h2>
          <button type="button" data-close onClick={onClose} aria-label="Close" className="inline-flex size-9 items-center justify-center rounded-full" style={{ background: "rgba(0,0,0,.05)", color: "var(--a-muted)" }}>
            <X size={18} aria-hidden />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
