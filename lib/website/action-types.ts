// ─── Client-safe action result types ────────────────────────────────────────
// The server actions in lib/website/actions.ts serialize Prisma objects to
// plain JSON. These interfaces describe the shapes client components receive.

export interface SerializedPage {
  id: string;
  name: string;
  slug: string;
  title: string | null;
  seoTitle: string | null;
  metaDescription: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  status: "DRAFT" | "PUBLISHED";
  sortOrder: number;
  hideFromNav: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  _count?: { sections: number };
}

export interface SerializedSection {
  id: string;
  pageId: string;
  type: string;
  name: string;
  description: string | null;
  content: Record<string, unknown>;
  publishedContent: Record<string, unknown> | null;
  position: number;
  visible: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export type WebsitePageWithSections = SerializedPage & {
  sections: SerializedSection[];
};

export interface SerializedService {
  id: string;
  title: string;
  slug: string;
  shortDescription: string | null;
  fullDescription: string | null;
  features: string[] | null;
  faqs: Array<{ question: string; answer: string }> | null;
  ctaText: string | null;
  ctaUrl: string | null;
  image: string | null;
  icon: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  position: number;
  visible: boolean;
  status: "DRAFT" | "PUBLISHED";
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface SerializedGalleryItem {
  id: string;
  mediaUrl: string;
  thumbnailUrl: string | null;
  caption: string | null;
  altText: string | null;
  category: string | null;
  sourceType: "REAL_PROJECT" | "STOCK" | "GENERATED" | "ILLUSTRATION";
  featured: boolean;
  position: number;
  visible: boolean;
  status: "DRAFT" | "PUBLISHED";
  deleteOnPublish: boolean;
  publishedData: Record<string, unknown> | null;
  publishedAt: string | null;
  width: number | null;
  height: number | null;
  fileSize: number | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface SerializedTestimonial {
  id: string;
  personName: string;
  designation: string | null;
  company: string | null;
  location: string | null;
  project: string | null;
  quote: string;
  rating: number | null;
  photo: string | null;
  approval: "DRAFT" | "VERIFIED" | "APPROVED";
  approvalNote: string | null;
  sourceNote: string | null;
  position: number;
  visible: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface SerializedClient {
  id: string;
  name: string;
  logoUrl: string | null;
  websiteUrl: string | null;
  altText: string | null;
  description: string | null;
  sector: string | null;
  featured: boolean;
  position: number;
  visible: boolean;
  status: "DRAFT" | "PUBLISHED";
  publishedData: Record<string, unknown> | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface SerializedNavItem {
  id: string;
  label: string;
  url: string;
  position: number;
  visible: boolean;
  openNewTab: boolean;
  parentId: string | null;
  status: "DRAFT" | "PUBLISHED";
  publishedData: Record<string, unknown> | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface SerializedWebsiteSettings {
  id: string;
  businessName: string | null;
  shortDescription: string | null;
  phone: string | null;
  phone2: string | null;
  whatsapp: string | null;
  email: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  pinCode: string | null;
  googleMapsUrl: string | null;
  googleBusinessUrl: string | null;
  serviceArea: string | null;
  businessHours: Record<string, unknown> | null;
  websiteUrl: string | null;
  primaryLogoUrl: string | null;
  lightLogoUrl: string | null;
  darkLogoUrl: string | null;
  mobileLogoUrl: string | null;
  faviconUrl: string | null;
  defaultOgImage: string | null;
  footerContent: string | null;
  copyrightText: string | null;
  founderName: string | null;
  founderTitle: string | null;
  founderBio: string | null;
  founderPhoto: string | null;
  mission: string | null;
  vision: string | null;
  publishedData: Record<string, unknown> | null;
  publishedAt: string | null;
  updatedAt: string;
}

export interface SerializedWebsiteSeo {
  id: string;
  globalTitle: string | null;
  globalDescription: string | null;
  defaultOgImage: string | null;
  twitterTitle: string | null;
  twitterDescription: string | null;
  twitterImage: string | null;
  canonicalUrl: string | null;
  robotsSettings: string | null;
  structuredData: Record<string, unknown> | null;
  publishedData: Record<string, unknown> | null;
  publishedAt: string | null;
  updatedAt: string;
}
