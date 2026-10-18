import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HomePage } from "@/components/home-page";
import { SiteHeader } from "@/components/site-header";
import { PRIMARY_WEBSITE_PHONE } from "@/lib/website/business-contact";

// Development-only preview of the static homepage fallback (the final seven-section
// composition) under the real navbar. 404s in production.
export const metadata: Metadata = { title: "Homepage preview", robots: { index: false, follow: false } };

export default function HomePreview() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <div className="relative min-w-0 w-full overflow-x-clip">
      <SiteHeader phone={PRIMARY_WEBSITE_PHONE} businessName="Saini Tubewell Boring Service" />
      <main>
        <HomePage />
      </main>
    </div>
  );
}
