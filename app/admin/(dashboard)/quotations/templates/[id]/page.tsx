import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { getTemplate } from "@/lib/quotation-templates";
import { TemplateEditor } from "@/components/admin/templates/TemplateEditor";

export const dynamic = "force-dynamic";

export default async function TemplateEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");
  const template = await getTemplate((await params).id);
  if (!template) notFound();
  // keyed by id so opening another template (e.g. after Duplicate) starts a fresh editor, not stale state
  return <TemplateEditor key={template.id} template={template} />;
}
