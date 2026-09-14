import { PageHeader } from "@/components/admin/PageHeader";
import { SettingsPage } from "@/components/admin/website/SettingsPage";
import { getWebsiteSettings } from "@/lib/website/actions";
import type { SerializedWebsiteSettings } from "@/lib/website/action-types";

export const dynamic = "force-dynamic";

export default async function WebsiteSettingsRoute() {
  const settings = (await getWebsiteSettings()) as unknown as SerializedWebsiteSettings;
  return (
    <>
      <PageHeader
        eyebrow="Website CMS / Settings"
        title="Global settings"
        description="Business information, contact details, logos and the content shown in the footer. Never invent information — leave fields blank and mark them “Not configured” until you provide the exact details."
      />
      <SettingsPage initial={settings} />
    </>
  );
}