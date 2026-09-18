import type { Metadata } from "next";
import { CloudRain } from "lucide-react";
import { ServiceDetailPage } from "@/components/public/service-detail-page";
import { absolutePath } from "@/lib/site-url";
export const metadata: Metadata = { title: "Rainwater Harvesting", description: "Rainwater harvesting and groundwater recharge systems.", alternates: { canonical: absolutePath("/rainwater-harvesting") } };
export default function RainwaterHarvesting() { return <ServiceDetailPage eyebrow="Rainwater harvesting" title="Rainwater Harvesting & Groundwater Recharge" intro="Recharge systems planned to collect, filter and return rainwater to the ground responsibly." icon={CloudRain} bullets={["Site assessment and runoff planning", "Recharge pit and shaft design", "Filtration planning", "Borewell connection coordination"]}/>; }
