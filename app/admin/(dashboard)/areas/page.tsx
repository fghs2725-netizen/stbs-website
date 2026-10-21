import Link from "next/link";
import { redirect } from "next/navigation";
import { MapPin } from "lucide-react";
import { auth } from "@/auth";
import { PageHeader } from "@/components/admin/PageHeader";
import { EmptyState } from "@/components/admin/shell/ui";
import { AreaClientRow } from "@/components/admin/areas/AreaClientRow";
import { listInvoiceClients, type InvoiceClientRow } from "@/lib/website/area-clients";
import { AREAS } from "@/lib/website/areas";

export const dynamic = "force-dynamic";

/**
 * Everyone invoiced, each with a switch for the town pages. A client shown on a page gets its work and
 * years from its invoices, so new invoices update the page by themselves; new clients start hidden.
 */
export default async function AreasAdminPage() {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

  let rows: InvoiceClientRow[] = [];
  let error = "";
  try {
    rows = await listInvoiceClients();
  } catch {
    error = "The client list is unavailable right now. If this keeps happening, the database update for town pages may not have been applied yet.";
  }
  const shown = rows.filter((r) => r.shown).length;
  const areas = AREAS.map((a) => ({ slug: a.slug, name: a.name }));

  return (
    <div className="a-page">
      <PageHeader
        eyebrow="Website"
        title="Town pages"
        description="Choose which clients appear on your town pages. The work done and the years come from their invoices, so these pages keep up as you invoice. New clients stay hidden until you pick a town for them."
        action={
          <div className="flex items-center gap-3">
            <span className="a-num a-sub hidden sm:inline">{shown} shown of {rows.length}</span>
            <Link href="/areas" target="_blank" rel="noopener noreferrer" className="a-btn a-btn-secondary">View on website</Link>
          </div>
        }
      />
      {error ? (
        <div role="alert" className="a-card p-4 text-[0.9375rem]" style={{ color: "var(--a-danger)" }}>{error}</div>
      ) : rows.length === 0 ? (
        <EmptyState icon={MapPin} title="No invoiced clients yet" description="Clients appear here once you issue an invoice." />
      ) : (
        <div className="a-card overflow-hidden">
          <ul className="a-divide">
            {rows.map((r) => <AreaClientRow key={r.key} row={r} areas={areas} />)}
          </ul>
        </div>
      )}
    </div>
  );
}
