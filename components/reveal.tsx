"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";

type Phase = "visible" | "hidden" | "shown";

/**
 * Section-entry motion: slow Apple-style eased fade-up, fires once.
 *
 * Server render and first client render are identical (content visible), so there is
 * no hydration mismatch and the page is fully readable without JS. After mount, only
 * elements that start below the fold are armed (hidden), then revealed once as they
 * scroll into view. Under prefers-reduced-motion nothing is ever hidden or moved.
 * No parallax, no bounce, no scroll-jacking.
 */
export function Reveal({
  children,
  delay = 0,
  className = "",
  y = 32,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  y?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>("visible");

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) return; // already on screen: leave it be
    setPhase("hidden");
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setPhase("shown");
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const style =
    phase === "hidden"
      ? { opacity: 0, transform: `translateY(${y}px)` }
      : phase === "shown"
        ? { opacity: 1, transform: "none", transition: `opacity 900ms cubic-bezier(0.28,0.11,0.32,1) ${delay}s, transform 900ms cubic-bezier(0.28,0.11,0.32,1) ${delay}s` }
        : undefined;

  return (
    <div ref={ref} className={className} style={style}>
      {children}
    </div>
  );
}
