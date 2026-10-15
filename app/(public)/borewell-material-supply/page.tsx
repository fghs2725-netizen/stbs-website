import type { Metadata } from "next";
import { Boxes } from "lucide-react";
import { ServiceDetailPage } from "@/components/public/service-detail-page";
import { pageMetadata } from "@/lib/page-metadata";
import { SEO } from "@/lib/website/seo-copy";
export const metadata: Metadata = pageMetadata({ ...SEO["borewell-material-supply"], path: "/borewell-material-supply", absoluteTitle: true });
export default function BorewellMaterialSupply() { return <ServiceDetailPage eyebrow="Material supply" title="Borewell Material Supply You Can Rely On" intro="Material support for borewell work, selected around fit, durability and the requirements of the planned installation." icon={Boxes} films={["materials"]} specsTitle="Ranges & brands" specs={["uPVC casing 100–500 mm: Supreme, Kisan, Jindal, Reliance & others", "SS submersible pumps 1–50 HP: CRI, Crompton, Field Marshal & others", "Submersible cable 2.5–6 sq mm: Finolex, Polycab & others", "HDPE delivery pipe 1\"–3\" · automatic starter panels: L&T, Bentex & others"]} bullets={["uPVC casing and slotted filter pipes", "Stainless-steel submersible pump sets", "HDPE delivery pipes and 3-core copper cable", "Starter panels, well-head fittings and filter gravel"]} image="/services/material-supply-yard-stock.webp" imageAlt="uPVC and steel casing pipes, a submersible cable drum and a row of submersible pumps in a supply yard"/>; }
