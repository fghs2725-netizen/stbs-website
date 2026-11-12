import type { Metadata } from "next";
import { Construction } from "lucide-react";
import { TubewellDiagram } from "@/components/public/diagrams";
import { ServiceDetailPage } from "@/components/public/service-detail-page";
import { pageMetadata } from "@/lib/page-metadata";
import { SEO } from "@/lib/website/seo-copy";
export const metadata: Metadata = pageMetadata({ ...SEO["tubewell-construction"], path: "/tubewell-construction", absoluteTitle: true });
export default function TubewellConstruction() {
  return (
    <ServiceDetailPage
      slug="tubewell-construction"
      eyebrow="Tubewell construction"
      title="Tubewell Boring and *Construction*"
      intro="Tubewell boring and construction for industrial, commercial and agricultural sites across Haryana and Delhi NCR, from ground survey and drilling to pump installation, testing and handover."
      diagram={<TubewellDiagram />}
      diagramTitle="Inside a tubewell"
      icon={Construction}
      process
      specs={[
        "Bore diameter: 150–300 mm (6\"–12\")",
        "uPVC casing and well screen, ISI marked (IS:12818 where specified)",
        "Graded gravel pack (IS:4097 where specified)",
        "Stainless-steel submersible pumps, 1–50 HP",
        "Developed until the water runs clear and sand-free",
      ]}
      segments={["Commercial and industrial facilities", "Agricultural sites", "Residential properties"]}
      bullets={[
        "Ground survey up to 800 m to fix the drilling point and depth",
        "Tubewell boring with our own rotary rigs and crews",
        "Casing, well screen and gravel pack planned around the water-bearing strata",
        "Stainless-steel submersible pump, HDPE rising main, cable and automatic starter panel",
        "Well-head assembly, yield testing, cleanup and handover",
      ]}
      image="/services/tubewell-rig-pipes.webp"
      imageAlt="A worker carrying white uPVC casing pipe past a drilling rig at an industrial site"
    />
  );
}
