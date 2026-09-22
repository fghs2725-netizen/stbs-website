import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { FileText } from "lucide-react";
import { auth } from "@/auth";
import {
  archiveInvoiceTemplate, duplicateInvoiceTemplate, listInvoiceTemplates,
  restoreInvoiceTemplate, setDefaultInvoiceTemplate,
} from "@/lib/invoice-templates";
import { PageHeader } from "@/components/admin/PageHeader";
import { EmptyState, Pill } from "@/components/admin/shell/ui";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

const refresh = () => revalidatePath("/admin/invoices/templates");

/** Each action reports its own refusal rather than failing silently — the library explains why. */
async function run(fn: () => Promise<{ ok: true; data: unknown } | { ok: false; errors: string[] }>) {
  const result = await fn();
  refresh();
  if (!result.ok) redirect(`/admin/invoices/templates?error=${encodeURIComponent(result.errors[0])}`);
}

async function makeDefaultAction(id: string) { "use server"; await run(() => setDefaultInvoiceTemplate(id)); }
async function duplicateAction(id: string) { "use server"; await run(() => duplicateInvoiceTemplate(id)); }
async function archiveAction(id: string) { "use server"; await run(() => archiveInvoiceTemplate(id)); }
async function restoreAction(id: string) { "use server"; await run(() => restoreInvoiceTemplate(id)); }

export default async function InvoiceTemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

  const { error } = await searchParams;
  const templates = await listInvoiceTemplates();

  return (
    <div className="a-page">
      <PageHeader
        eyebrow="Invoice settings"
        title="Invoice templates"
        description="The wording each invoice prints. The design stays the same; only the words change."
        action={<Link href="/admin/invoices/settings" className="a-btn">Back to settings</Link>}
      />

      {error && <p role="alert" className="a-card p-4 text-[0.9375rem]" style={{ color: "var(--a-danger)" }}>{error}</p>}

      <p className="a-card p-4 text-[0.875rem]" style={{ color: "var(--a-body)" }}>
        An invoice keeps the wording it was issued with, so editing a template never rewrites one a
        client already holds. A proforma prints a different title and takes no number from the GST series.
      </p>

      <div className="a-card overflow-hidden">
        {templates.length === 0 ? (
          <EmptyState icon={FileText} title="No templates yet" description="They are created the first time this page is opened." />
        ) : (
          <ul className="a-divide">
            {templates.map((t) => (
              <li key={t.id} className="p-4 sm:px-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/admin/invoices/templates/${t.id}`} className="text-[0.9375rem] font-semibold" style={{ color: "var(--a-ink)" }}>
                    {t.name}
                  </Link>
                  {t.isDefault && <Pill tone="positive">Default</Pill>}
                  {t.isProforma && <Pill tone="brand">Proforma</Pill>}
                  {t.archived && <Pill tone="neutral">Archived</Pill>}
                </div>
                <p className="mt-[3px] text-[0.8125rem]" style={{ color: "var(--a-faint)" }}>
                  “{t.content.title}” · used by {t.invoiceCount} invoice{t.invoiceCount === 1 ? "" : "s"}
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button asChild size="sm"><Link href={`/admin/invoices/templates/${t.id}`}>Edit wording</Link></Button>
                  {!t.isDefault && !t.archived && !t.isProforma && (
                    <form action={makeDefaultAction.bind(null, t.id)}>
                      <Button type="submit" size="sm" variant="secondary">Make default</Button>
                    </form>
                  )}
                  <form action={duplicateAction.bind(null, t.id)}>
                    <Button type="submit" size="sm" variant="secondary">Duplicate</Button>
                  </form>
                  {t.archived ? (
                    <form action={restoreAction.bind(null, t.id)}>
                      <Button type="submit" size="sm" variant="secondary">Restore</Button>
                    </form>
                  ) : (
                    !t.isDefault && (
                      <form action={archiveAction.bind(null, t.id)}>
                        <Button type="submit" size="sm" variant="secondary">Archive</Button>
                      </form>
                    )
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
