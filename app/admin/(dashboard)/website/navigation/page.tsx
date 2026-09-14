import { PageHeader } from "@/components/admin/PageHeader";
import { NavigationManager } from "@/components/admin/website/NavigationManager";
import { getNavItems } from "@/lib/website/actions";
import type { SerializedNavItem } from "@/lib/website/action-types";

export const dynamic = "force-dynamic";

export default async function WebsiteNavigationPage() {
  const items = (await getNavItems()) as unknown as SerializedNavItem[];
  return (
    <>
      <PageHeader
        eyebrow="Website CMS / Navigation"
        title="Navigation"
        description="Public navigation for the website. The Admin link in the main menu stays unless you remove it here."
      />
      <NavigationManager items={items} />
    </>
  );
}