import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { getQuotation } from "@/lib/quotation-management";
import { QuotationPreview } from "@/components/quotation/QuotationPreview";
import { SavedQuotationPdf } from "@/components/quotation/SavedQuotationPdf";
import { duplicateAction } from "../actions";
import { DuplicateQuotationButton } from "@/components/quotation/DuplicateQuotationButton";

export const dynamic = "force-dynamic";

export default async function ViewPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");
  const quotation = await getQuotation((await params).id);
  if (!quotation || !quotation.id) notFound();

  return (
    <main className="saved-pdf-page min-h-screen bg-black px-5 py-8 text-white">
      {/* This is the sole PDF action surface; it deliberately precedes the preview. */}
      <SavedQuotationPdf quotation={quotation} />
      <div className="saved-pdf-screen mx-auto max-w-5xl">
        <div className="flex flex-wrap justify-between gap-4 py-8">
          <div>
            <p className="text-signal">{quotation.quotationReference} · {quotation.status}</p>
            <h1 className="mt-2 text-3xl">{quotation.client.companyName}</h1>
            <p className="text-white/50">{quotation.serviceType} · {quotation.quotationDate}</p>
          </div>
          {quotation.status === "DRAFT" && (
            <Link href={`/admin/quotations/${quotation.id}/edit`} className="inline-flex min-h-[40px] items-center self-start border border-signal px-4 py-2 text-signal">
              EDIT
            </Link>
          )}
          <form action={duplicateAction.bind(null, quotation.id)} className="self-start">
            <DuplicateQuotationButton />
          </form>
        </div>
        <section className="mt-8 overflow-auto">
          <QuotationPreview quotation={quotation} />
        </section>
      </div>
    </main>
  );
}
