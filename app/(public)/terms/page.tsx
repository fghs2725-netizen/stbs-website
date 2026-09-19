import type { Metadata } from "next";
import { LegalPage, type LegalSection } from "@/components/public/legal-page";
import { company } from "@/lib/company";
import { pageMetadata } from "@/lib/page-metadata";

// Draft: kept out of search results until the owner has finalised it.
export const metadata: Metadata = {
  ...pageMetadata({ title: "Terms of Service", description: "Terms for using the Saini Tubewell Boring Service website and requesting proposals.", path: "/terms" }),
  robots: { index: false, follow: true },
};

const SECTIONS: LegalSection[] = [
  {
    heading: "Using this website",
    paras: [`This website is provided by ${company.name} to describe our services and let you ask for a proposal. The information on it is general. Suitability, depth, materials and timelines depend on your site and are confirmed only after a site assessment.`],
  },
  {
    heading: "Proposals and quotations",
    items: [
      "Sending a request through this website does not create a contract.",
      "A price, scope or timeline binds us only when it is set out in a written proposal or quotation that we have issued and you have accepted in writing.",
      "Proposals are valid for the period stated in them.",
    ],
  },
  {
    heading: "Project information",
    paras: ["Project descriptions on this site summarise the scope stated in the client's work order or purchase order. They show the kind of work we do and are not a guarantee of the same result at another site."],
  },
  {
    heading: "Names and logos",
    paras: ["Client names and logos belong to their owners and are shown only to identify organisations we have worked for. Their appearance does not imply endorsement."],
  },
  {
    heading: "Liability",
    paras: ["[Owner and legal adviser to complete: limits on liability for information on this website.]"],
  },
  {
    heading: "Governing law",
    paras: ["[Owner and legal adviser to confirm the governing law and the courts that have jurisdiction.]"],
  },
  {
    heading: "Changes to these terms",
    paras: [`We may update these terms. Questions can be sent to ${company.email}.`],
  },
];

export default function Terms() {
  return <LegalPage eyebrow="Legal" title="Terms of Service" intro="The basis on which this website is provided and how proposals work." updated="19 September 2026" sections={SECTIONS} />;
}
