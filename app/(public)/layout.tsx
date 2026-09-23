import type { Metadata } from "next";
import { WebsiteFrame } from "@/components/website/website-frame";
import { getPublicSiteConfig } from "@/lib/website/public-config";
import { getPublicSeoMetadata } from "@/lib/website/seo";
import { buildLocalBusiness } from "@/lib/website/structured-data";

// Cached at the edge; publishing in the website editor revalidates at once, this is only the safety net.
export const revalidate = 86400;

export async function generateMetadata(): Promise<Metadata> {
  const [seo, { settings }] = await Promise.all([getPublicSeoMetadata(), getPublicSiteConfig()]);
  return settings?.faviconUrl ? { ...seo, icons: { icon: settings.faviconUrl } } : seo;
}

export default async function PublicLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { navLinks, settings, phone } = await getPublicSiteConfig();
  // "<" is escaped so structured data can never terminate the script element.
  const localBusiness = JSON.stringify(buildLocalBusiness()).replace(/</g, "\\u003c");
  return <WebsiteFrame navLinks={navLinks} settings={settings} phone={phone}><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: localBusiness }} />{children}</WebsiteFrame>;
}
