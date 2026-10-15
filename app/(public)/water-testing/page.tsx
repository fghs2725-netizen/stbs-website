import type { Metadata } from "next";
import { ScanSearch } from "lucide-react";
import { ServiceDetailPage } from "@/components/public/service-detail-page";
import { pageMetadata } from "@/lib/page-metadata";
import { SEO } from "@/lib/website/seo-copy";
export const metadata: Metadata = pageMetadata({ ...SEO["water-testing"], path: "/water-testing", absoluteTitle: true });
export default function WaterTesting() { return <ServiceDetailPage eyebrow="Water testing" title="Know the Ground Before You Drill" intro="A ground survey up to 800 m before the bore is drilled, and yield and water-quality tests after it is built." icon={ScanSearch} films={["context", "testing"]} specsTitle="What you receive" specs={["Survey reach: up to 800 m", "Water-bearing zones located", "Recommended drilling point and depth", "Yield, water level and quality results"]} bullets={["Electrical ground survey down to 800 m", "Drilling point and depth fixed before drilling", "Written survey report with the recommendation", "Yield and water-level test after drilling", "Water-quality check (key parameters such as TDS and pH)"]} image="/services/water-testing-survey.webp" imageAlt="A surveyor with a resistivity meter and electrodes laid along a field, explaining the survey to a farmer"/>; }
