import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { getChallan } from "@/lib/challan-management";
import { getInvoiceConfig } from "@/lib/invoice-management";
import { whatIsMissing } from "@/lib/challan";
import { PageHeader } from "@/components/admin/PageHeader";
import { Pill } from "@/components/admin/shell/ui";
import { Button } from "@/components/ui/button";
import { ConfirmSubmit } from "@/components/admin/ConfirmSubmit";
import { ChallanDocument } from "@/components/challan/ChallanDocument";
import { ChallanPdfActions } from "@/components/challan/ChallanPdfActions";
import { shareSubjectFromChallan } from "@/components/challan/challan-share";
import { cancelChallanAction, deleteChallanAction, duplicateChallanAction, issueChallanAction } from "../actions";

export const dynamic = "force-dynamic";

const LABEL = { DRAFT: "Draft", ISSUED: "Issued", CANCELLED: "Cancelled" } as const;
const TONE = { DRAFT: "warn", ISSUED: "brand", CANCELLED: "neutral" } as const;

export default async function ChallanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");
  const { id } = await params;
  const challan = await getChallan(id);
  if (!challan || challan.deletedAt) notFound();
  const { business } = await getInvoiceConfig();
  const missing = whatIsMissing(challan);
  const draft = challan.status === "DRAFT";

  return (
    <div className="a-page">
      <PageHeader
        eyebrow="Delivery challan"
        title={challan.reference ? `Challan ${challan.reference}` : "Draft delivery challan"}
        description={challan.client.name || "No client yet"}
        action={
          <span className="hidden items-center gap-2 lg:flex">
            <Link href="/admin/delivery-challans" className="a-btn">All challans</Link>
            {draft && <Link href={`/admin/delivery-challans/${id}/edit`} className="a-btn a-btn-primary">Edit</Link>}
          </span>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Pill tone={TONE[challan.status]}>{LABEL[challan.status]}</Pill>
        {challan.invoiceRef && (
          <span className="text-[0.8125rem]" style={{ color: "var(--a-faint)" }}>
            Against invoice {challan.invoiceId ? <Link className="a-link" href={`/admin/invoices/${challan.invoiceId}`}>{challan.invoiceRef}</Link> : challan.invoiceRef}
          </span>
        )}
      </div>

      {draft && missing.length > 0 && (
        <div className="a-card p-4">
          <p className="text-[0.9375rem] font-semibold" style={{ color: "var(--a-ink)" }}>Before this can be issued</p>
          <ul className="mt-2 list-disc pl-5 text-[0.875rem]" style={{ color: "var(--a-body)" }}>
            {missing.map((m) => <li key={m}>Add {m}.</li>)}
          </ul>
        </div>
      )}

      <div className="a-card flex flex-wrap items-center gap-2 p-4">
        {draft && (
          <>
            <form action={issueChallanAction.bind(null, id)}>
              <Button type="submit" disabled={missing.length > 0}>Issue and take the next number</Button>
            </form>
            <Link href={`/admin/delivery-challans/${id}/edit`} className="a-btn a-btn-secondary lg:hidden">Edit</Link>
          </>
        )}
        <ChallanPdfActions id={id} subject={shareSubjectFromChallan(challan)} />
        <form action={duplicateChallanAction.bind(null, id)}>
          <Button type="submit" variant="secondary">Duplicate</Button>
        </form>
        {draft && (
          <form action={deleteChallanAction.bind(null, id)}>
            <ConfirmSubmit variant="destructive" message="Delete this draft challan? It has no number yet, so nothing is lost from the series.">Delete draft</ConfirmSubmit>
          </form>
        )}
      </div>

      {challan.status === "ISSUED" && (
        <form action={cancelChallanAction.bind(null, id)} className="a-card flex flex-wrap items-end gap-2 p-4">
          <label className="min-w-[16rem] flex-1">
            <span className="a-label">Cancel this challan (it keeps its number)</span>
            <input name="reason" required className="a-input mt-1" placeholder="Reason, e.g. vehicle changed, reissued as the next number" />
          </label>
          <ConfirmSubmit variant="destructive" message="Cancel this challan? It stays in the series marked Cancelled.">Cancel challan</ConfirmSubmit>
        </form>
      )}

      <div className="a-card overflow-x-auto p-3" style={{ background: "#e9ecef" }}>
        <div style={{ zoom: 0.8 }}><ChallanDocument challan={challan} business={business} /></div>
      </div>
    </div>
  );
}
