import type { Metadata } from "next";
import { LegalPage, type LegalSection } from "@/components/public/legal-page";
import { company } from "@/lib/company";
import { pageMetadata } from "@/lib/page-metadata";

// Draft: kept out of search results until the owner has finalised it.
export const metadata: Metadata = {
  ...pageMetadata({ title: "Privacy Policy", description: "How Saini Tubewell Boring Service handles the details you send through this website.", path: "/privacy" }),
  robots: { index: false, follow: true },
};

const SECTIONS: LegalSection[] = [
  {
    heading: "Who we are",
    paras: [`This website is run by ${company.name} ("STBS", "we"), a borewell drilling, tubewell construction, rainwater harvesting and material supply business based in Sonipat, Haryana. You can reach us at ${company.email} or on +91 ${company.phones[0]}.`],
  },
  {
    heading: "What we collect",
    items: [
      "Proposal request form: your name, organisation (optional), phone number, email (optional), the service you want, the site location and any project details you type. We collect only what you enter.",
      "Calls and WhatsApp: whatever you choose to share when you contact us. Those services handle your data under their own policies.",
      "Technical data: our hosting provider receives standard request data (such as IP address, browser type and the pages requested) to deliver the site and protect it from abuse. We use your IP address to limit repeated form submissions.",
    ],
    paras: ["The public pages of this website do not use advertising trackers or analytics services."],
  },
  {
    heading: "How we use it",
    items: [
      "To respond to your request and prepare a site assessment or proposal.",
      "To keep a record of enquiries we have received.",
      "To keep the website secure and prevent spam.",
    ],
  },
  {
    heading: "Who else sees it",
    paras: ["We do not sell your details. They may be handled by:"],
    items: [
      "Our team, who read your request.",
      "The email service used to deliver the request to us, and the hosting provider that runs the website.",
      "Google, if you use the map on the Contact page: the map is loaded from Google, which may set its own cookies.",
      "WhatsApp, if you choose to message us there.",
    ],
  },
  {
    heading: "How long we keep it",
    paras: ["[Owner to confirm: how long enquiry records are kept, for example 24 months after the last contact.]"],
  },
  {
    heading: "Your choices",
    paras: [`You can ask us to show you, correct or delete the details you have sent by writing to ${company.email}. [Owner to confirm the response time you commit to.]`],
  },
  {
    heading: "Changes to this policy",
    paras: ["We will update this page when our practices change and show the date of the latest update at the top."],
  },
];

export default function Privacy() {
  return <LegalPage eyebrow="Legal" title="Privacy Policy" intro="What we collect through this website, why, and who can see it." updated="19 September 2026" sections={SECTIONS} />;
}
