import type { Metadata } from "next";
import { Construction } from "lucide-react";
import { TubewellDiagram } from "@/components/public/diagrams";
import { ServiceDetailPage } from "@/components/public/service-detail-page";
import { pageMetadata } from "@/lib/page-metadata";
import { SEO } from "@/lib/website/seo-copy";
export const metadata: Metadata = pageMetadata({ ...SEO["tubewell-construction"], path: "/tubewell-construction", absoluteTitle: true });
export default function TubewellConstruction() { return <ServiceDetailPage slug="tubewell-construction" eyebrow="Tubewell construction" title="End-to-End *Tubewell* Construction" intro="A coordinated construction service from site planning to installation, testing and practical handover." diagram={<TubewellDiagram />} diagramTitle="Inside a tubewell" icon={Construction} process films={["tubewell"]} segments={["Residential properties", "Agricultural sites", "Commercial and industrial facilities"]} bullets={["Requirement and site coordination", "Casing, slotted filter pipe and gravel pack", "Stainless-steel submersible pump, HDPE rising main, cable and starter panel", "Well-head assembly, testing, cleanup and handover"]} image="/services/tubewell-rig-pipes.webp" imageAlt="A worker carrying white uPVC casing pipe past a drilling rig at an industrial site"/>; }
