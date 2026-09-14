import { PageHeader } from "@/components/admin/PageHeader";
import { ServiceForm } from "@/components/admin/website/ServiceForm";

export const dynamic = "force-dynamic";

export default function NewWebsiteService() {
  return (
    <>
      <PageHeader eyebrow="Website CMS / Services" title="New service" description="Add a service. It never appears publicly until you publish it." />
      <ServiceForm />
    </>
  );
}