"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

export interface BarPoint { label: string; detail: string; value: number }

const H = 180;
const PAD = { top: 12, right: 8, bottom: 26, left: 36 };
const BAR_MAX = 24;
const GAP = 2;

function niceMax(max: number): number {
  if (max <= 4) return 4;
  const pow = 10 ** Math.floor(Math.log10(max));
  for (const step of [1, 2, 2.5, 5, 10]) {
    const m = step * pow;
    if (m >= max) return m;
  }
  return 10 * pow;
}
const compact = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1).replace(/\.0$/, "")}K` : String(n));

/**
 * One series of columns (views or customer actions per day/week) with a hover and keyboard
 * tooltip. Single series, so no legend: the card title names it. Values also live in the table.
 */
export function DailyBars({ title, points, unit }: { title: string; points: BarPoint[]; unit: string }) {
  const [active, setActive] = useState<number | null>(null);
  const titleId = useId();
  // The drawing is sized to its card, so axis text stays 11px on a phone instead of shrinking with a scaled SVG.
  const box = useRef<HTMLElement>(null);
  const [W, setW] = useState(640);
  useEffect(() => {
    const el = box.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([entry]) => setW(Math.max(260, Math.round(entry.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const { max, ticks } = useMemo(() => {
    const m = niceMax(Math.max(0, ...points.map((p) => p.value)));
    return { max: m, ticks: [0, m / 2, m] };
  }, [points]);

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const slot = plotW / Math.max(1, points.length);
  const barW = Math.max(1, Math.min(BAR_MAX, slot - GAP));
  const y = (v: number) => PAD.top + plotH - (v / max) * plotH;
  const labelIdx = points.length <= 1 ? [0] : [0, Math.floor((points.length - 1) / 2), points.length - 1];

  const a = active !== null ? points[active] : null;
  const ax = active !== null ? PAD.left + slot * active + slot / 2 : 0;

  return (
    <figure ref={box} className="relative" aria-labelledby={titleId}>
      <figcaption id={titleId} className="sr-only">{title}</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" height={H} role="img" aria-label={`${title}. Use the table below for every value.`} onPointerLeave={() => setActive(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--a-hairline)" strokeWidth={1} />
            <text x={PAD.left - 6} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill="var(--a-faint)" style={{ fontVariantNumeric: "tabular-nums" }}>{compact(t)}</text>
          </g>
        ))}
        {points.map((p, i) => {
          const x = PAD.left + slot * i + (slot - barW) / 2;
          const top = y(p.value);
          const h = Math.max(0, PAD.top + plotH - top);
          const r = Math.min(4, barW / 2, h);
          // Rounded data-end, square at the baseline.
          const d = h <= 0 ? "" : `M${x},${PAD.top + plotH} V${top + r} Q${x},${top} ${x + r},${top} H${x + barW - r} Q${x + barW},${top} ${x + barW},${top + r} V${PAD.top + plotH} Z`;
          return (
            <g key={i}>
              {d && <path d={d} fill="var(--a-brand)" opacity={active === null || active === i ? 1 : 0.45} />}
              {/* The hit area is the whole slot and full height, far bigger than a thin bar. */}
              <rect
                x={PAD.left + slot * i}
                y={PAD.top}
                width={slot}
                height={plotH}
                fill="transparent"
                tabIndex={0}
                aria-label={`${p.detail}: ${p.value} ${unit}`}
                onPointerEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                style={{ outline: "none" }}
              />
            </g>
          );
        })}
        {labelIdx.map((i) => (
          <text key={i} x={PAD.left + slot * i + slot / 2} y={H - 8} fontSize={11} fill="var(--a-faint)" textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"}>
            {points[i]?.label}
          </text>
        ))}
      </svg>
      {a && (
        <div
          role="status"
          className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 whitespace-nowrap rounded-[10px] px-3 py-2 text-[0.8125rem]"
          style={{ left: `clamp(60px, ${(ax / W) * 100}%, calc(100% - 60px))`, background: "var(--a-surface)", boxShadow: "var(--a-shadow-lift)", border: "1px solid var(--a-hairline)" }}
        >
          <p className="a-num font-semibold" style={{ color: "var(--a-ink)" }}>{a.value.toLocaleString("en-IN")} {unit}</p>
          <p style={{ color: "var(--a-muted)" }}>{a.detail}</p>
        </div>
      )}
    </figure>
  );
}
