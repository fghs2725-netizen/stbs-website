import type { Metadata } from "next";
import { CloudRain } from "lucide-react";
import { ServiceDetailPage } from "@/components/public/service-detail-page";
import { pageMetadata } from "@/lib/page-metadata";
import { SEO } from "@/lib/website/seo-copy";
export const metadata: Metadata = pageMetadata({ ...SEO["rainwater-harvesting"], path: "/rainwater-harvesting", absoluteTitle: true });
export default function RainwaterHarvesting() { return <ServiceDetailPage eyebrow="Rainwater harvesting" title="Rainwater Harvesting & Groundwater Recharge" intro="Recharge systems planned to collect, filter and return rainwater to the ground responsibly." icon={CloudRain} bullets={["Site assessment and runoff planning", "Recharge pit and shaft design", "Filtration planning", "Borewell connection coordination"]} image="/services/rainwater-harvesting-recharge.webp" imageAlt="Precast concrete rings stacked beside an excavated recharge pit at a commercial site, with an excavator working behind"/>; }
