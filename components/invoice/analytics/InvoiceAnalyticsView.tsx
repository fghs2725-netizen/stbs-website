import Link from "next/link";
import { BarChart3 } from "lucide-react";
import type { InvoiceAnalytics } from "@/lib/invoice-analytics";
import { formatINR } from "@/components/invoice/invoice-model";
import { formatInvoiceNumber } from "@/lib/invoice-numbering";
import { StatTiles } from "@/components/admin/shell/ui";

/** ₹12.4 L / ₹1.85 Cr for chart labels, where a full rupee figure would not fit. */
function short(n: number): string {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)} L`;
  if (n >= 1e3) return `₹${(n / 1e3).toFixed(0)}k`;
  return n > 0 ? `₹${Math.round(n)}` : "";
}
/** A tile's headline: lakh and crore so it fits a phone-width tile, with the exact figure in its hint. */
function tile(n: number): string {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`;
  return formatINR(n);
}
const day = (v: string) => new Date(v).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" });
const th = "px-4 py-2 text-left text-[0.75rem] font-semibold uppercase tracking-wider";
const td = "px-4 py-2 text-[0.875rem]";

/** The Analytics page body: every figure comes from `InvoiceAnalytics`, so the page only lays it out. */
export function InvoiceAnalyticsView({ a }: { a: InvoiceAnalytics }) {
  return (
    <>
      <nav className="a-segment flex-wrap" aria-label="Financial year">
        {a.years.map((y) => (
          <Link key={y} href={`/admin/invoices/analytics?fy=${y}`} data-active={y === a.fy} aria-current={y === a.fy ? "page" : undefined}>
            FY {y}
          </Link>
        ))}
      </nav>

      <StatTiles
        stats={[
          { label: "Billed", value: tile(a.current.billed), hint: `${formatINR(a.current.billed)} including GST` },
          { label: "Taxable value", value: tile(a.current.taxable), hint: `${formatINR(a.current.taxable)} before GST` },
          { label: "GST charged", value: tile(a.current.gst), hint: formatINR(a.current.gst) },
          { label: "Received", value: tile(a.current.received), hint: `${formatINR(a.current.received)} in payments dated this year` },
        ]}
      />
      <StatTiles
        stats={[
          { label: "Invoices", value: String(a.current.count), hint: a.drafts ? `${a.drafts} draft${a.drafts === 1 ? "" : "s"} not counted` : "Issued, part paid and paid" },
          { label: "Clients billed", value: String(a.current.clients) },
          { label: "Average invoice", value: tile(a.current.average), hint: formatINR(a.current.average) },
          { label: "Outstanding (all years)", value: tile(a.outstanding.total), hint: `${a.outstanding.overdueCount} overdue, ${formatINR(a.outstanding.overdueTotal)}` },
        ]}
      />

      <section className="a-card p-4" aria-labelledby="monthly">
        <h2 id="monthly" className="text-[0.9375rem] font-semibold" style={{ color: "var(--a-ink)" }}>Billed by month, FY {a.fy}</h2>
        {(() => {
          const top = Math.max(1, ...a.months.map((m) => m.billed));
          return (
            <div className="mt-4 grid h-[220px] grid-cols-12 items-end gap-1 sm:gap-2">
              {a.months.map((m) => (
                <div key={m.label} className="flex h-full min-w-0 flex-col items-center justify-end gap-1" title={`${m.label}: ${formatINR(m.billed)}, ${m.count} invoice${m.count === 1 ? "" : "s"}`}>
                  <span className="a-num hidden text-[0.6875rem] sm:block" style={{ color: "var(--a-faint)" }}>{short(m.billed)}</span>
                  <div
                    className="w-full rounded-t-[4px]"
                    style={{ height: `${Math.max(m.billed ? 2 : 0, (m.billed / top) * 100)}%`, background: "var(--a-brand)", maxHeight: "calc(100% - 34px)" }}
                  />
                  <span className="text-[0.6875rem]" style={{ color: "var(--a-body)" }}>{m.label}</span>
                </div>
              ))}
            </div>
          );
        })()}
      </section>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <section className="a-card overflow-hidden p-0" aria-labelledby="years">
          <h2 id="years" className="px-4 pt-4 text-[0.9375rem] font-semibold" style={{ color: "var(--a-ink)" }}>Year by year</h2>
          <div className="mt-2 overflow-x-auto">
            <table className="a-num w-full">
              <thead>
                <tr className="border-b border-[color:var(--a-hairline)]" style={{ color: "var(--a-faint)" }}>
                  <th className={th}>Year</th>
                  <th className={`${th} text-right`}>Invoices</th>
                  <th className={`${th} text-right`}>Billed</th>
                  <th className={`${th} text-right`}>GST</th>
                  <th className={`${th} text-right`}>Received</th>
                </tr>
              </thead>
              <tbody>
                {a.byYear.map((y) => (
                  <tr key={y.fy} className="border-b border-[color:var(--a-hairline)] last:border-0" style={{ color: "var(--a-body)" }}>
                    <td className={`${td} whitespace-nowrap`}><Link className="a-link" href={`/admin/invoices/analytics?fy=${y.fy}`}>{y.fy}</Link></td>
                    <td className={`${td} text-right`}>{y.count}</td>
                    <td className={`${td} text-right`} style={{ color: "var(--a-ink)" }}>{formatINR(y.billed)}</td>
                    <td className={`${td} text-right`}>{formatINR(y.gst)}</td>
                    <td className={`${td} text-right`}>{formatINR(y.received)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="a-card overflow-hidden p-0" aria-labelledby="clients">
          <h2 id="clients" className="px-4 pt-4 text-[0.9375rem] font-semibold" style={{ color: "var(--a-ink)" }}>Top clients, FY {a.fy}</h2>
          {a.topClients.length === 0 ? (
            <p className="p-4 text-[0.875rem]" style={{ color: "var(--a-faint)" }}>No invoices this year yet.</p>
          ) : (
            <div className="mt-2 overflow-x-auto">
              <table className="a-num w-full">
                <thead>
                  <tr className="border-b border-[color:var(--a-hairline)]" style={{ color: "var(--a-faint)" }}>
                    <th className={th}>Client</th>
                    <th className={`${th} text-right`}>Invoices</th>
                    <th className={`${th} text-right`}>Billed</th>
                    <th className={`${th} text-right`}>Owed</th>
                  </tr>
                </thead>
                <tbody>
                  {a.topClients.map((c) => (
                    <tr key={c.name} className="border-b border-[color:var(--a-hairline)] last:border-0" style={{ color: "var(--a-body)" }}>
                      <td className={`${td} max-w-[220px] truncate`}>
                        <Link className="a-link" href={`/admin/invoices?q=${encodeURIComponent(c.name)}`}>{c.name}</Link>
                      </td>
                      <td className={`${td} text-right`}>{c.count}</td>
                      <td className={`${td} text-right`} style={{ color: "var(--a-ink)" }}>{formatINR(c.billed)}</td>
                      <td className={`${td} text-right`}>{c.outstanding ? formatINR(c.outstanding) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[1fr_320px]">
        <section className="a-card overflow-hidden p-0" aria-labelledby="owed">
          <h2 id="owed" className="px-4 pt-4 text-[0.9375rem] font-semibold" style={{ color: "var(--a-ink)" }}>Still owed</h2>
          {a.outstanding.list.length === 0 ? (
            <p className="p-4 text-[0.875rem]" style={{ color: "var(--a-faint)" }}>Nothing is owed on any invoice.</p>
          ) : (
            <ul className="a-divide mt-2">
              {a.outstanding.list.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-3 px-4 py-2 text-[0.875rem]">
                  <Link href={`/admin/invoices/${o.id}`} className="min-w-0">
                    <span className="block truncate font-medium" style={{ color: "var(--a-ink)" }}>{o.client}</span>
                    <span className="a-num text-[0.8125rem]" style={{ color: "var(--a-faint)" }}>
                      {o.number ? `Invoice ${formatInvoiceNumber(o.number)}` : "No number"} · {day(o.date)}
                      {o.overdueDays > 0 ? ` · ${o.overdueDays} days overdue` : ""}
                    </span>
                  </Link>
                  <span className="a-num shrink-0" style={{ color: o.overdueDays > 0 ? "var(--a-danger)" : "var(--a-ink)" }}>{formatINR(o.balance)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="flex flex-col gap-4">
          <section className="a-card p-4" aria-labelledby="gst">
            <h2 id="gst" className="text-[0.9375rem] font-semibold" style={{ color: "var(--a-ink)" }}>GST, FY {a.fy}</h2>
            <dl className="a-num mt-2 grid grid-cols-2 gap-y-1 text-[0.875rem]">
              <dt style={{ color: "var(--a-faint)" }}>CGST</dt><dd className="text-right">{formatINR(a.current.cgst)}</dd>
              <dt style={{ color: "var(--a-faint)" }}>SGST</dt><dd className="text-right">{formatINR(a.current.sgst)}</dd>
              <dt style={{ color: "var(--a-faint)" }}>IGST</dt><dd className="text-right">{formatINR(a.current.igst)}</dd>
              <dt style={{ color: "var(--a-faint)" }}>Total</dt><dd className="text-right font-semibold" style={{ color: "var(--a-ink)" }}>{formatINR(a.current.gst)}</dd>
            </dl>
          </section>

          <section className="a-card p-4" aria-labelledby="status">
            <h2 id="status" className="text-[0.9375rem] font-semibold" style={{ color: "var(--a-ink)" }}>Invoices by status (all years)</h2>
            <dl className="a-num mt-2 grid grid-cols-2 gap-y-1 text-[0.875rem]">
              {([["Paid", "PAID"], ["Part paid", "PARTLY_PAID"], ["Issued", "ISSUED"], ["Drafts", "DRAFT"], ["Cancelled", "CANCELLED"]] as const).map(([label, key]) => (
                <div key={key} className="contents">
                  <dt style={{ color: "var(--a-faint)" }}>
                    <Link className="a-link" href={`/admin/invoices?status=${key}`}>{label}</Link>
                  </dt>
                  <dd className="text-right">{a.statusCounts[key]}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="a-card p-4" aria-labelledby="missing">
            <h2 id="missing" className="text-[0.9375rem] font-semibold" style={{ color: "var(--a-ink)" }}>Missing numbers (from 503)</h2>
            <p className="a-num mt-2 text-[0.875rem] break-words" style={{ color: a.missing.numbers.length ? "var(--a-ink)" : "var(--a-faint)" }}>
              {a.missing.numbers.length ? a.missing.text : "None. The series is complete."}
            </p>
            {a.missing.deletedNumbers.length > 0 && (
              <p className="mt-1 text-[0.75rem]" style={{ color: "var(--a-faint)" }}>
                In Deleted: {a.missing.deletedNumbers.join(", ")}. <Link className="a-link" href="/admin/invoices?status=DELETED">Open Deleted</Link>
              </p>
            )}
          </section>
        </div>
      </div>
    </>
  );
}

/** The four totals and the missing-number line shown above the invoice list. */
export function InvoiceSummaryStrip({ stats }: { stats: InvoiceAnalytics }) {
  return (
    <section aria-label="Invoice summary" className="flex flex-col gap-3">
      <StatTiles
        stats={[
          { label: `Billed ${stats.fy}`, value: tile(stats.current.billed), hint: `${stats.current.count} invoice${stats.current.count === 1 ? "" : "s"}, ${formatINR(stats.current.billed)}` },
          { label: `Received ${stats.fy}`, value: tile(stats.current.received), hint: formatINR(stats.current.received) },
          { label: "Outstanding", value: tile(stats.outstanding.total), hint: `${stats.outstanding.count} invoice${stats.outstanding.count === 1 ? "" : "s"} with a balance` },
          { label: "Overdue", value: tile(stats.outstanding.overdueTotal), hint: `${stats.outstanding.overdueCount} past the due date` },
        ]}
      />
      <div className="a-card flex flex-wrap items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="a-label">Missing invoice numbers (from 503)</p>
          <p className="a-num mt-1 text-[0.9375rem]" style={{ color: stats.missing.numbers.length ? "var(--a-ink)" : "var(--a-faint)" }}>
            {stats.missing.numbers.length ? stats.missing.text : "None. The series is complete."}
          </p>
          {stats.missing.numbers.length > 0 && (
            <p className="mt-1 text-[0.75rem]" style={{ color: "var(--a-faint)" }}>
              {stats.missing.numbers.length} number{stats.missing.numbers.length === 1 ? "" : "s"}
              {stats.missing.deletedNumbers.length ? `, of which ${stats.missing.deletedNumbers.length} are in Deleted and come back on restore` : ""}.
            </p>
          )}
        </div>
        <Link href="/admin/invoices/analytics" className="a-btn a-btn-sm">
          <BarChart3 size={15} strokeWidth={1.75} aria-hidden />
          Analytics
        </Link>
      </div>
    </section>
  );
}
