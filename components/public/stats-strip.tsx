"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";

export interface StatItem {
  value: string;
  label: string;
}

/** "1200+" -> { prefix: "", target: 1200, suffix: "+" }. Non-numeric values ("Haryana & NCR") -> null. */
function parseNumeric(value: string) {
  const m = value.trim().match(/^(\D*?)(\d[\d,]*)(\D*)$/);
  if (!m) return null;
  const target = Number(m[2].replace(/,/g, ""));
  return Number.isFinite(target) ? { prefix: m[1], target, suffix: m[3], comma: m[2].includes(",") } : null;
}

function CountUp({ prefix, target, suffix, comma, className }: { prefix: string; target: number; suffix: string; comma: boolean; className: string }) {
  // Server render and first client render show the FINAL value: correct without JS, for
  // crawlers and screen readers. After mount the number restarts from 0 and counts up
  // once, when the stat scrolls into view. Reduced motion: never restarts.
  const [n, setN] = useState(target);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    let started = false;
    setN(0);
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || started) return;
        started = true;
        io.disconnect();
        const t0 = performance.now();
        const tick = (t: number) => {
          const p = Math.min(1, (t - t0) / 1000);
          setN(Math.round(target * (1 - Math.pow(1 - p, 3)))); // ease-out
          if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [target]);

  const shown = comma ? n.toLocaleString("en-IN") : String(n);
  return (
    <>
      <span ref={ref} aria-hidden="true" className={className}>{prefix}{shown}{suffix}</span>
      <span className="sr-only">{prefix}{target}{suffix}</span>
    </>
  );
}

/**
 * Four headline stats on a --brand-deep band. Numeric values count up on scroll (tabular
 * figures so the digits don't jitter); text values ("Haryana & NCR") render statically at
 * the H2 scale because a 44-72px stat size overflows a two-column mobile cell.
 */
export function StatsStrip({ items }: { items: ReadonlyArray<StatItem> }) {
  if (items.length === 0) return null;
  return (
    <section className="band-deep rule-on-dark" aria-label="STBS at a glance">
      <div className="container-x section-y">
        <dl
          className="grid grid-cols-2 gap-x-u4 gap-y-u6 lg:[grid-template-columns:repeat(var(--cols),minmax(0,1fr))]"
          style={{ "--cols": Math.min(items.length, 4) } as CSSProperties}
        >
          {items.map((s, i) => {
            const numeric = parseNumeric(s.value);
            return (
              <div key={`${s.label}-${i}`} className="flex min-w-0 flex-col-reverse justify-end gap-u2 lg:border-l lg:border-white/10 lg:pl-u4 lg:first:border-l-0 lg:first:pl-0">
                <dt className="text-[0.9375rem] leading-[1.35] text-white/55">{s.label}</dt>
                <dd className="m-0">
                  {numeric ? <CountUp {...numeric} className="t-stat block" /> : <span className="block font-semibold leading-[1.05] tracking-[-0.03em] text-[clamp(1.75rem,2.2vw,2.75rem)]">{s.value}</span>}
                </dd>
              </div>
            );
          })}
        </dl>
      </div>
    </section>
  );
}
