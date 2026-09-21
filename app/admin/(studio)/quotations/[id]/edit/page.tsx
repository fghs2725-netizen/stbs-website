import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { getQuotation, listClients } from "@/lib/quotation-management";
import { listPickerTemplates } from "@/lib/quotation-templates";
import { QuotationStudio } from "@/components/quotation/studio/QuotationStudio";

export const dynamic = "force-dynamic";

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const s = await auth();
  if (!s?.user) redirect("/admin/login");
  const q = await getQuotation((await params).id);
  if (!q) notFound();
  if (q.status === "FINAL") redirect(`/admin/quotations/${q.id}`);
  const [clients, templates] = await Promise.all([listClients(), listPickerTemplates()]);
  return <QuotationStudio initial={q} clients={clients} templates={templates} backHref={`/admin/quotations/${q.id}`} backLabel="Quotation" />;
}
