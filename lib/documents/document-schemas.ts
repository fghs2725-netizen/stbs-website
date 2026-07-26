// ─────────────────────────────────────────────────────────────────────────────
// Zod Validation Schemas — Type-safe validation for document forms
// ─────────────────────────────────────────────────────────────────────────────

import { z } from "zod";

// ─── Client ──────────────────────────────────────────────────────────────────

export const clientSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  contactPerson: z.string().optional().default(""),
  addressLine1: z.string().optional().default(""),
  addressLine2: z.string().optional().default(""),
  city: z.string().optional().default(""),
  state: z.string().optional().default(""),
  pinCode: z.string().optional().default(""),
  phone: z.string().optional().default(""),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  gstNumber: z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, "Invalid GST number").optional().or(z.literal("")),
  panNumber: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Invalid PAN number").optional().or(z.literal("")),
  siteAddress: z.string().optional().default(""),
});

export type ClientFormData = z.infer<typeof clientSchema>;

// ─── Document Item ───────────────────────────────────────────────────────────

export const documentItemSchema = z.object({
  id: z.string(),
  position: z.number().int().min(0),
  itemCode: z.string().optional().default(""),
  description: z.string().min(1, "Description is required"),
  unit: z.string().min(1, "Unit is required"),
  quantity: z.number().positive("Quantity must be positive"),
  rate: z.number().min(0, "Rate must be non-negative"),
  amount: z.number().min(0),
  gstPercent: z.number().min(0).max(100).default(18),
  gstAmount: z.number().min(0).default(0),
  hsnCode: z.string().optional().default(""),
  category: z.string().optional().default(""),
  notes: z.string().optional().default(""),
});

// ─── Timeline Phase ─────────────────────────────────────────────────────────

export const timelinePhaseSchema = z.object({
  id: z.string(),
  position: z.number().int().min(0),
  phase: z.string().min(1, "Phase is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional().default(""),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  status: z.enum(["pending", "in_progress", "completed"]).default("pending"),
});

// ─── Document ────────────────────────────────────────────────────────────────

export const documentFormSchema = z.object({
  type: z.enum([
    "QUOTATION", "TAX_INVOICE", "PROFORMA_INVOICE", "PURCHASE_ORDER",
    "WORK_ORDER", "SITE_VISIT_REPORT", "BOREWELL_COMPLETION_REPORT",
    "RWH_REPORT", "HYDROGEO_SURVEY", "TECHNICAL_PROPOSAL",
    "COMMERCIAL_PROPOSAL", "PROJECT_ESTIMATE", "COST_BREAKDOWN",
    "COMPLETION_CERTIFICATE", "PAYMENT_RECEIPT", "DELIVERY_CHALLAN",
    "WARRANTY_CERTIFICATE", "AMC_AGREEMENT", "SERVICE_REPORT",
    "INTERNAL_DOCUMENT",
  ]),
  title: z.string().min(1, "Title is required"),
  subject: z.string().optional().default(""),
  date: z.string().min(1, "Date is required"),
  validUntil: z.string().optional().default(""),
  projectName: z.string().optional().default(""),
  projectAddress: z.string().optional().default(""),
  serviceType: z.string().optional().default(""),
  client: clientSchema,
  items: z.array(documentItemSchema).optional().default([]),
  timeline: z.array(timelinePhaseSchema).optional().default([]),
  scopeOfWork: z.string().optional().default(""),
  methodology: z.string().optional().default(""),
  specifications: z.string().optional().default(""),
  notes: z.string().optional().default(""),
  discountPercent: z.number().min(0).max(100).default(0),
  themeColor: z.string().default("#1e3a5f"),
  accentColor: z.string().default("#f7c600"),
  currency: z.string().default("INR"),
});

export type DocumentFormData = z.infer<typeof documentFormSchema>;

// ─── Company Settings ────────────────────────────────────────────────────────

export const companySettingsSchema = z.object({
  companyName: z.string().min(1),
  shortName: z.string().min(1),
  tagline: z.string().optional(),
  description: z.string().optional(),
  logoUrl: z.string().optional(),
  bannerUrl: z.string().optional(),
  phone1: z.string().optional(),
  phone2: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  website: z.string().url().optional().or(z.literal("")),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pinCode: z.string().optional(),
  gstNumber: z.string().optional(),
  panNumber: z.string().optional(),
  bankName: z.string().optional(),
  bankAccountNo: z.string().optional(),
  bankIfsc: z.string().optional(),
  bankBranch: z.string().optional(),
  primaryColor: z.string().optional(),
  accentColor: z.string().optional(),
  fontFamily: z.string().optional(),
  directorName: z.string().optional(),
  directorTitle: z.string().optional(),
});

// ─── Template ────────────────────────────────────────────────────────────────

export const templateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  type: documentFormSchema.shape.type,
  description: z.string().optional(),
  themeColor: z.string().default("#1e3a5f"),
  accentColor: z.string().default("#f7c600"),
  fontFamily: z.string().default("Inter"),
  watermarkText: z.string().optional(),
  watermarkOpacity: z.number().min(0).max(1).default(0.05),
  coverLayout: z.enum(["standard", "minimal", "bold"]).default("standard"),
});

// ─── Search / Filter ─────────────────────────────────────────────────────────

export const documentFilterSchema = z.object({
  type: documentFormSchema.shape.type.optional(),
  status: z.enum([
    "DRAFT", "PENDING_REVIEW", "REVISION", "APPROVED",
    "REJECTED", "EXPIRED", "CANCELLED", "FINALIZED",
  ]).optional(),
  clientId: z.string().optional(),
  search: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  sortBy: z.enum(["date", "reference", "amount", "status", "createdAt"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export type DocumentFilter = z.infer<typeof documentFilterSchema>;
