import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { PageHeader } from "@/components/admin/PageHeader";
import { ProjectForm } from "@/components/admin/projects/ProjectForm";
import { getProject } from "@/lib/website-projects";

export const dynamic = "force-dynamic";

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");
  const project = await getProject((await params).id);
  if (!project) notFound();
  return (
    <div className="a-page">
      <PageHeader eyebrow="Projects" title="Edit project" description="Changes go live as soon as you save, if the project is shown on the website." action={<Link href="/admin/projects" className="a-btn a-btn-secondary">Back to projects</Link>} />
      <ProjectForm key={project.id} project={project} />
    </div>
  );
}
