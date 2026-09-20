import type { Metadata } from "next";
import { Construction } from "lucide-react";
import { ServiceDetailPage } from "@/components/public/service-detail-page";
import { pageMetadata } from "@/lib/page-metadata";
import { SEO } from "@/lib/website/seo-copy";
export const metadata: Metadata = pageMetadata({ ...SEO["tubewell-construction"], path: "/tubewell-construction", absoluteTitle: true });
export default function TubewellConstruction() { return <ServiceDetailPage eyebrow="Tubewell construction" title="End-to-End Tubewell Construction" intro="A coordinated construction service from site planning to installation, testing and practical handover." icon={Construction} process segments={["Residential properties", "Agricultural sites", "Commercial and industrial facilities"]} bullets={["Requirement and site coordination", "Drilling and material planning", "Pump, piping and panel installation", "Testing, cleanup and handover"]} image="/services/tubewell-yield-discharge.webp" imageAlt="Water discharging from a commissioned tubewell outlet pipe into a drainage channel on a paved industrial yard"/>; }
