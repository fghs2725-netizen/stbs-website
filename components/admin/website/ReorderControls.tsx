"use client";

import { ArrowUp, ArrowDown } from "lucide-react";

export function ReorderControls({
  onUp,
  onDown,
  canUp,
  canDown,
  busy,
}: {
  onUp: () => Promise<void>;
  onDown: () => Promise<void>;
  canUp: boolean;
  canDown: boolean;
  busy?: boolean;
}) {
  const cls =
    "grid size-9 place-items-center rounded-md border border-white/[.08] text-zinc-400 transition-colors hover:border-signal/40 hover:text-white disabled:pointer-events-none disabled:opacity-30";
  return (
    <div className="flex items-center gap-1">
      <button type="button" className={cls} disabled={!canUp || busy} onClick={() => onUp()} aria-label="Move up">
        <ArrowUp size={15} />
      </button>
      <button type="button" className={cls} disabled={!canDown || busy} onClick={() => onDown()} aria-label="Move down">
        <ArrowDown size={15} />
      </button>
    </div>
  );
}