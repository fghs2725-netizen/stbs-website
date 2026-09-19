import { Boxes, CloudRain, Construction, Drill } from "lucide-react";

export const company = {
  name: "Saini Tubewell Boring Service",
  shortName: "Saini Tubewell",
  established: 1992,
  tagline: "Drilling deep. Building trust.",
  description: "Professional borewell and tubewell solutions engineered for dependable water access, responsible recharge and long-term performance.",
  managingDirector: "Rajesh Saini",
  phones: ["9812003001", "7988024114"],
  email: "stbs2025@gmail.com",
  mission: "To provide customers with products and services that achieve and sustain the highest possible quality standards.",
  vision: "Excel in what we do and build a safe and secure environment for our community.",
};

/**
 * Public business facts used by the footer, the contact page and structured data.
 * Empty strings are deliberate: a field with no verified value is HIDDEN, never faked.
 * See docs/TODO.md for what the owner still needs to supply.
 */
export const businessInfo = {
  /** Existing site copy (contact page + JSON-LD); NOT verified by the owner yet. */
  hours: ["Monday to Saturday: 8:00 AM to 7:00 PM", "Sunday: Emergency support only"],
  /** Machine-readable form of the same hours, for JSON-LD. */
  openingHours: "Mo-Sa 08:00-19:00",
  /** Areas named in the owner's brief; Gurugram was requested there. */
  serviceAreas: ["Sonipat", "Panipat", "Kundli", "Rohtak", "Gurugram", "Delhi NCR"],
  /** OWNER TO SUPPLY. Documents show Dipalpur Road, Bhalgarh, Sonipat (pincode 131021 vs 131001): unconfirmed. */
  registeredOffice: "",
  /** OWNER TO CONFIRM before publishing (appears on client documents, not yet approved for the site). */
  gstin: "06AWTPS2732A1ZI",
  /** OWNER TO SUPPLY. */
  legalName: "",
  mapsUrl: "https://www.google.com/maps?q=Sonipat,Haryana",
};

export const clients = ["Brackparts Pvt. Ltd.", "Ashoka University", "Jupiter Laminator Pvt. Ltd.", "LT Overseas Pvt. Ltd. (Dawat Rice Mill)", "Amul Milk, Murthal", "BigBasket, Sonipat Site", "Nidaan Hospital", "Devi Lal Park, Sonipat/Panipat", "Alaina Indane Gas", "Voestalpine VAE VKN India Pvt. Ltd.", "Maneta Pvt. Ltd.", "Avicreations", "Ajit Industries Pvt. Ltd.", "Shreeji International School", "Parker Mall, Kundli", "TDI City, Kundli", "ITEC Technopark, IIT Delhi Sonipat Campus", "Coral Drugs Pvt. Ltd.", "Rishi Laser Limited", "Marut Techno Tools Pvt. Ltd.", "A-One Tex Tech Pvt. Ltd.", "O.P. Jindal Global University"];

export const services = [
  { title: "Borewell Drilling", icon: Drill, text: "Precision drilling planned around site conditions, depth requirements and dependable water access." },
  { title: "Rainwater Harvesting", icon: CloudRain, text: "Practical recharge systems designed to conserve rainwater and strengthen groundwater resources." },
  { title: "Borewell Material Supply", icon: Boxes, text: "Reliable supply of essential borewell materials selected for durability and field performance." },
  { title: "Tubewell Construction", icon: Construction, text: "End-to-end tubewell construction with disciplined execution, quality materials and site coordination." },
];

export const whyChoose = [
  { title: "34+ Years", text: "34 years of hands-on field experience across borewell and tubewell projects." },
  { title: "Modern Equipment", text: "A maintained fleet of drilling rigs and recharge systems built for tough ground." },
  { title: "Transparent Pricing", text: "Clear, itemised quotes with no hidden charges and fair material rates." },
  { title: "Experienced Team", text: "Skilled operators and site supervisors who own the work end to end." },
  { title: "Reliable Support", text: "Responsive coordination before, during and after the project is handed over." },
  { title: "Quality Materials", text: "Durable pipes, casing and components selected for long-term performance." },
];

export const processSteps = [
  { step: "01", title: "Site Visit", text: "We assess access, ground conditions, water requirements and usage patterns to plan the optimal solution." },
  { step: "02", title: "Survey", text: "Geological survey and water table analysis to determine drilling depth and casing specifications." },
  { step: "03", title: "Drilling", text: "Precision drilling executed with proper casing installation and aquifer isolation for water quality." },
  { step: "04", title: "Installation", text: "Installation of pump, piping and electrical components with pressure testing and flow rate verification." },
  { step: "05", title: "Completion", text: "Site cleanup, client walkthrough, maintenance training and documentation handover for long-term operation." },
];

export const keywords = [
  "borewell drilling",
  "tubewell construction",
  "rainwater harvesting",
  "borewell material supply"
];

export const foundingYear = 1992;
export const founderName = "Rajesh Saini";
export const founderTitle = "Founder & Managing Director";
export const founderBio = "With 34 years of hands-on experience in water infrastructure, Rajesh Saini leads Saini Tubewell with a field-first approach—precision drilling, responsible recharge, and end-to-end tubewell construction built on practical expertise.";
