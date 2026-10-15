import type { Metadata } from "next";
import { Drill } from "lucide-react";
import { BorewellDiagram } from "@/components/public/diagrams";
import { ServiceDetailPage } from "@/components/public/service-detail-page";
import { pageMetadata } from "@/lib/page-metadata";
import { SEO } from "@/lib/website/seo-copy";
export const metadata: Metadata = pageMetadata({ ...SEO["borewell-drilling"], path: "/borewell-drilling", absoluteTitle: true });
export default function BorewellDrilling() { return <ServiceDetailPage slug="borewell-drilling" eyebrow="Borewell drilling" title="Borewell Drilling, Planned Around *Your Site*" intro="Precision drilling for borewells in a range of diameters, planned around access, ground conditions and intended water use." diagram={<BorewellDiagram />} diagramTitle="Inside a borewell" icon={Drill} process films={["drilling"]} specs={["Bore diameter: 150–300 mm (6\"–12\")", "uPVC casing: 100–500 mm, 10 kg/cm², ISI marked", "Rotary rigs and crews of our own", "Developed until the water runs clear and sand-free"]} bullets={["Ground survey up to 800 m before drilling", "Site visit and access planning", "Casing and aquifer isolation planning", "Installation coordination and handover"]} image="/services/borewell-rig-factory-site.webp" imageAlt="Crew handling drill pipe beside a truck-mounted drilling rig at a factory under construction"/>; }
