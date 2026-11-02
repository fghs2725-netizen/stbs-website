import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { challanDraftFromInvoice, challanDraftFromQuotation } from "@/lib/challan-management";
import { emptyChallan } from "@/lib/challan";
import { PageHeader } from "@/components/admin/PageHeader";
import { ChallanEditor } from "@/components/challan/ChallanEditor";

export const dynamic = "force-dynamic";

/** `?invoice=<id>` or `?quotation=<id>` starts from that document's client and lines. Nothing is saved until Save. */
export default async function NewChallanPage({ searchParams }: { searchParams: Promise<{ invoice?: string; quotation?: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");
  const { invoice, quotation } = await searchParams;
  const initial =
    (invoice && (await challanDraftFromInvoice(invoice))) ||
    (quotation && (await challanDraftFromQuotation(quotation))) ||
    emptyChallan();
  const from = initial.invoiceRef ? `invoice ${initial.invoiceRef}` : initial.quotationRef ? `quotation ${initial.quotationRef}` : "";

  return (
    <div className="a-page">
      <PageHeader
        eyebrow="Delivery challan"
        title="New delivery challan"
        description={from ? `From ${from}. Change the quantities to what is going out now.` : "Tap a preset or add lines. The number is taken when you issue it."}
      />
      <ChallanEditor initial={initial} />
    </div>
  );
}
