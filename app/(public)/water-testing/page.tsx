import type { Metadata } from "next";
import { ScanSearch } from "lucide-react";
import { SurveyDiagram } from "@/components/public/diagrams";
import { ServiceDetailPage } from "@/components/public/service-detail-page";
import { pageMetadata } from "@/lib/page-metadata";
import { SEO } from "@/lib/website/seo-copy";
export const metadata: Metadata = pageMetadata({ ...SEO["water-testing"], path: "/water-testing", absoluteTitle: true });
export default function WaterTesting() { return <ServiceDetailPage slug="water-testing" eyebrow="Water testing" title="Groundwater Survey & *Water Testing*" intro="A ground survey up to 800 m before the bore is drilled, and yield and water-quality tests after it is built." diagram={<SurveyDiagram />} diagramTitle="How the survey works" icon={ScanSearch} specsTitle="What you receive" specs={["Survey reach: up to 800 m", "Water-bearing zones located", "Recommended drilling point and depth", "Yield, water level and quality results"]} bullets={["Electrical ground survey down to 800 m", "Drilling point and depth fixed before drilling", "Written survey report with the recommendation", "Yield and water-level test after drilling", "Water-quality check (key parameters such as TDS and pH)"]} image="/services/water-testing-survey.webp" imageAlt="A surveyor with a resistivity meter and electrodes laid along a field, explaining the survey to a farmer"/>; }
