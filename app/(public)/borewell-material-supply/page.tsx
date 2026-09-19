import type { Metadata } from "next";
import { Boxes } from "lucide-react";
import { ServiceDetailPage } from "@/components/public/service-detail-page";
import { pageMetadata } from "@/lib/page-metadata";
import { SEO } from "@/lib/website/seo-copy";
export const metadata: Metadata = pageMetadata({ ...SEO["borewell-material-supply"], path: "/borewell-material-supply", absoluteTitle: true });
export default function BorewellMaterialSupply() { return <ServiceDetailPage eyebrow="Material supply" title="Borewell Material Supply You Can Rely On" intro="Material support for borewell work, selected around fit, durability and the requirements of the planned installation." icon={Boxes} bullets={["Casing pipes suited to the bore diameter and depth", "Pump sets matched to the water table and usage", "Fittings and connectors for the installation", "Panels and control equipment as required"]}/>; }
