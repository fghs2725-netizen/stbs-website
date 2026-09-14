import { notFound } from "next/navigation";
import { PageHeader } from "@/components/admin/PageHeader";
import { ServiceForm } from "@/components/admin/website/ServiceForm";
import { getService } from "@/lib/website/actions";
import type { SerializedService } from "@/lib/website/action-types";

export const dynamic = "force-dynamic";

export default async function EditWebsiteService({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const service = (await getService(id)) as unknown as SerializedService | null;
  if (!service) notFound();
  return (
    <>
      <PageHeader eyebrow="Website CMS / Services" title={service.title} description="Edit service details, then save and publish." />
      <ServiceForm initial={service} />
    </>
  );
}