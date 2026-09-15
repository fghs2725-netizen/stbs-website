import type { ReactNode } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { WhatsAppFloat } from "@/components/whatsapp-float";
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
    <>
      <SiteHeader navLinks={navLinks} businessName={settings?.businessName ?? undefined} />
      <main>{children}</main>
      <SiteFooter settings={settings} navLinks={navLinks} />
      <WhatsAppFloat phone={phone} />
    </>
  );
}