import { PageHeader } from "@/components/admin/PageHeader";
import { ClientsManager } from "@/components/admin/website/ClientsManager";
import { getWebsiteClients } from "@/lib/website/actions";
import type { SerializedClient } from "@/lib/website/action-types";

export const dynamic = "force-dynamic";

export default async function WebsiteClientsPage() {
  const clients = (await getWebsiteClients()) as unknown as SerializedClient[];
  return (
    <>
      <PageHeader
        eyebrow="Website CMS / Clients"
        title="Clients & logos"
        description="Self-hosted client logos used on the public site. Do not invent relationships — only add organisations you genuinely serve."
      />
      <ClientsManager clients={clients} />
    </>
  );
}