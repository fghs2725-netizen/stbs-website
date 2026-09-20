import type { Metadata } from "next";
import { Drill } from "lucide-react";
import { ServiceDetailPage } from "@/components/public/service-detail-page";
import { pageMetadata } from "@/lib/page-metadata";
import { SEO } from "@/lib/website/seo-copy";
export const metadata: Metadata = pageMetadata({ ...SEO["borewell-drilling"], path: "/borewell-drilling", absoluteTitle: true });
export default function BorewellDrilling() { return <ServiceDetailPage eyebrow="Borewell drilling" title="Borewell Drilling, Planned Around Your Site" intro="Precision drilling for borewells in a range of diameters, planned around access, ground conditions and intended water use." icon={Drill} process specs={["Diameter: 100–400 mm"]} bullets={["Site visit and access planning", "Survey-led drilling approach", "Casing and aquifer isolation planning", "Installation coordination and handover"]} image="/services/borewell-drilling-rods.webp" imageAlt="Two workers in hard hats and hi-vis vests threading a drill rod into the borehole at a rig, casing pipes on trestles beside them"/>; }
