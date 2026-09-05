// ─────────────────────────────────────────────────────────────────────────────
// STBS Default Company Data — Used across document templates
// ─────────────────────────────────────────────────────────────────────────────

import type { CompanySettingsData, SignatureData, TimelinePhase } from "./types";

export const DEFAULT_COMPANY: CompanySettingsData = {
  companyName: "Saini Tubewell Boring Service",
  shortName: "STBS",
  tagline: "Drilling deep. Building trust.",
  description:
    "Professional borewell and tubewell solutions engineered for dependable water access, responsible recharge and long-term performance. Established in 1992, STBS has completed over 1,200 projects across Haryana and NCR with a focus on quality, transparency, and client satisfaction.",
  logoUrl: "/logo.png",
  bannerUrl: "/quotation/banner/stbs-premium-banner.png",
  phone1: "9812003001",
  phone2: "7988024114",
  email: "stbs2025@gmail.com",
  website: "https://stbs.in",
  addressLine1: "Sonipat, Haryana",
  addressLine2: "",
  city: "Sonipat",
  state: "Haryana",
  pinCode: "",
  country: "India",
  gstNumber: "",
  panNumber: "",
  cinNumber: "",
  bankName: "",
  bankAccountNo: "",
  bankIfsc: "",
  bankBranch: "",
  primaryColor: "#1e3a5f",
  accentColor: "#f7c600",
  fontFamily: "Inter",
  directorName: "Rajesh Saini",
  directorTitle: "Managing Director",
};

export const DEFAULT_SIGNATURES: SignatureData[] = [
  {
    label: "For SAINI TUBEWELL BORING SERVICE",
    name: "Rajesh Saini",
    title: "Managing Director",
    imageUrl: "",
    stampUrl: "",
    date: "",
  },
  {
    label: "Site Engineer",
    name: "",
    title: "Site Engineer",
    imageUrl: "",
    stampUrl: "",
    date: "",
  },
  {
    label: "Customer / Authorized Signatory",
    name: "",
    title: "",
    imageUrl: "",
    stampUrl: "",
    date: "",
  },
];

export const DEFAULT_TIMELINE_PHASES: TimelinePhase[] = [
  { id: "phase-1", position: 0, phase: "01", title: "Site Survey & Assessment", description: "Site inspection, geological assessment, and project planning", startDate: null, endDate: null, status: "pending" },
  { id: "phase-2", position: 1, phase: "02", title: "Drilling Operations", description: "Precision drilling to target depth with proper casing installation", startDate: null, endDate: null, status: "pending" },
  { id: "phase-3", position: 2, phase: "03", title: "Casing & Screening", description: "Installation of casing pipes and screen assemblies", startDate: null, endDate: null, status: "pending" },
  { id: "phase-4", position: 3, phase: "04", title: "Well Development", description: "Cleaning and developing the borewell for optimal yield", startDate: null, endDate: null, status: "pending" },
  { id: "phase-5", position: 4, phase: "05", title: "Pump Installation", description: "Submersible pump installation with piping and electrical connections", startDate: null, endDate: null, status: "pending" },
  { id: "phase-6", position: 5, phase: "06", title: "Testing & Commissioning", description: "Flow rate testing, water quality testing, and system commissioning", startDate: null, endDate: null, status: "pending" },
  { id: "phase-7", position: 6, phase: "07", title: "Handover & Documentation", description: "Site cleanup, documentation, and client handover with maintenance guidance", startDate: null, endDate: null, status: "pending" },
];

export const DEFAULT_SERVICES = [
  { title: "Tubewell Drilling", description: "Precision drilling planned around site conditions, depth requirements and dependable water access.", icon: "Drill" },
  { title: "Recharge Borewell", description: "Engineered recharge systems to replenish groundwater and support sustainable water management.", icon: "Droplets" },
  { title: "Rainwater Harvesting", description: "Practical recharge systems designed to conserve rainwater and strengthen groundwater resources.", icon: "CloudRain" },
  { title: "Pump Installation", description: "Submersible pump installation with piping, electrical connections, and pressure testing.", icon: "Wrench" },
  { title: "Borewell Cleaning", description: "Professional borewell flushing and rehabilitation to restore optimal water flow.", icon: "Trash2" },
  { title: "Hydrogeological Survey", description: "Comprehensive groundwater survey and geological assessment for project planning.", icon: "Search" },
];

export const DEFAULT_TERMS = [
  { title: "Payment Terms", content: "50% advance payment before commencement of work. Remaining 50% upon completion and handover." },
  { title: "Delivery Timeline", content: "Work will commence within 7 working days from the date of receiving the advance payment and confirmed work order." },
  { title: "Warranty", content: "12 months warranty on workmanship from the date of completion. Warranty does not cover damage due to natural calamities or third-party interference." },
  { title: "Material Specification", content: "All materials used will be ISI-certified and of standard quality as per industry norms. Any deviation in material specification will be communicated in advance." },
  { title: "Force Majeure", content: "Delays caused by unforeseen circumstances including but not limited to natural disasters, government regulations, or labor disputes shall not be held against either party." },
  { title: "Cancellation", content: "Cancellation after commencement of work will be subject to deduction of expenses already incurred. Advance payments are non-refundable after mobilization." },
  { title: "Dispute Resolution", content: "Any disputes arising from this agreement shall be resolved amicably. In case of failure, the matter shall be referred to arbitration under the Indian Arbitration Act, with jurisdiction in Sonipat, Haryana." },
  { title: "Validity", content: "This quotation is valid for 15 days from the date of submission unless otherwise stated." },
];

export const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
  "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
];

export const UNIT_OPTIONS = [
  "Nos", "Set", "Pair", "Lot", "Job",
  "Rft", "Mtr", "Km",
  "Sq.ft", "Sq.mtr",
  "Cu.ft", "Cu.mtr",
  "Kg", "Ton", "Quintal",
  "Ltr", "KL",
  "Bag", "Bundle", "Roll",
  "Day", "Month", "Year",
  "Trip", "Load",
  "Lump Sum", "Per Hour",
];

export const SERVICE_TYPE_OPTIONS = [
  "Borewell Construction",
  "Tubewell Boring",
  "Rainwater Harvesting Borewell System",
  "Rainwater Harvesting",
  "Recharge Borewell",
  "Pump Installation",
  "Borewell Cleaning",
  "Hydrogeological Survey",
  "Industrial Water Solutions",
  "Civil Construction",
  "Borewell Material Supply",
  "AMC / Maintenance",
  "Custom",
];
