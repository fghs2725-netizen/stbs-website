import { ArrowDownRight, ArrowUpRight, Star } from "lucide-react";

/** Server-safe display pieces shared by the Google Business pages. */

export const formatCount = (n: number) => n.toLocaleString("en-IN");

export const shortDate = (iso: string) =>
  new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });

export const longDate = (value: string) =>
  new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

/** A count with its change against the previous period. Up is good for every figure here. */
export function MetricTiles({ tiles }: { tiles: Array<{ label: string; value: number; change: number | null }> }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {tiles.map((t) => (
        <div key={t.label} className="a-card p-4">
          <p className="a-label">{t.label}</p>
          <p className="mt-1 text-[1.5rem] font-semibold leading-tight" style={{ color: "var(--a-ink)" }}>{formatCount(t.value)}</p>
          <p className="mt-1 flex flex-wrap items-center gap-x-1 text-[0.75rem]" style={{ color: t.change === null ? "var(--a-faint)" : t.change >= 0 ? "var(--a-positive)" : "var(--a-danger)" }}>
            {t.change === null ? (
              "No earlier figure to compare"
            ) : (
              <>
                {t.change >= 0 ? <ArrowUpRight className="size-3.5" aria-hidden /> : <ArrowDownRight className="size-3.5" aria-hidden />}
                <span className="whitespace-nowrap">{t.change >= 0 ? "+" : "−"}{Math.abs(t.change)}%</span>
                <span className="whitespace-nowrap" style={{ color: "var(--a-faint)" }}>vs previous period</span>
              </>
            )}
          </p>
        </div>
      ))}
    </div>
  );
}

export function Stars({ value, size = 16 }: { value: number; size?: number }) {
  const full = Math.round(value);
  return (
    <span className="inline-flex items-center gap-[2px]" role="img" aria-label={`${value.toFixed(value % 1 ? 1 : 0)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={size} strokeWidth={1.5} aria-hidden fill={i <= full ? "#f5a623" : "transparent"} color={i <= full ? "#f5a623" : "var(--a-hairline-strong)"} />
      ))}
    </span>
  );
}

/** Two-part proportion bar (Search vs Maps, phone vs computer), labelled in text so colour is never the only cue. */
export function SplitBar({ label, a, b }: { label: string; a: { name: string; value: number }; b: { name: string; value: number } }) {
  const total = a.value + b.value;
  const pctA = total ? Math.round((a.value / total) * 100) : 0;
  return (
    <div>
      <p className="a-label">{label}</p>
      <div className="mt-2 flex h-[8px] gap-[2px] overflow-hidden rounded-full" aria-hidden>
        {total ? (
          <>
            <div className="h-full rounded-l-full" style={{ width: `${pctA}%`, background: "var(--a-brand)" }} />
            <div className="h-full flex-1 rounded-r-full" style={{ background: "rgba(0,102,204,.28)" }} />
          </>
        ) : (
          <div className="h-full w-full" style={{ background: "rgba(0,0,0,.06)" }} />
        )}
      </div>
      <div className="mt-2 flex justify-between gap-3 text-[0.8125rem]">
        <span style={{ color: "var(--a-body)" }}><span className="inline-block size-2 rounded-full align-middle" style={{ background: "var(--a-brand)" }} aria-hidden /> {a.name} <strong style={{ color: "var(--a-ink)" }}>{formatCount(a.value)}</strong>{total ? ` (${pctA}%)` : ""}</span>
        <span style={{ color: "var(--a-body)" }}><span className="inline-block size-2 rounded-full align-middle" style={{ background: "rgba(0,102,204,.28)" }} aria-hidden /> {b.name} <strong style={{ color: "var(--a-ink)" }}>{formatCount(b.value)}</strong>{total ? ` (${100 - pctA}%)` : ""}</span>
      </div>
    </div>
  );
}
