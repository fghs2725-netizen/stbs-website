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
  const localBusiness = { "@context": "https://schema.org", "@type": "HomeAndConstructionBusiness", name: "Saini Tubewell Boring Service", image: "https://stbs.in/logo.png", telephone: ["+919812003001", "+917988024114"], email: "stbs2025@gmail.com", areaServed: ["Sonipat", "Panipat", "Kundli", "Rohtak", "Haryana", "Delhi NCR"], foundingDate: "1992", url: "https://stbs.in", openingHours: "Mo-Sa 08:00-19:00" };
  return <WebsiteFrame navLinks={navLinks} settings={settings} phone={phone}><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusiness) }} />{children}</WebsiteFrame>;
}
