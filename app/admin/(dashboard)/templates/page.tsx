import Link from "next/link";
import { redirect } from "next/navigation";
import { LayoutTemplate } from "lucide-react";
import { auth } from "@/auth";
import { listTemplates, type TemplateRow } from "@/lib/quotation-templates";
import { TEMPLATE_LAYOUTS } from "@/components/quotation/template/template-model";
import { QuotationDocument } from "@/components/quotation/QuotationDocument";
import { sampleQuotation } from "@/components/admin/templates/sample";
import { MakeDefaultButton } from "@/components/admin/templates/MakeDefaultButton";
import { PageHeader } from "@/components/admin/PageHeader";
import { EmptyState } from "@/components/admin/shell/ui";
import "@/components/admin/templates/template-preview.css";

export const dynamic = "force-dynamic";

const layoutLabel = (key: string) => TEMPLATE_LAYOUTS.find((l) => l.key === key)?.label ?? key;
const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

function Card({ t }: { t: TemplateRow }) {
  return (
    <li className="a-card flex flex-col gap-4 p-4 sm:flex-row sm:p-5">
      <Link href={`/admin/templates/${t.id}`} className="tpl-thumb-link self-start" aria-label={`Open ${t.name}`}>
        <div className="tpl-thumb" aria-hidden="true">
          <div className="tpl-thumb-inner"><QuotationDocument quotation={sampleQuotation(t.content, t.layout, false)} /></div>
        </div>
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="a-h2 truncate"><Link href={`/admin/templates/${t.id}`}>{t.name}</Link></h2>
          {t.isDefault && <span className="a-pill a-pill-brand">Default</span>}
          {t.archived && <span className="a-pill a-pill-neutral">Archived</span>}
        </div>
        <p className="a-sub mt-1">{layoutLabel(t.layout)} design · {t.content.terms.length} terms · updated {day(t.updatedAt)}</p>
        <p className="a-num mt-1 text-[0.8125rem]" style={{ color: "var(--a-faint)" }}>
          {t.quotationCount === 0 ? "Not used by any quotation yet" : `Used by ${t.quotationCount} ${t.quotationCount === 1 ? "quotation" : "quotations"}`}
        </p>
        <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
          <Link href={`/admin/templates/${t.id}`} className="a-btn a-btn-primary a-btn-sm">Edit and preview</Link>
          {!t.isDefault && !t.archived && <MakeDefaultButton id={t.id} name={t.name} />}
        </div>
      </div>
    </li>
  );
}

export default async function TemplatesPage() {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

  let rows: TemplateRow[] = [];
  let error = "";
  try {
    rows = await listTemplates();
  } catch {
    error = "Templates are unavailable right now.";
  }
  const active = rows.filter((t) => !t.archived);
  const archived = rows.filter((t) => t.archived);

  return (
    <div className="a-page">
      <PageHeader
        eyebrow="Setup"
        title="Quotation templates"
        description="The wording of your quotations: cover letter, company profile and terms. The default is used for every new quotation, and you can switch template on any draft."
      />

      {error ? (
        <div role="alert" className="a-card p-4 text-[0.9375rem]" style={{ color: "var(--a-danger)" }}>{error}</div>
      ) : rows.length === 0 ? (
        <div className="a-card"><EmptyState icon={LayoutTemplate} title="No templates yet" description="Reload this page to create your first one." /></div>
      ) : (
        <>
          <ul className="space-y-4">{active.map((t) => <Card key={t.id} t={t} />)}</ul>
          {archived.length > 0 && (
            <section aria-labelledby="archived-heading" className="space-y-3">
              <h2 id="archived-heading" className="a-eyebrow">Archived</h2>
              <ul className="space-y-4">{archived.map((t) => <Card key={t.id} t={t} />)}</ul>
            </section>
          )}
          <p className="a-sub">To add another template, open one and choose Duplicate. Finalised quotations always keep the wording they were sent with.</p>
        </>
      )}
    </div>
  );
}
