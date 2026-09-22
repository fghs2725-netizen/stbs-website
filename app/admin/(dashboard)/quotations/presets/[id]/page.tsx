import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/admin/PageHeader";
import { Button } from "@/components/ui/button";
import {
  addItemAction, deleteItemAction, moveItemAction, saveFieldAction, saveItemAction,
} from "../actions";

export const dynamic = "force-dynamic";

export default async function QuotationPresetPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

  const { id } = await params;
  const preset = await prisma.quotationPreset.findUnique({
    where: { id },
    include: {
      fields: { orderBy: { position: "asc" } },
      items: { orderBy: { position: "asc" } },
    },
  });
  if (!preset) notFound();

  return (
    <div className="a-page">
      <PageHeader
        eyebrow="Quotation presets"
        title={preset.name}
        description="Write {boreDia} into a line and it becomes a question. A line with no braces is asked about by nobody."
        action={<Link href="/admin/quotations/presets" className="a-btn">All presets</Link>}
      />

      <section className="a-card p-4">
        <h2 className="a-h2">Questions</h2>
        <p className="a-sub mt-1 text-[0.875rem]">One choice per line. Only questions a line actually uses get asked.</p>
        <div className="mt-3 flex flex-col gap-4">
          {preset.fields.map((f) => (
            <form key={f.id} action={saveFieldAction.bind(null, preset.id)} className="rounded-[10px] border p-3" style={{ borderColor: "var(--a-hairline)" }}>
              <input type="hidden" name="id" value={f.id} />
              <div className="flex flex-wrap items-center gap-3">
                <code className="a-num text-[0.8125rem]" style={{ color: "var(--a-faint)" }}>{`{${f.key}}`}</code>
                <label className="a-label flex-1">Question
                  <input name="label" defaultValue={f.label} className="a-input mt-1" />
                </label>
              </div>
              <label className="a-label mt-3 block">Choices
                <textarea
                  name="options" rows={4} className="a-input mt-1"
                  defaultValue={(Array.isArray(f.options) ? (f.options as string[]) : []).join("\n")}
                />
              </label>
              <div className="mt-3 flex items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-[0.875rem]" style={{ color: "var(--a-ink)" }}>
                  <input type="checkbox" name="allowCustom" defaultChecked={f.allowCustom} /> Allow a typed-in value
                </label>
                <Button type="submit" size="sm">Save question</Button>
              </div>
            </form>
          ))}
        </div>
      </section>

      <section className="a-card p-4">
        <h2 className="a-h2">Items</h2>
        <ul className="a-divide mt-3">
          {preset.items.map((item, n) => (
            <li key={item.id} className="py-3 first:pt-0">
              <form action={saveItemAction.bind(null, preset.id)} className="flex flex-wrap items-start gap-2">
                <input type="hidden" name="id" value={item.id} />
                <span className="a-num pt-3 text-[0.8125rem]" style={{ color: "var(--a-faint)" }}>{n + 1}</span>
                <label className="a-label min-w-[240px] flex-1">Description
                  <textarea name="description" rows={2} defaultValue={item.description} className="a-input mt-1" />
                </label>
                <label className="a-label w-24">Unit
                  <input name="unit" defaultValue={item.unit} className="a-input mt-1" />
                </label>
                <div className="flex flex-col items-end gap-2 pt-5">
                  <span className="a-num text-[0.8125rem]" style={{ color: "var(--a-faint)" }}>
                    {item.lastRate === null ? "no rate yet" : `last ₹${Number(item.lastRate).toLocaleString("en-IN")}`}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button type="submit" size="sm" variant="secondary">Save</Button>
                  </div>
                </div>
              </form>
              <div className="mt-1 flex justify-end gap-1">
                <form action={moveItemAction.bind(null, preset.id, item.id, -1)}>
                  <button type="submit" aria-label="Move up" className="a-link"><ChevronUp className="size-4" /></button>
                </form>
                <form action={moveItemAction.bind(null, preset.id, item.id, 1)}>
                  <button type="submit" aria-label="Move down" className="a-link"><ChevronDown className="size-4" /></button>
                </form>
                <form action={deleteItemAction.bind(null, preset.id, item.id)}>
                  <button type="submit" aria-label="Remove item" className="a-link"><Trash2 className="size-4" /></button>
                </form>
              </div>
            </li>
          ))}
        </ul>
        <form action={addItemAction.bind(null, preset.id)} className="mt-3">
          <Button type="submit" size="sm" variant="secondary">Add item</Button>
        </form>
      </section>
    </div>
  );
}
