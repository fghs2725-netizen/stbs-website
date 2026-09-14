import Link from "next/link";
import { Plus, Eye, FileText, Pencil } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { Button } from "@/components/ui/button";
import { getPages } from "@/lib/website/actions";

export const dynamic = "force-dynamic";

export default async function WebsitePagesPage() {
  let pages: Awaited<ReturnType<typeof getPages>> = [];
  let error: string | null = null;
  try {
    pages = await getPages();
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load pages";
  }

  return (
    <>
      <PageHeader
        eyebrow="Website CMS / Pages"
        title="Pages"
        description="Every public page. Each page is Draft until you Publish it — drafts never change the live site."
        action={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="secondary">
              <Link href="/" target="_blank"><Eye size={16} /> View site</Link>
            </Button>
            <Button asChild>
              <Link href="/admin/website/pages/new"><Plus size={16} /> New page</Link>
            </Button>
          </div>
        }
      />

      {error && <div className="admin-card p-6 text-sm text-red-400">{error}</div>}

      <div className="admin-card overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/[.08] text-xs uppercase tracking-wider text-zinc-500">
              <th className="px-5 py-3.5 font-medium">Page</th>
              <th className="px-5 py-3.5 font-medium">Status</th>
              <th className="px-5 py-3.5 font-medium">Sections</th>
              <th className="px-5 py-3.5 font-medium">In navigation</th>
              <th className="px-5 py-3.5 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pages.map((page) => (
              <tr key={page.id} className="border-b border-white/[.05] last:border-0 hover:bg-white/[.02]">
                <td className="px-5 py-4">
                  <p className="font-semibold text-white">{page.name}</p>
                  <p className="mt-0.5 text-xs text-zinc-500">/{page.slug}</p>
                </td>
                <td className="px-5 py-4">
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${
                    page.status === "PUBLISHED" ? "bg-emerald-500/15 text-emerald-400" : "bg-zinc-500/15 text-zinc-400"
                  }`}>
                    {page.status.toLowerCase()}
                  </span>
                </td>
                <td className="px-5 py-4 text-zinc-300">{page._count.sections}</td>
                <td className="px-5 py-4 text-zinc-300">{page.hideFromNav ? "Hidden" : "Visible"}</td>
                <td className="px-5 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <Button asChild size="sm" variant="ghost">
                      <Link href={`/admin/website/pages/${page.id}`}><Pencil size={14} /> Edit</Link>
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {pages.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-zinc-500">
                  <FileText size={28} className="mx-auto mb-3 opacity-50" />
                  No pages yet. Create your first page to begin.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}