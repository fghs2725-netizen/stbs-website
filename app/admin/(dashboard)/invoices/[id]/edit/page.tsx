import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { getInvoice, getInvoiceConfig, gstModeForClient, listCustomUnits, saveCustomUnit } from "@/lib/invoice-management";
import { InvoiceEditor } from "@/components/invoice/editor/InvoiceEditor";
import { formatInvoiceNumber } from "@/lib/invoice-numbering";
import { PageHeader } from "@/components/admin/PageHeader";
import { saveInvoiceAction } from "../../actions";
import { mergeUnits } from "@/lib/units";

export const dynamic = "force-dynamic";

async function gstModeAction(state: string, gstin?: string) {
  "use server";
  return gstModeForClient(state, gstin);
}

async function createUnitAction(unit: string) {
  "use server";
  await saveCustomUnit(unit);
}

export default async function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

  const { id } = await params;
  const invoice = await getInvoice(id);
  if (!invoice) notFound();
  // A cancelled invoice is a closed record: it is read from the list, never edited.
  if (invoice.status === "CANCELLED") redirect(`/admin/invoices/${id}`);

  const { settings, business } = await getInvoiceConfig();
  const units = mergeUnits(await listCustomUnits());

  return (
    <div className="a-page">
      <PageHeader
        eyebrow="Invoices"
        title={invoice.number ? `Edit invoice ${formatInvoiceNumber(invoice.number)}` : "Edit draft invoice"}
        description={invoice.client.companyName || "No client yet"}
        action={<span className="hidden lg:block"><Link href={`/admin/invoices/${id}`} className="a-btn">Back to invoice</Link></span>}
      />
      <InvoiceEditor
        initial={invoice}
        settings={settings}
        business={business}
        units={units}
        onCreateUnit={createUnitAction}
        save={saveInvoiceAction}
        gstModeFor={gstModeAction}
      />
    </div>
  );
}
