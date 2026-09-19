"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import "./feedback.css";

export type Toast = { id: number; kind: "success" | "error" | "info"; text: string };

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const next = useRef(1);
  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const push = useCallback((kind: Toast["kind"], text: string) => {
    const id = next.current++;
    setToasts((t) => [...t.slice(-3), { id, kind, text }]);
    window.setTimeout(() => dismiss(id), kind === "error" ? 8000 : 4000);
  }, [dismiss]);
  return { toasts, push, dismiss };
}

export function Toaster({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div className="q-toaster" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`q-toast ${t.kind}`}>
          <span>{t.text}</span>
          <button type="button" aria-label="Dismiss notification" onClick={() => onDismiss(t.id)}>×</button>
        </div>
      ))}
    </div>
  );
}

export function ConfirmDialog({ title, body, confirmLabel, destructive, busy, confirmDisabled, children, onConfirm, onCancel }: {
  title: string; body: string; confirmLabel: string; destructive?: boolean; busy?: boolean; confirmDisabled?: boolean; children?: React.ReactNode; onConfirm: () => void; onCancel: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); onCancel(); } };
    document.addEventListener("keydown", onKey, true);
    return () => { document.removeEventListener("keydown", onKey, true); previous?.focus?.(); };
  }, [onCancel]);
  return (
    <div className="q-dialog-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="q-dialog" role="alertdialog" aria-modal="true" aria-labelledby="q-dialog-title" aria-describedby="q-dialog-body">
        <h3 id="q-dialog-title">{title}</h3>
        <p id="q-dialog-body">{body}</p>
        {children}
        <div className="q-dialog-actions">
          <button type="button" ref={cancelRef} onClick={onCancel} disabled={busy}>Cancel</button>
          <button type="button" className={destructive ? "danger" : "primary"} onClick={onConfirm} disabled={busy || confirmDisabled}>{busy ? "Working…" : confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
