import { QuotationStudio } from "@/components/quotation/studio/QuotationStudio";
import { listClients } from "@/lib/quotation-management";
import { listCustomUnits, saveCustomUnit } from "@/lib/invoice-management";
import { mergeUnits } from "@/lib/units";
import { getDefaultRef, listPickerTemplates } from "@/lib/quotation-templates";
import { initialQuotation, type QuotationState } from "@/components/quotation/quotation-model";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

async function createUnitAction(unit: string) {
  "use server";
  await saveCustomUnit(unit);
}


export const metadata = { title: "New Quotation", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function NewQuotationPage({ searchParams }: { searchParams: Promise<{ clientId?: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

  const [clients, templates, template] = await Promise.all([listClients(), listPickerTemplates(), getDefaultRef()]);
  const id = (await searchParams).clientId;
  const client = clients.find((x) => x.id === id);

  // A new quotation starts on the default template and takes its validity wording; both stay changeable.
  const base: QuotationState = { ...initialQuotation, quotationDate: new Date().toLocaleDateString("en-GB"), templateId: template.id, template, validity: template.content.validity };
  const initial: QuotationState = client
    ? { ...base, clientId: client.id, client: { gstin: client.gstin, companyName: client.companyName, contactPerson: client.contactPerson, addressLine1: client.addressLine1, addressLine2: client.addressLine2, city: client.city, state: client.state, pinCode: client.pinCode, phone: client.phone, email: client.email } }
    : base;

  const units = mergeUnits(await listCustomUnits());
  return <QuotationStudio initial={initial} units={units} onCreateUnit={createUnitAction} clients={clients} templates={templates} backHref="/admin/quotations" backLabel="Quotations" />;
}
