import type { Metadata } from "next";
import { Drill } from "lucide-react";
import { ServiceDetailPage } from "@/components/public/service-detail-page";
import { absolutePath } from "@/lib/site-url";
export const metadata: Metadata = { title: "Borewell Drilling", description: "Borewell drilling planned around your site.", alternates: { canonical: absolutePath("/borewell-drilling") } };
export default function BorewellDrilling() { return <ServiceDetailPage eyebrow="Borewell drilling" title="Borewell Drilling, Planned Around Your Site" intro="Precision drilling for borewells in a range of diameters, planned around access, ground conditions and intended water use." icon={Drill} process specs={["Diameter: 100–400 mm"]} bullets={["Site visit and access planning", "Survey-led drilling approach", "Casing and aquifer isolation planning", "Installation coordination and handover"]}/>; }
