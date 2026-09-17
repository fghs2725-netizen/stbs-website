import type { Metadata } from "next";
import { WebsiteFrame } from "@/components/website/website-frame";
import { getPublicSiteConfig } from "@/lib/website/public-config";
import { getPublicSeoMetadata } from "@/lib/website/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const [seo, { settings }] = await Promise.all([getPublicSeoMetadata(), getPublicSiteConfig()]);
  return settings?.faviconUrl ? { ...seo, icons: { icon: settings.faviconUrl } } : seo;
}

export default async function PublicLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { navLinks, settings, phone } = await getPublicSiteConfig();
  return (
    <WebsiteFrame navLinks={navLinks} settings={settings} phone={phone}>
      {children}
    </WebsiteFrame>
  );
}
