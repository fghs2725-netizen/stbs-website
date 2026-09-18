import type { Metadata } from "next";
import { Construction } from "lucide-react";
import { ServiceDetailPage } from "@/components/public/service-detail-page";
import { absolutePath } from "@/lib/site-url";
export const metadata: Metadata = { title: "Tubewell Construction", description: "End-to-end tubewell construction.", alternates: { canonical: absolutePath("/tubewell-construction") } };
export default function TubewellConstruction() { return <ServiceDetailPage eyebrow="Tubewell construction" title="End-to-End Tubewell Construction" intro="A coordinated construction service from site planning to installation, testing and practical handover." icon={Construction} process segments={["Residential properties", "Agricultural sites", "Commercial and industrial facilities"]} bullets={["Requirement and site coordination", "Drilling and material planning", "Pump, piping and panel installation", "Testing, cleanup and handover"]}/>; }
