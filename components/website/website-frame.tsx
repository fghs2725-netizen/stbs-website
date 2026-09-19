import type { ReactNode } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { WhatsAppFloat } from "@/components/whatsapp-float";
import { DuotoneDefs } from "@/components/public/photo";
import type { CmsSettings } from "@/components/public/sections";

/**
 * Shared site composition used by BOTH the public website and the visual
 * website editor. Public renders it from (published) config; the editor renders
 * it with draft config. Keeping one composition guarantees the editor preview
 * matches the deployed site.
 */
export function WebsiteFrame({
  navLinks,
  settings,
  phone,
  children,
}: {
  navLinks: Array<{ label: string; href: string }>;
  settings: CmsSettings | null;
  phone: string;
  children: ReactNode;
}) {
  return (
    <div className="relative min-w-0 w-full overflow-x-clip">
      <DuotoneDefs />
      <SiteHeader
        navLinks={navLinks}
        businessName={settings?.businessName ?? undefined}
        logoUrl={settings?.primaryLogoUrl ?? settings?.lightLogoUrl ?? settings?.darkLogoUrl ?? settings?.logoUrl ?? undefined}
        mobileLogoUrl={settings?.mobileLogoUrl ?? undefined}
        phone={settings?.phone || phone || undefined}
      />
      <main className="min-w-0 w-full">{children}</main>
      <SiteFooter settings={settings} navLinks={navLinks} />
      <WhatsAppFloat phone={phone} />
    </div>
  );
}
