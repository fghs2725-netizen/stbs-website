import type { Metadata } from "next";
import { CloudRain } from "lucide-react";
import { RechargeDiagram } from "@/components/public/diagrams";
import { ServiceDetailPage } from "@/components/public/service-detail-page";
import { pageMetadata } from "@/lib/page-metadata";
import { SEO } from "@/lib/website/seo-copy";
export const metadata: Metadata = pageMetadata({ ...SEO["rainwater-harvesting"], path: "/rainwater-harvesting", absoluteTitle: true });
export default function RainwaterHarvesting() { return <ServiceDetailPage slug="rainwater-harvesting" eyebrow="Rainwater harvesting" title="Rainwater Harvesting & *Groundwater Recharge*" intro="Recharge systems planned to collect, filter and return rainwater to the ground responsibly." diagram={<RechargeDiagram />} diagramTitle="How recharge works" icon={CloudRain} bullets={["Site assessment and runoff planning", "Recharge bores with slotted pipe and gravel pack", "RCC recharge chambers with cover slab and overflow", "Silt and filter chambers"]} image="/services/rainwater-harvesting-recharge.webp" imageAlt="Precast concrete rings stacked beside an excavated recharge pit at a commercial site, with an excavator working behind"/>; }
