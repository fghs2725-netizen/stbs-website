// ─────────────────────────────────────────────────────────────────────────────
// Document Management System — Core Types
// ─────────────────────────────────────────────────────────────────────────────

export type DocumentType =
  | "QUOTATION"
  | "TAX_INVOICE"
  | "PROFORMA_INVOICE"
  | "PURCHASE_ORDER"
  | "WORK_ORDER"
  | "SITE_VISIT_REPORT"
  | "BOREWELL_COMPLETION_REPORT"
  | "RWH_REPORT"
  | "HYDROGEO_SURVEY"
  | "TECHNICAL_PROPOSAL"
  | "COMMERCIAL_PROPOSAL"
  | "PROJECT_ESTIMATE"
  | "COST_BREAKDOWN"
  | "COMPLETION_CERTIFICATE"
  | "PAYMENT_RECEIPT"
  | "DELIVERY_CHALLAN"
  | "WARRANTY_CERTIFICATE"
  | "AMC_AGREEMENT"
  | "SERVICE_REPORT"
  | "INTERNAL_DOCUMENT";

export type DocumentStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "UNDER_REVIEW"
  | "REVISION"
  | "APPROVED"
  | "REJECTED"
  | "EXPIRED"
  | "CANCELLED"
  | "FINALIZED"
  | "ISSUED"
  | "VIEWED"
  | "ACCEPTED"
  | "COMPLETED"
  | "ARCHIVED";

export type SectionType =
  | "cover"
  | "client"
  | "project"
  | "services"
  | "boq"
  | "gallery"
  | "timeline"
  | "technical_drawings"
  | "signatures"
  | "qr"
  | "terms"
  | "company_profile"
  | "scope_of_work"
  | "methodology"
  | "custom";

// ─── Client ──────────────────────────────────────────────────────────────────

export interface ClientDetails {
  companyName: string;
  contactPerson: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pinCode: string;
  phone: string;
  email: string;
  gstNumber: string;
  panNumber: string;
  siteAddress: string;
}

// ─── Document Item (BOQ line) ────────────────────────────────────────────────

export interface DocumentItemData {
  id: string;
  position: number;
  itemCode: string;
  description: string;
  unit: string;
  quantity: number;
  rate: number;
  amount: number;
  gstPercent: number;
  gstAmount: number;
  hsnCode: string;
  category: string;
  notes: string;
}

// ─── Document Section ────────────────────────────────────────────────────────

export interface DocumentSectionData {
  id: string;
  type: SectionType;
  position: number;
  title: string;
  content: Record<string, unknown>;
  visible: boolean;
}

// ─── Timeline Phase ─────────────────────────────────────────────────────────

export interface TimelinePhase {
  id: string;
  position: number;
  phase: string;
  title: string;
  description: string;
  startDate: string | null;
  endDate: string | null;
  status: "pending" | "in_progress" | "completed";
}

// ─── Document Attachment ─────────────────────────────────────────────────────

export interface AttachmentData {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: "image" | "drawing" | "blueprint" | "photo";
  fileSize: number;
  caption: string;
  category: "before" | "after" | "drone" | "site" | "technical" | "general";
  position: number;
}

// ─── Signature ───────────────────────────────────────────────────────────────

export interface SignatureData {
  label: string;
  name: string;
  title: string;
  imageUrl: string;
  stampUrl: string;
  date: string;
}

// ─── Document Version ────────────────────────────────────────────────────────

export interface DocumentVersionData {
  id: string;
  version: number;
  label: string;
  changeNote: string;
  createdBy: string;
  createdAt: string;
  pdfUrl: string | null;
}

// ─── Full Document State ─────────────────────────────────────────────────────

export interface DocumentState {
  id?: string;
  reference: string;
  type: DocumentType;
  status: DocumentStatus;
  title: string;
  subject: string;
  date: string;
  validUntil: string;

  // Project
  projectName: string;
  projectAddress: string;
  serviceType: string;

  // Client
  clientId: string;
  client: ClientDetails;

  // Financial
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalAmount: number;
  currency: string;

  // Content
  scopeOfWork: string;
  methodology: string;
  specifications: string;
  notes: string;

  // Sections & items
  items: DocumentItemData[];
  sections: DocumentSectionData[];
  timeline: TimelinePhase[];
  attachments: AttachmentData[];
  signatures: SignatureData[];

  // Theme
  templateId: string;
  themeColor: string;
  accentColor: string;

  // QR
  verificationCode: string;
  qrUrl: string;

  // Metadata
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  pdfUrl: string | null;
}

// ─── Company Settings ────────────────────────────────────────────────────────

export interface CompanySettingsData {
  companyName: string;
  shortName: string;
  tagline: string;
  description: string;
  logoUrl: string;
  bannerUrl: string;
  phone1: string;
  phone2: string;
  email: string;
  website: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pinCode: string;
  country: string;
  gstNumber: string;
  panNumber: string;
  cinNumber: string;
  bankName: string;
  bankAccountNo: string;
  bankIfsc: string;
  bankBranch: string;
  primaryColor: string;
  accentColor: string;
  fontFamily: string;
  directorName: string;
  directorTitle: string;
}

// ─── Template ────────────────────────────────────────────────────────────────

export interface TemplateData {
  id: string;
  name: string;
  type: DocumentType;
  description: string;
  isDefault: boolean;
  themeColor: string;
  accentColor: string;
  fontFamily: string;
  watermarkText: string;
  watermarkOpacity: number;
  coverLayout: "standard" | "minimal" | "bold";
  sections: DocumentSectionData[];
}

// ─── Initial/Default State ───────────────────────────────────────────────────

export const emptyClient: ClientDetails = {
  companyName: "",
  contactPerson: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  pinCode: "",
  phone: "",
  email: "",
  gstNumber: "",
  panNumber: "",
  siteAddress: "",
};

export const createEmptyItem = (position: number): DocumentItemData => ({
  id: crypto.randomUUID(),
  position,
  itemCode: "",
  description: "",
  unit: "",
  quantity: 0,
  rate: 0,
  amount: 0,
  gstPercent: 18,
  gstAmount: 0,
  hsnCode: "",
  category: "",
  notes: "",
});

export const initialDocumentState: Omit<DocumentState, "reference"> = {
  type: "QUOTATION",
  status: "DRAFT",
  title: "",
  subject: "",
  date: new Date().toISOString().split("T")[0],
  validUntil: "",
  projectName: "",
  projectAddress: "",
  serviceType: "",
  clientId: "",
  client: { ...emptyClient },
  subtotal: 0,
  discountPercent: 0,
  discountAmount: 0,
  taxableAmount: 0,
  cgstAmount: 0,
  sgstAmount: 0,
  igstAmount: 0,
  totalAmount: 0,
  currency: "INR",
  scopeOfWork: "",
  methodology: "",
  specifications: "",
  notes: "",
  items: [],
  sections: [],
  timeline: [],
  attachments: [],
  signatures: [],
  templateId: "",
  themeColor: "#1e3a5f",
  accentColor: "#f7c600",
  verificationCode: "",
  qrUrl: "",
  createdBy: "",
  createdAt: "",
  updatedAt: "",
  pdfUrl: null,
};
