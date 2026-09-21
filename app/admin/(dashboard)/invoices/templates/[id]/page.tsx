import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { getInvoiceTemplate, saveInvoiceTemplate } from "@/lib/invoice-templates";
import { LIMITS } from "@/components/invoice/template/invoice-template-model";
import { PageHeader } from "@/components/admin/PageHeader";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

async function saveAction(id: string, formData: FormData) {
  "use server";
  const text = (name: string) => String(formData.get(name) ?? "").trim();
  const result = await saveInvoiceTemplate(id, {
    name: text("name"),
    content: {
      title: text("title"),
      copyMarker: text("copyMarker"),
      paymentHeading: text("paymentHeading"),
      paymentNote: text("paymentNote"),
      termsHeading: text("termsHeading"),
      // One term per line, so the list is edited the way it reads.
      terms: String(formData.get("terms") ?? "").split("\n").map((l) => l.trim()).filter(Boolean),
      declarationHeading: text("declarationHeading"),
      declaration: text("declaration"),
      signatureFor: text("signatureFor"),
      signatureLine: text("signatureLine"),
      footerNote: text("footerNote"),
    },
  });
  revalidatePath("/admin/invoices/templates");
  revalidatePath(`/admin/invoices/templates/${id}`);
  if (!result.ok) redirect(`/admin/invoices/templates/${id}?error=${encodeURIComponent(result.errors[0])}`);
  redirect("/admin/invoices/templates");
}

export default async function EditInvoiceTemplatePage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

  const { id } = await params;
  const { error } = await searchParams;
  const template = await getInvoiceTemplate(id);
  if (!template) notFound();
  const c = template.content;

  return (
    <div className="a-page">
      <PageHeader
        eyebrow="Invoice templates"
        title={template.name}
        description={
          template.invoiceCount > 0
            ? `Used by ${template.invoiceCount} invoice${template.invoiceCount === 1 ? "" : "s"}. Invoices already issued keep the wording they went out with.`
            : "Not used by any invoice yet."
        }
        action={<span className="hidden lg:block"><Link href="/admin/invoices/templates" className="a-btn">All templates</Link></span>}
      />

      {error && <p role="alert" className="a-card p-4 text-[0.9375rem]" style={{ color: "var(--a-danger)" }}>{error}</p>}

      <form action={saveAction.bind(null, id)} className="flex flex-col gap-4">
        <section className="a-card p-4">
          <h2 className="a-h2">Name and title</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="a-label">Template name
              <input name="name" defaultValue={template.name} maxLength={LIMITS.name} className="a-input mt-1" required />
            </label>
            <label className="a-label">Printed title
              <input name="title" defaultValue={c.title} maxLength={LIMITS.title} className="a-input mt-1" required />
            </label>
            <label className="a-label">Line under the title
              <input name="copyMarker" defaultValue={c.copyMarker} maxLength={LIMITS.line} className="a-input mt-1" />
            </label>
            <label className="a-label">Page footer note
              <input name="footerNote" defaultValue={c.footerNote} maxLength={LIMITS.line} className="a-input mt-1" />
            </label>
          </div>
        </section>

        <section className="a-card p-4">
          <h2 className="a-h2">Terms and declaration</h2>
          <div className="mt-3 flex flex-col gap-3">
            <label className="a-label">Terms heading
              <input name="termsHeading" defaultValue={c.termsHeading} maxLength={LIMITS.line} className="a-input mt-1" />
            </label>
            <label className="a-label">Terms, one per line (at most {LIMITS.terms})
              <textarea name="terms" defaultValue={c.terms.join("\n")} rows={4} className="a-input mt-1" />
            </label>
            <label className="a-label">Declaration heading
              <input name="declarationHeading" defaultValue={c.declarationHeading} maxLength={LIMITS.line} className="a-input mt-1" />
            </label>
            <label className="a-label">Declaration
              <textarea name="declaration" defaultValue={c.declaration} rows={3} maxLength={LIMITS.para} className="a-input mt-1" />
            </label>
          </div>
        </section>

        <section className="a-card p-4">
          <h2 className="a-h2">Payment and signature</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="a-label">Payment heading
              <input name="paymentHeading" defaultValue={c.paymentHeading} maxLength={LIMITS.line} className="a-input mt-1" />
            </label>
            <label className="a-label">Payment note
              <input name="paymentNote" defaultValue={c.paymentNote} maxLength={LIMITS.para} className="a-input mt-1" />
            </label>
            <label className="a-label">Signature block heading
              <input name="signatureFor" defaultValue={c.signatureFor} maxLength={LIMITS.line} className="a-input mt-1" />
            </label>
            <label className="a-label">Line under the signature
              <input name="signatureLine" defaultValue={c.signatureLine} maxLength={LIMITS.line} className="a-input mt-1" />
            </label>
          </div>
          <p className="mt-2 text-[0.8125rem]" style={{ color: "var(--a-faint)" }}>
            The name printed on the signature line comes from Invoice settings when one is set there.
          </p>
        </section>

        <div className="flex gap-2">
          <Button type="submit">Save wording</Button>
          <Link href="/admin/invoices/templates" className="a-btn">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
