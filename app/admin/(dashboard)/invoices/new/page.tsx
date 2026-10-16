import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getInvoiceConfig, gstModeForClient, listCustomUnits, saveCustomUnit } from "@/lib/invoice-management";
import { resolveInvoiceTemplate } from "@/lib/invoice-templates";
import { buildDraft } from "@/components/invoice/invoice-model";
import { NewInvoiceFlow } from "@/components/invoice/presets/NewInvoiceFlow";
import { listPresets } from "@/lib/quotation-preset-store";
import { PageHeader } from "@/components/admin/PageHeader";
import { checkInvoiceNumberAction, saveInvoiceAction } from "../actions";
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
  const [units, presets] = await Promise.all([listCustomUnits().then(mergeUnits), listPresets()]);
  const draft = buildDraft(settings, new Date().toISOString().slice(0, 10));
  // A brand-new draft has no id to resolve a template by, but it does carry the same
  // templateId/status shape resolveInvoiceTemplate expects.
  const template = await resolveInvoiceTemplate({ status: draft.status ?? "DRAFT", templateId: draft.templateId ?? null, templateSnapshot: null });

  return (
    <div className="a-page">
      <PageHeader
        eyebrow="Invoices"
        title="New invoice"
        description="Start from a rainwater harvesting or borewell job, or a blank invoice. A tax invoice takes a number only when you issue it; a cash invoice takes none."
        action={<span className="hidden lg:block"><Link href="/admin/invoices" className="a-btn">All invoices</Link></span>}
      />
      <NewInvoiceFlow
        presets={presets}
        initial={draft} settings={settings} business={business} template={template}
        units={units} onCreateUnit={createUnitAction}
        save={saveInvoiceAction} gstModeFor={gstModeAction}
        checkNumber={checkInvoiceNumberAction}
      />
    </div>
  );
}
