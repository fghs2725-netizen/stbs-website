import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/admin/PageHeader";

export const dynamic = "force-dynamic";

export default async function QuotationPresetsPage() {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

  const presets = await prisma.quotationPreset.findMany({
    where: { archived: false },
    orderBy: { position: "asc" },
    include: { _count: { select: { items: true, fields: true } } },
  });

  return (
    <div className="a-page">
      <PageHeader
        eyebrow="Quotations"
        title="Quotation presets"
        description="The jobs you quote over and over. Picking one on a new quotation writes its items for you."
        action={<Link href="/admin/quotations" className="a-btn">All quotations</Link>}
      />

      {presets.length === 0 ? (
        <div className="a-card p-4">
          <p className="a-sub">No presets yet. They are created by the seed script.</p>
        </div>
      ) : (
        <ul className="a-divide">
          {presets.map((p) => (
            <li key={p.id} className="a-card mt-3 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="a-h2 truncate">
                    <Link href={`/admin/quotations/presets/${p.id}`}>{p.name}</Link>
                  </h2>
                  <p className="a-sub mt-1 text-[0.875rem]">
                    {p._count.items} items · {p._count.fields} questions
                  </p>
                </div>
                <Link href={`/admin/quotations/presets/${p.id}`} className="a-btn a-btn-primary a-btn-sm">
                  Edit wording
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
