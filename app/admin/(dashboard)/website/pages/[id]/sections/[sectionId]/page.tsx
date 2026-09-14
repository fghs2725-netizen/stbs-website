import { notFound } from "next/navigation";
import { SectionEditor } from "@/components/admin/website/SectionEditor";
import { getPageWithSections } from "@/lib/website/actions";
import type { WebsitePageWithSections } from "@/lib/website/action-types";

export const dynamic = "force-dynamic";

export default async function EditWebsiteSection({ params }: { params: Promise<{ id: string; sectionId: string }> }) {
  const { id, sectionId } = await params;
  const page = (await getPageWithSections(id)) as unknown as WebsitePageWithSections | null;
  if (!page) notFound();
  const section = page.sections?.find((s) => s.id === sectionId);
  if (!section) notFound();
  return <SectionEditor page={page} section={section} />;
}