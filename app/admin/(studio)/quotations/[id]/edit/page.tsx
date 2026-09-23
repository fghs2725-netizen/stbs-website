import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { getQuotation, listClients } from "@/lib/quotation-management";
import { invoicesForQuotation, listCustomUnits, saveCustomUnit } from "@/lib/invoice-management";
import { mergeUnits } from "@/lib/units";
import { listPickerTemplates } from "@/lib/quotation-templates";
import { QuotationStudio } from "@/components/quotation/studio/QuotationStudio";
import { convertQuotationAction } from "@/app/admin/(dashboard)/invoices/actions";
import { formatInvoiceNumber } from "@/lib/invoice-numbering";

async function createUnitAction(unit: string) {
  "use server";
  await saveCustomUnit(unit);
}


export const dynamic = "force-dynamic";

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const s = await auth();
  if (!s?.user) redirect("/admin/login");
  const q = await getQuotation((await params).id);
  if (!q) notFound();
  if (q.status === "FINAL") redirect(`/admin/quotations/${q.id}`);
  const [clients, templates, invoices] = await Promise.all([listClients(), listPickerTemplates(), invoicesForQuotation(q.id!)]);
  const units = mergeUnits(await listCustomUnits());
  const raisedInvoice = invoices[0];
  return (
    <QuotationStudio
      initial={q} units={units} onCreateUnit={createUnitAction} clients={clients} templates={templates}
      backHref={`/admin/quotations/${q.id}`} backLabel="Quotation"
      raiseInvoice={raisedInvoice
        ? { href: `/admin/invoices/${raisedInvoice.id}`, label: raisedInvoice.number ? `View invoice ${formatInvoiceNumber(raisedInvoice.number)}` : "View draft invoice" }
        : { action: convertQuotationAction.bind(null, q.id!) }}
    />
  );
}
