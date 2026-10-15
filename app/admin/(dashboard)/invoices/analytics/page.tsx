import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getInvoiceAnalytics } from "@/lib/invoice-analytics";
import { PageHeader } from "@/components/admin/PageHeader";
import { InvoiceAnalyticsView } from "@/components/invoice/analytics/InvoiceAnalyticsView";

export const dynamic = "force-dynamic";

export default async function InvoiceAnalyticsPage({ searchParams }: { searchParams: Promise<{ fy?: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");
  const { fy: wanted } = await searchParams;

  let a: Awaited<ReturnType<typeof getInvoiceAnalytics>> | null = null;
  try {
    a = await getInvoiceAnalytics(wanted);
  } catch {
    a = null;
  }

  return (
    <div className="a-page">
      <PageHeader
        eyebrow="Invoices"
        title="Analytics"
        description="Billing, payments, GST and clients by financial year (April to March)."
        action={<Link href="/admin/invoices" className="a-btn hidden lg:inline-flex">All invoices</Link>}
      />

      {!a ? (
        <p role="alert" className="a-card p-4 text-[0.9375rem]" style={{ color: "var(--a-danger)" }}>Invoice figures are unavailable.</p>
      ) : (
        <InvoiceAnalyticsView a={a} />
      )}
    </div>
  );
}
