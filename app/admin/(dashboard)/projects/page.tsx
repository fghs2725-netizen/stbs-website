import Link from "next/link";
import { redirect } from "next/navigation";
import { Briefcase, Plus } from "lucide-react";
import { auth } from "@/auth";
import { PageHeader } from "@/components/admin/PageHeader";
import { EmptyState, Pill } from "@/components/admin/shell/ui";
import { ProjectRowActions } from "@/components/admin/projects/ProjectRowActions";
import { listProjects, type ProjectRow } from "@/lib/website-projects";

export const dynamic = "force-dynamic";

/**
 * The projects on the public site. Saving a project that is switched on puts it on the homepage
 * (the first three) and on /projects straight away, photos included.
 */
export default async function ProjectsAdminPage() {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

  let rows: ProjectRow[] = [];
  let error = "";
  try {
    rows = await listProjects();
  } catch {
    error = "The project list is unavailable right now. If this keeps happening, the database update for projects may not have been applied yet.";
  }
  const live = rows.filter((r) => r.published).length;
  const onHome = rows.filter((r) => r.featured).length;

  return (
    <div className="a-page">
      <PageHeader
        eyebrow="Website"
        title="Projects"
        description="Add the jobs you want customers to see. They appear on your Projects page as soon as you save, with their photos, and you choose up to three for the homepage."
        action={
          <div className="flex items-center gap-3">
            <span className="a-num a-sub hidden sm:inline">{live} live of {rows.length}</span>
            <Link href="/projects" target="_blank" rel="noopener noreferrer" className="a-btn a-btn-secondary">View on website</Link>
            <Link href="/admin/projects/new" className="a-btn a-btn-primary"><Plus size={16} aria-hidden /> Add project</Link>
          </div>
        }
      />

      {error ? (
        <div role="alert" className="a-card p-4 text-[0.9375rem]" style={{ color: "var(--a-danger)" }}>{error}</div>
      ) : rows.length === 0 ? (
        <EmptyState icon={Briefcase} title="No projects yet" description="Add your first project. Photos are optional." action={<Link href="/admin/projects/new" className="a-btn a-btn-primary">Add project</Link>} />
      ) : (
        <>
          <p className="a-sub text-[0.875rem]">{onHome > 0 ? `${onHome} of 3 places on the homepage are used. Use “Put on homepage” to choose which projects it shows; the arrows set the order.` : "No projects are chosen for the homepage yet, so it shows the first three. Use “Put on homepage” to choose; the arrows set the order."}</p>
          <ul className="space-y-3">
            {rows.map((p, i) => (
              <li key={p.id} className="a-card flex flex-col gap-4 p-4 sm:flex-row">
                <div className="h-24 w-full shrink-0 overflow-hidden rounded-lg bg-black/5 sm:w-36">
                  {p.photos[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.photos[0].url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[0.8125rem] a-sub">No photo</div>
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="a-title !text-[1.0625rem]">{p.title}</h2>
                    <Pill tone={p.published ? "positive" : "neutral"}>{p.published ? "On website" : "Draft"}</Pill>
                    {p.featured && <Pill tone="brand">On homepage</Pill>}
                  </div>
                  <p className="a-sub text-[0.875rem]">{p.location}{p.sector ? ` · ${p.sector}` : ""}{p.photos.length ? ` · ${p.photos.length} photo${p.photos.length === 1 ? "" : "s"}` : ""}</p>
                  <ProjectRowActions id={p.id} published={p.published} featured={p.featured} first={i === 0} last={i === rows.length - 1} />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
