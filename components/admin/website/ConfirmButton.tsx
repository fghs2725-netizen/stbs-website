"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ConfirmButton({
  label,
  confirmLabel = "Confirm",
  message,
  onConfirm,
  variant = "secondary",
  busyLabel = "Working…",
}: {
  label: string;
  confirmLabel?: string;
  message: string;
  onConfirm: () => Promise<void>;
  variant?: "secondary" | "destructive";
  busyLabel?: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <div className="flex flex-col gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 sm:flex-row sm:items-center">
        <span className="mb-2 flex items-start gap-2 text-xs leading-5 text-red-200 sm:mb-0">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          {message}
        </span>
        <div className="flex gap-2 sm:ml-auto">
          <Button size="sm" variant="ghost" onClick={() => setConfirming(false)} disabled={busy}>
            Cancel
          </Button>
          <Button size="sm" variant="destructive" onClick={run} disabled={busy}>
            {busy ? busyLabel : confirmLabel}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Button size="sm" variant={variant} onClick={() => setConfirming(true)}>
      {label}
    </Button>
  );
}