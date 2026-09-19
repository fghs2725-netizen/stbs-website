import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HomePage } from "@/components/home-page";
import { SiteHeader } from "@/components/site-header";
import { DuotoneDefs } from "@/components/public/photo";

// Development-only preview of the static homepage fallback (the final seven-section
// composition) under the real navbar. 404s in production.
export const metadata: Metadata = { title: "Homepage preview", robots: { index: false, follow: false } };

export default function HomePreview() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <div className="relative min-w-0 w-full overflow-x-clip">
      <DuotoneDefs />
      <SiteHeader phone="9812003001" businessName="Saini Tubewell Boring Service" />
      <main>
        <HomePage />
      </main>
    </div>
  );
}
