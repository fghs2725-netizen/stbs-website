import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { Button } from "@/components/ui/button";
import { ServicesList } from "@/components/admin/website/ServicesList";
import { getServices } from "@/lib/website/actions";
import type { SerializedService } from "@/lib/website/action-types";

export const dynamic = "force-dynamic";

export default async function WebsiteServicesPage() {
  let services: SerializedService[] = [];
  let error: string | null = null;
  try {
    services = (await getServices()) as unknown as SerializedService[];
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load services";
  }

  return (
    <>
      <PageHeader
        eyebrow="Website CMS / Services"
        title="Services"
        description="Borewell drilling, rainwater harvesting, material supply and tubewell construction, plus any services you add."
        action={
          <div className="flex gap-2">
            <Button asChild variant="secondary"><Link href="/services" target="_blank">View on site</Link></Button>
            <Button asChild><Link href="/admin/website/services/new"><Plus size={16} /> New service</Link></Button>
          </div>
        }
      />
      {error && <div className="admin-card p-6 text-sm text-red-400">{error}</div>}
      <ServicesList services={services} />
    </>
  );
}