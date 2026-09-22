import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getInvoiceConfig, gstModeForClient } from "@/lib/invoice-management";
import { buildDraft } from "@/components/invoice/invoice-model";
import { InvoiceEditor } from "@/components/invoice/editor/InvoiceEditor";
import { PageHeader } from "@/components/admin/PageHeader";
import { saveInvoiceAction } from "../actions";

export const dynamic = "force-dynamic";

async function gstModeAction(state: string, gstin?: string) {
  "use server";
  return gstModeForClient(state, gstin);
}

export default async function NewInvoicePage() {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

  const { settings, business } = await getInvoiceConfig();
  const draft = buildDraft(settings, new Date().toISOString().slice(0, 10));

  return (
    <div className="a-page">
      <PageHeader
        eyebrow="Invoices"
        title="New invoice"
        description="A fresh invoice with no quotation behind it. It takes a number only when you issue it."
        action={<span className="hidden lg:block"><Link href="/admin/invoices" className="a-btn">All invoices</Link></span>}
      />
      <InvoiceEditor initial={draft} settings={settings} business={business} save={saveInvoiceAction} gstModeFor={gstModeAction} />
    </div>
  );
}
