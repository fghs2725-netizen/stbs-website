/**
 * Page titles and meta descriptions, in one place: used by every page, the root defaults and
 * scripts/migrate-homepage.ts (which brings the CMS rows in line).
 *
 * Local keywords (Sonipat, Panipat, Kundli, Rohtak, Gurugram, Delhi NCR) are the owner's list and
 * are written as natural phrases. Every claim is already on the site or in the owner's brief:
 * nothing here promises prices, turnaround or results. Titles already carry the brand, so they
 * are used as-is (absoluteTitle) and never get a second suffix.
 */
export interface SeoEntry {
  title: string;
  description: string;
}

export const SEO = {
  home: {
    title: "Borewell & Tubewell Contractor in Sonipat, NCR | Saini Tubewell",
    description: "Borewell drilling, tubewell construction and rainwater harvesting for industrial and commercial sites in Sonipat, Panipat, Kundli, Rohtak and NCR since 1992.",
  },
  services: {
    title: "Borewell, Tubewell & Rainwater Services | Saini Tubewell",
    description: "Borewell drilling, tubewell construction, rainwater harvesting and material supply in Sonipat, Panipat, Kundli, Rohtak and Delhi NCR. Site assessment first.",
  },
  "borewell-drilling": {
    title: "Borewell Drilling in Sonipat & Panipat | Saini Tubewell",
    description: "Borewell drilling from 100 to 400 mm for industrial, commercial and residential sites in Sonipat, Panipat, Kundli and Rohtak, with casing and aquifer isolation.",
  },
  "rainwater-harvesting": {
    title: "Rainwater Harvesting in Sonipat & Kundli | Saini Tubewell",
    description: "Rainwater harvesting and groundwater recharge for industrial and institutional sites in Sonipat, Kundli and NCR: percolation boreholes, filters, recharge pits.",
  },
  "borewell-material-supply": {
    title: "Borewell Material Supply, Sonipat & Haryana | Saini Tubewell",
    description: "Casing pipes, pump sets, fittings and control panels for borewell installations, supplied across Sonipat, Panipat, Kundli, Rohtak and Delhi NCR.",
  },
  "tubewell-construction": {
    title: "Tubewell Construction in Sonipat & Haryana | Saini Tubewell",
    description: "End-to-end tubewell construction for agricultural, commercial and industrial sites in Sonipat, Panipat, Rohtak and Haryana: planning to handover.",
  },
  about: {
    title: "About Saini Tubewell Boring Service | Since 1992",
    description: "Saini Tubewell Boring Service has drilled borewells and built tubewells across Haryana and Delhi NCR since 1992, led by founder Rajesh Saini.",
  },
  clients: {
    title: "Our Clients | Industrial & Institutional | Saini Tubewell",
    description: "Water infrastructure work for Ashoka University, Amul, BigBasket, LT Foods, voestalpine and 20+ industrial, commercial and institutional clients in Haryana.",
  },
  projects: {
    title: "Rainwater Harvesting Projects, Sonipat | Saini Tubewell",
    description: "Rainwater harvesting and borewell projects for industrial, institutional and commercial sites in Sonipat and Kundli, Haryana: scope, sizes and locations.",
  },
  contact: {
    title: "Contact Saini Tubewell | Sonipat, Haryana",
    description: "Call +91 98120 03001 or request a proposal for borewell drilling, tubewell construction or rainwater harvesting in Sonipat, Panipat, Kundli, Rohtak and NCR.",
  },
  quote: {
    title: "Request a Proposal | Saini Tubewell",
    description: "Tell us the site, service and scope. We review it and send a written proposal for borewell, tubewell, rainwater harvesting or material supply work.",
  },
  gallery: {
    title: "Project Gallery | Saini Tubewell",
    description: "Photographs of drilling, installation and completed projects from our field operations in Sonipat and Delhi NCR.",
  },
} as const satisfies Record<string, SeoEntry>;

export type SeoKey = keyof typeof SEO;
