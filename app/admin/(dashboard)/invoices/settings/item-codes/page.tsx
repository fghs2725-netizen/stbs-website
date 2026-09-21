import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Tags } from "lucide-react";
import { auth } from "@/auth";
import { deleteItemCode, listItemCodes, saveItemCode } from "@/lib/invoice-management";
import { PageHeader } from "@/components/admin/PageHeader";
import { EmptyState } from "@/components/admin/shell/ui";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

const HSN_HELP = "4, 6 or 8 digits. Your CA will have the right code for each thing you sell.";

async function addAction(formData: FormData) {
  "use server";
  const description = String(formData.get("description") ?? "");
  const hsn = String(formData.get("hsn") ?? "");
  const unit = String(formData.get("unit") ?? "");
  try {
    await saveItemCode(description, hsn, unit);
  } catch (e) {
    // The page re-renders with the list unchanged; the message below says what to fix.
    const code = e instanceof Error ? e.message : "UNKNOWN";
    redirect(`/admin/invoices/settings/item-codes?error=${encodeURIComponent(code)}`);
  }
  revalidatePath("/admin/invoices/settings/item-codes");
}

async function removeAction(id: string) {
  "use server";
  await deleteItemCode(id);
  revalidatePath("/admin/invoices/settings/item-codes");
}

const MESSAGES: Record<string, string> = {
  DESCRIPTION_REQUIRED: "Give the item name.",
  INVALID_HSN: `That is not a valid code. ${HSN_HELP}`,
};

export default async function ItemCodesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; error?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

  const { q = "", error } = await searchParams;
  const codes = await listItemCodes(q);

  return (
    <div className="a-page">
      <PageHeader
        eyebrow="Invoice settings"
        title="HSN and SAC codes"
        description="The code for each thing you sell, typed once and then filled in automatically."
        action={<span className="hidden lg:block"><Link href="/admin/invoices/settings" className="a-btn">Back to settings</Link></span>}
      />

      <p className="a-card p-4 text-[0.875rem]" style={{ color: "var(--a-body)" }}>
        When an item name here matches one on an invoice, its code is filled in for you — including on
        invoices raised from a quotation. A code you have already typed on an invoice is never overwritten.
      </p>

      {error && (
        <p role="alert" className="a-card p-4 text-[0.9375rem]" style={{ color: "var(--a-danger)" }}>
          {MESSAGES[error] ?? "That could not be saved."}
        </p>
      )}

      <form action={addAction} className="a-card flex flex-wrap items-end gap-3 p-4">
        <label className="a-label min-w-[220px] flex-1">Item name
          <input name="description" className="a-input mt-1" placeholder="Submersible pump set 5 HP" required />
        </label>
        <label className="a-label w-40">HSN / SAC
          <input name="hsn" className="a-input mt-1" placeholder="8413" required />
        </label>
        <label className="a-label w-32">Unit
          <input name="unit" className="a-input mt-1" placeholder="Nos" />
        </label>
        <Button type="submit">Save code</Button>
      </form>
      <p className="text-[0.8125rem]" style={{ color: "var(--a-faint)" }}>{HSN_HELP}</p>

      <form action="/admin/invoices/settings/item-codes" method="GET" role="search" className="flex gap-2">
        <input name="q" defaultValue={q} placeholder="Search item names" className="a-input a-input-search" />
        <Button type="submit" variant="secondary">Search</Button>
      </form>

      <div className="a-card overflow-hidden">
        {codes.length === 0 ? (
          <EmptyState
            icon={Tags}
            title={q ? "No matches" : "No codes saved yet"}
            description={
              q
                ? "No saved item name matches that search."
                : "Add the codes for the things you bill most often: drilling, pumps, casing pipe, cable, panels, gravel and labour."
            }
            action={q ? <Link href="/admin/invoices/settings/item-codes" className="a-btn a-btn-primary a-btn-sm">Clear search</Link> : undefined}
          />
        ) : (
          <ul className="a-divide">
            {codes.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 p-4 sm:px-5">
                <div className="min-w-0">
                  <p className="truncate text-[0.9375rem]" style={{ color: "var(--a-ink)" }}>{c.description}</p>
                  <p className="a-num text-[0.8125rem]" style={{ color: "var(--a-faint)" }}>
                    {c.hsn}{c.unit ? ` · ${c.unit}` : ""}
                  </p>
                </div>
                <form action={removeAction.bind(null, c.id)}>
                  <Button type="submit" size="sm" variant="secondary">Remove</Button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
