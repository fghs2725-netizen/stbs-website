import Link from "next/link";
import { redirect } from "next/navigation";
import { Truck } from "lucide-react";
import { auth } from "@/auth";
import { listChallans } from "@/lib/challan-management";
import { PageHeader } from "@/components/admin/PageHeader";
import { EmptyState, Pill } from "@/components/admin/shell/ui";

export const dynamic = "force-dynamic";

const LABEL = { DRAFT: "Draft", ISSUED: "Issued", CANCELLED: "Cancelled" } as const;
const TONE = { DRAFT: "warn", ISSUED: "brand", CANCELLED: "neutral" } as const;
const day = (v: string) => (v ? new Date(`${v}T00:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" }) : "—");

export default async function DeliveryChallansPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");
  const { q = "", status = "" } = await searchParams;

  let rows: Awaited<ReturnType<typeof listChallans>> = [];
  let error = "";
  try { rows = await listChallans({ q, status }); } catch { error = "Delivery challans are unavailable right now."; }

  return (
    <div className="a-page">
      <PageHeader
        eyebrow="Documents"
        title="Delivery challans"
        description="Goods sent to site, with quantities and the date they left."
        action={<Link href="/admin/delivery-challans/new" className="a-btn a-btn-primary">New challan</Link>}
      />

      <form className="flex flex-wrap gap-2" action="/admin/delivery-challans">
        <input name="q" defaultValue={q} className="a-input a-input-search max-w-xs" placeholder="Search number or client" />
        <select name="status" defaultValue={status} className="a-input w-auto">
          <option value="">All</option>
          <option value="DRAFT">Drafts</option>
          <option value="ISSUED">Issued</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <button type="submit" className="a-btn a-btn-secondary">Filter</button>
        <Link href="/admin/delivery-challans/new" className="a-btn a-btn-primary sm:hidden">New challan</Link>
      </form>

      {error && <p role="alert" className="a-card p-4 text-[0.9375rem]" style={{ color: "var(--a-danger)" }}>{error}</p>}

      {!error && (
        <div className="a-card overflow-hidden">
          {rows.length === 0 ? (
            <EmptyState icon={Truck} title={q || status ? "No challans match" : "No delivery challans yet"} description={q || status ? "Try another search." : "Start one here, or raise one from an invoice's page."} />
          ) : (
            <ul className="a-divide">
              {rows.map((row) => (
                <li key={row.id}>
                  <Link href={`/admin/delivery-challans/${row.id}`} className="flex items-center justify-between gap-4 px-4 py-[14px] sm:px-5">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-[0.9375rem] font-semibold" style={{ color: "var(--a-ink)" }}>{row.clientName || "No client yet"}</p>
                        <Pill tone={TONE[row.status]}>{LABEL[row.status]}</Pill>
                      </div>
                      <p className="a-num mt-[3px] truncate text-[0.8125rem]" style={{ color: "var(--a-faint)" }}>
                        {row.reference || "Draft"} · {day(row.date)}{row.deliverTo ? ` · to ${row.deliverTo}` : ""}{row.invoiceRef ? ` · inv ${row.invoiceRef}` : ""}
                      </p>
                    </div>
                    <p className="a-num shrink-0 text-[0.875rem]" style={{ color: "var(--a-body)" }}>{row.lines} line{row.lines === 1 ? "" : "s"}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
