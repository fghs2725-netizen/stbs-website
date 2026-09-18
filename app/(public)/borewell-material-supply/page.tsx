import type { Metadata } from "next";
import { Boxes } from "lucide-react";
import { ServiceDetailPage } from "@/components/public/service-detail-page";
import { absolutePath } from "@/lib/site-url";
export const metadata: Metadata = { title: "Borewell Material Supply", description: "Reliable borewell material supply.", alternates: { canonical: absolutePath("/borewell-material-supply") } };
export default function BorewellMaterialSupply() { return <ServiceDetailPage eyebrow="Material supply" title="Borewell Material Supply You Can Rely On" intro="Material support for borewell work, selected around fit, durability and the requirements of the planned installation." icon={Boxes} bullets={["Casing pipes suited to the bore diameter and depth", "Pump sets matched to the water table and usage", "Fittings and connectors for the installation", "Panels and control equipment as required"]}/>; }
