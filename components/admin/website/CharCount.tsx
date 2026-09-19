"use client";

import { useEffect, useRef, useState } from "react";

type Level = "ok" | "near" | "over";

export const charLevel = (length: number, max: number): Level => (length > max ? "over" : length >= max * 0.9 ? "near" : "ok");

const COLOR: Record<Level, string> = { ok: "text-zinc-500", near: "text-amber-400", over: "text-red-400" };

/** "n / max" counter. Neutral under 90%, amber from 90%, red past the recommended maximum. Only announces when the level changes. */
export function CharCount({ value, max, className = "" }: { value: string | null | undefined; max: number; className?: string }) {
  const length = (value ?? "").length;
  const level = charLevel(length, max);
  const [announce, setAnnounce] = useState("");
  const previous = useRef<Level>(level);

  useEffect(() => {
    if (previous.current === level) return;
    previous.current = level;
    setAnnounce(level === "over" ? `Over the recommended length by ${length - max} characters` : level === "near" ? "Approaching the recommended length" : "Within the recommended length");
  }, [level, length, max]);

  return (
    <p className={`mt-1 text-right text-xs tabular-nums ${COLOR[level]} ${className}`}>
      <span aria-hidden="true">{length} / {max}</span>
      <span className="sr-only">{length} of {max} recommended characters</span>
      <span className="sr-only" role="status" aria-live="polite">{announce}</span>
    </p>
  );
}
