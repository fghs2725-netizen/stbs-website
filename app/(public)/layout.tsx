import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { WhatsAppFloat } from "@/components/whatsapp-float";
import { getPublicSiteConfig } from "@/lib/website/public-config";
import { getPublicSeoMetadata } from "@/lib/website/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return getPublicSeoMetadata();
}

export default async function PublicLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { navLinks, settings, phone } = await getPublicSiteConfig();
  return (
    <>
      <SiteHeader navLinks={navLinks} businessName={settings.businessName ?? undefined} />
      <main>{children}</main>
      <SiteFooter settings={settings} navLinks={navLinks} />
      <WhatsAppFloat phone={phone} />
    </>
  );
}