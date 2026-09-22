import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getInvoiceConfig, gstModeForClient, listCustomUnits, saveCustomUnit } from "@/lib/invoice-management";
import { resolveInvoiceTemplate } from "@/lib/invoice-templates";
import { buildDraft } from "@/components/invoice/invoice-model";
import { InvoiceEditor } from "@/components/invoice/editor/InvoiceEditor";
import { PageHeader } from "@/components/admin/PageHeader";
import { saveInvoiceAction } from "../actions";
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

export default async function NewInvoicePage() {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

  const { settings, business } = await getInvoiceConfig();
  const units = mergeUnits(await listCustomUnits());
  const draft = buildDraft(settings, new Date().toISOString().slice(0, 10));
  // A brand-new draft has no id to resolve a template by, but it does carry the same
  // templateId/status shape resolveInvoiceTemplate expects.
  const template = await resolveInvoiceTemplate({ status: draft.status ?? "DRAFT", templateId: draft.templateId ?? null, templateSnapshot: null });

  return (
    <div className="a-page">
      <PageHeader
        eyebrow="Invoices"
        title="New invoice"
        description="A fresh invoice with no quotation behind it. It takes a number only when you issue it."
        action={<span className="hidden lg:block"><Link href="/admin/invoices" className="a-btn">All invoices</Link></span>}
      />
      <InvoiceEditor
        initial={draft} settings={settings} business={business} template={template}
        units={units} onCreateUnit={createUnitAction}
        save={saveInvoiceAction} gstModeFor={gstModeAction}
      />
    </div>
  );
}
