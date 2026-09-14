import { PageHeader } from "@/components/admin/PageHeader";
import { NewPageForm } from "@/components/admin/website/NewPageForm";

export const dynamic = "force-dynamic";

export default function NewWebsitePage() {
  return (
    <>
      <PageHeader eyebrow="Website CMS / Pages" title="New page" description="Create a page, then add sections to it." />
      <NewPageForm />
    </>
  );
}