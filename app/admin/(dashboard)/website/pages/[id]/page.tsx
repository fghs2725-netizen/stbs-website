import { notFound } from "next/navigation";
import { PageEditor } from "@/components/admin/website/PageEditor";
import { getPageWithSections } from "@/lib/website/actions";
import type { WebsitePageWithSections } from "@/lib/website/action-types";

export const dynamic = "force-dynamic";

export default async function EditWebsitePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const page = (await getPageWithSections(id)) as unknown as WebsitePageWithSections | null;
  if (!page) notFound();
  return <PageEditor page={page} />;
}