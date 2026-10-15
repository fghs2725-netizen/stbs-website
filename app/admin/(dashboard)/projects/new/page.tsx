import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PageHeader } from "@/components/admin/PageHeader";
import { ProjectForm } from "@/components/admin/projects/ProjectForm";

export const dynamic = "force-dynamic";

export default async function NewProjectPage() {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");
  return (
    <div className="a-page">
      <PageHeader eyebrow="Projects" title="Add a project" description="Fill in what you know; only the title and location are needed." action={<Link href="/admin/projects" className="a-btn a-btn-secondary">Back to projects</Link>} />
      <ProjectForm />
    </div>
  );
}
