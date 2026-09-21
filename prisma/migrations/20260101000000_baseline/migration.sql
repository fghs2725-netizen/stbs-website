-- Baseline: the schema as it stood before the first recorded migration.
--
-- The migrations that follow this one begin by ALTERing tables that nothing had ever created,
-- because the original schema was pushed straight to the database instead of being migrated.
-- That left the history unable to build a database from scratch. This fills the gap.
--
-- Every statement is idempotent, so applying it to a database that already has these tables is a
-- no-op. On an existing database prefer marking it applied without running it:
--   npx prisma migrate resolve --applied 20260101000000_baseline
--
-- Generated from prisma/schema.prisma, with everything the later migrations add removed.

CREATE SCHEMA IF NOT EXISTS "public";

DO $$ BEGIN
  CREATE TYPE "ProjectStatus" AS ENUM ('ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "DocumentStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'UNDER_REVIEW', 'REVISION', 'APPROVED', 'REJECTED', 'ISSUED', 'VIEWED', 'ACCEPTED', 'COMPLETED', 'ARCHIVED', 'CANCELLED', 'FINALIZED', 'EXPIRED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "DocumentType" AS ENUM ('QUOTATION', 'TAX_INVOICE', 'PROFORMA_INVOICE', 'PURCHASE_ORDER', 'WORK_ORDER', 'SITE_VISIT_REPORT', 'BOREWELL_COMPLETION_REPORT', 'RWH_REPORT', 'HYDROGEO_SURVEY', 'TECHNICAL_PROPOSAL', 'COMMERCIAL_PROPOSAL', 'PROJECT_ESTIMATE', 'COST_BREAKDOWN', 'COMPLETION_CERTIFICATE', 'PAYMENT_RECEIPT', 'DELIVERY_CHALLAN', 'WARRANTY_CERTIFICATE', 'AMC_AGREEMENT', 'SERVICE_REPORT', 'INTERNAL_DOCUMENT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "QuotationStatus" AS ENUM ('DRAFT', 'FINAL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'EXPIRED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ApprovalAction" AS ENUM ('SUBMITTED', 'APPROVED', 'REJECTED', 'REVISION_REQUESTED', 'CANCELLED', 'EXPIRED', 'RESTARTED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'ACTIVE', 'COMPLETED', 'FAILED', 'DELAYED', 'DEAD_LETTER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "EmailStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'FAILED', 'BOUNCED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "WebsitePageStatus" AS ENUM ('DRAFT', 'PUBLISHED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "TestimonialApproval" AS ENUM ('DRAFT', 'VERIFIED', 'APPROVED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ImageSourceType" AS ENUM ('REAL_PROJECT', 'STOCK', 'GENERATED', 'ILLUSTRATION');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Saini Tubewell Boring Service',
    "shortName" TEXT NOT NULL DEFAULT 'STBS',
    "tagline" TEXT NOT NULL DEFAULT 'Drilling deep. Building trust.',
    "description" TEXT,
    "logoUrl" TEXT,
    "bannerUrl" TEXT,
    "phone1" TEXT,
    "phone2" TEXT,
    "email" TEXT,
    "website" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "pinCode" TEXT,
    "country" TEXT NOT NULL DEFAULT 'India',
    "gstNumber" TEXT,
    "panNumber" TEXT,
    "cinNumber" TEXT,
    "bankName" TEXT,
    "bankAccountNo" TEXT,
    "bankIfsc" TEXT,
    "bankBranch" TEXT,
    "primaryColor" TEXT NOT NULL DEFAULT '#1e3a5f',
    "accentColor" TEXT NOT NULL DEFAULT '#f7c600',
    "fontFamily" TEXT NOT NULL DEFAULT 'Manrope',
    "directorName" TEXT,
    "directorTitle" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "password" TEXT,
    "roleId" TEXT,
    "companyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hierarchy" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Permission" (
    "id" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "action" TEXT[],
    "roleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Client" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "companyName" TEXT NOT NULL,
    "contactPerson" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "pinCode" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "accessCodeHash" TEXT,
    "gstNumber" TEXT,
    "panNumber" TEXT,
    "siteAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "status" "ProjectStatus" NOT NULL DEFAULT 'ACTIVE',
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ProjectPhase" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "phaseNum" INTEGER NOT NULL,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ProjectPhase_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Document" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "title" TEXT NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "subject" TEXT,
    "notes" TEXT,
    "terms" TEXT,
    "pdfUrl" TEXT,
    "totalAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "clientName" TEXT,
    "clientEmail" TEXT,
    "clientCompany" TEXT,
    "templateId" TEXT,
    "projectId" TEXT,
    "clientId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "DocumentTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "description" TEXT,
    "content" JSONB NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "themeColor" TEXT NOT NULL DEFAULT '#1e3a5f',
    "accentColor" TEXT NOT NULL DEFAULT '#f7c600',
    "fontFamily" TEXT NOT NULL DEFAULT 'Manrope',
    "watermarkText" TEXT,
    "watermarkOpacity" DOUBLE PRECISION NOT NULL DEFAULT 0.1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "DocumentTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "DocumentVersion" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "label" TEXT,
    "snapshot" JSONB,
    "changeNote" TEXT,
    "pdfUrl" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "DocumentVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "DocumentItem" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "itemCode" TEXT,
    "description" TEXT NOT NULL,
    "unit" TEXT,
    "quantity" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "rate" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "gstPercent" DECIMAL(5,2) NOT NULL DEFAULT 18,
    "gstAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "hsnCode" TEXT,
    "category" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "DocumentSection" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT,
    "content" JSONB NOT NULL DEFAULT '{}',
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentSection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Quotation" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "validity" TEXT NOT NULL DEFAULT '15 days from date of submission',
    "status" "QuotationStatus" NOT NULL DEFAULT 'DRAFT',
    "serviceType" TEXT NOT NULL,
    "customServiceType" TEXT,
    "subject" TEXT NOT NULL,
    "clientId" TEXT,
    "clientCompanyName" TEXT NOT NULL,
    "clientContactPerson" TEXT,
    "clientAddressLine1" TEXT,
    "clientAddressLine2" TEXT,
    "clientCity" TEXT,
    "clientState" TEXT,
    "clientPinCode" TEXT,
    "clientPhone" TEXT,
    "clientEmail" TEXT,
    "finalizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Quotation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "QuotationItem" (
    "id" TEXT NOT NULL,
    "quotationId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "rate" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuotationItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "QuotationReferenceCounter" (
    "year" INTEGER NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "QuotationReferenceCounter_pkey" PRIMARY KEY ("year")
);

CREATE TABLE IF NOT EXISTS "DocumentReferenceCounter" (
    "year" INTEGER NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DocumentReferenceCounter_pkey" PRIMARY KEY ("year")
);

CREATE TABLE IF NOT EXISTS "ApprovalRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "documentType" "DocumentType" NOT NULL,
    "minApprovers" INTEGER NOT NULL DEFAULT 1,
    "roleRequired" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ApprovalRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ApprovalStep" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "stepOrder" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "requiredRole" TEXT,
    "requiredUserId" TEXT,
    "isAutoApprove" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApprovalStep_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ApprovalRequest" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "ruleId" TEXT,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "requestedBy" TEXT,
    "requesterNote" TEXT,
    "decidedBy" TEXT,
    "decidedAt" TIMESTAMP(3),
    "decisionNote" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApprovalRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ApprovalHistoryEntry" (
    "id" TEXT NOT NULL,
    "approvalRequestId" TEXT NOT NULL,
    "action" "ApprovalAction" NOT NULL,
    "performedBy" TEXT,
    "comment" TEXT,
    "previousStatus" "DocumentStatus",
    "newStatus" "DocumentStatus",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApprovalHistoryEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "QRVerification" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "verificationUrl" TEXT,
    "qrDataUrl" TEXT,
    "scannedCount" INTEGER NOT NULL DEFAULT 0,
    "lastScannedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QRVerification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "description" TEXT,
    "userId" TEXT,
    "clientId" TEXT,
    "projectId" TEXT,
    "documentId" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Notification" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "userId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "actionUrl" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "StorageFile" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "bucket" TEXT NOT NULL,
    "region" TEXT,
    "etag" TEXT,
    "versionId" TEXT,
    "isVersioned" BOOLEAN NOT NULL DEFAULT false,
    "entityType" TEXT,
    "entityId" TEXT,
    "uploadedById" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "StorageFile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "StorageQuota" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "maxBytes" BIGINT NOT NULL DEFAULT 10737418240,
    "usedBytes" BIGINT NOT NULL DEFAULT 0,
    "fileCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StorageQuota_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "BackgroundJob" (
    "id" TEXT NOT NULL,
    "queue" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "result" JSONB,
    "error" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BackgroundJob_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "EmailLog" (
    "id" TEXT NOT NULL,
    "to" TEXT[],
    "cc" TEXT[],
    "bcc" TEXT[],
    "subject" TEXT NOT NULL,
    "templateId" TEXT,
    "body" TEXT NOT NULL,
    "attachments" JSONB,
    "status" "EmailStatus" NOT NULL DEFAULT 'PENDING',
    "provider" TEXT,
    "providerId" TEXT,
    "error" TEXT,
    "sentAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),
    "clickedAt" TIMESTAMP(3),
    "jobId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "EmailTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "htmlBody" TEXT NOT NULL,
    "textBody" TEXT,
    "variables" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SearchIndex" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "rank" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SearchIndex_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SavedSearch" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "filters" JSONB,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedSearch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AnalyticsSnapshot" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "metric" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "HealthCheck" (
    "id" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "latencyMs" INTEGER,
    "error" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HealthCheck_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "WebsitePage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT,
    "seoTitle" TEXT,
    "metaDescription" TEXT,
    "ogTitle" TEXT,
    "ogDescription" TEXT,
    "ogImage" TEXT,
    "status" "WebsitePageStatus" NOT NULL DEFAULT 'DRAFT',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "hideFromNav" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "lastEditedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "WebsitePage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "WebsiteSection" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "content" JSONB NOT NULL DEFAULT '{}',
    "publishedContent" JSONB,
    "position" INTEGER NOT NULL DEFAULT 0,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "WebsiteSection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "WebsiteService" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "shortDescription" TEXT,
    "fullDescription" TEXT,
    "features" JSONB,
    "faqs" JSONB,
    "ctaText" TEXT,
    "ctaUrl" TEXT,
    "image" TEXT,
    "icon" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "status" "WebsitePageStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "WebsiteService_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "WebsiteTestimonial" (
    "id" TEXT NOT NULL,
    "personName" TEXT NOT NULL,
    "designation" TEXT,
    "company" TEXT,
    "location" TEXT,
    "project" TEXT,
    "quote" TEXT NOT NULL,
    "rating" INTEGER DEFAULT 5,
    "photo" TEXT,
    "approval" "TestimonialApproval" NOT NULL DEFAULT 'DRAFT',
    "approvalNote" TEXT,
    "sourceNote" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "WebsiteTestimonial_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "WebsiteClient" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT,
    "websiteUrl" TEXT,
    "altText" TEXT,
    "description" TEXT,
    "sector" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "WebsiteClient_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "WebsiteGalleryItem" (
    "id" TEXT NOT NULL,
    "mediaUrl" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "caption" TEXT,
    "altText" TEXT,
    "category" TEXT,
    "sourceType" "ImageSourceType" NOT NULL DEFAULT 'REAL_PROJECT',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "width" INTEGER,
    "height" INTEGER,
    "fileSize" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "WebsiteGalleryItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "WebsiteNavItem" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "openNewTab" BOOLEAN NOT NULL DEFAULT false,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "WebsiteNavItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "WebsiteSettings" (
    "id" TEXT NOT NULL,
    "businessName" TEXT,
    "shortDescription" TEXT,
    "phone" TEXT,
    "phone2" TEXT,
    "whatsapp" TEXT,
    "email" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "pinCode" TEXT,
    "googleMapsUrl" TEXT,
    "googleBusinessUrl" TEXT,
    "serviceArea" TEXT,
    "businessHours" JSONB,
    "websiteUrl" TEXT,
    "primaryLogoUrl" TEXT,
    "lightLogoUrl" TEXT,
    "darkLogoUrl" TEXT,
    "mobileLogoUrl" TEXT,
    "faviconUrl" TEXT,
    "defaultOgImage" TEXT,
    "footerContent" TEXT,
    "copyrightText" TEXT,
    "founderName" TEXT,
    "founderTitle" TEXT,
    "founderBio" TEXT,
    "founderPhoto" TEXT,
    "mission" TEXT,
    "vision" TEXT,
    "publishedData" JSONB,
    "publishedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebsiteSettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "WebsiteSeo" (
    "id" TEXT NOT NULL,
    "globalTitle" TEXT,
    "globalDescription" TEXT,
    "defaultOgImage" TEXT,
    "twitterTitle" TEXT,
    "twitterDescription" TEXT,
    "twitterImage" TEXT,
    "canonicalUrl" TEXT,
    "robotsSettings" TEXT,
    "structuredData" JSONB,
    "publishedData" JSONB,
    "publishedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebsiteSeo_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

CREATE UNIQUE INDEX IF NOT EXISTS "Session_sessionToken_key" ON "Session"("sessionToken");

CREATE UNIQUE INDEX IF NOT EXISTS "VerificationToken_token_key" ON "VerificationToken"("token");

CREATE UNIQUE INDEX IF NOT EXISTS "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");

CREATE UNIQUE INDEX IF NOT EXISTS "Role_name_key" ON "Role"("name");

CREATE INDEX IF NOT EXISTS "Client_email_idx" ON "Client"("email");

CREATE INDEX IF NOT EXISTS "Client_companyName_idx" ON "Client"("companyName");

CREATE UNIQUE INDEX IF NOT EXISTS "Document_reference_key" ON "Document"("reference");

CREATE INDEX IF NOT EXISTS "Document_type_status_idx" ON "Document"("type", "status");

CREATE INDEX IF NOT EXISTS "Document_clientId_idx" ON "Document"("clientId");

CREATE INDEX IF NOT EXISTS "Document_createdById_idx" ON "Document"("createdById");

CREATE INDEX IF NOT EXISTS "Document_createdAt_idx" ON "Document"("createdAt");

CREATE UNIQUE INDEX IF NOT EXISTS "DocumentVersion_documentId_versionNumber_key" ON "DocumentVersion"("documentId", "versionNumber");

CREATE UNIQUE INDEX IF NOT EXISTS "Quotation_reference_key" ON "Quotation"("reference");

CREATE INDEX IF NOT EXISTS "Quotation_status_idx" ON "Quotation"("status");

CREATE INDEX IF NOT EXISTS "Quotation_clientId_idx" ON "Quotation"("clientId");

CREATE UNIQUE INDEX IF NOT EXISTS "ApprovalRule_documentType_name_key" ON "ApprovalRule"("documentType", "name");

CREATE INDEX IF NOT EXISTS "ApprovalRequest_documentId_idx" ON "ApprovalRequest"("documentId");

CREATE INDEX IF NOT EXISTS "ApprovalRequest_status_idx" ON "ApprovalRequest"("status");

CREATE INDEX IF NOT EXISTS "ApprovalHistoryEntry_approvalRequestId_idx" ON "ApprovalHistoryEntry"("approvalRequestId");

CREATE UNIQUE INDEX IF NOT EXISTS "QRVerification_code_key" ON "QRVerification"("code");

CREATE INDEX IF NOT EXISTS "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

CREATE INDEX IF NOT EXISTS "AuditLog_documentId_idx" ON "AuditLog"("documentId");

CREATE INDEX IF NOT EXISTS "AuditLog_userId_idx" ON "AuditLog"("userId");

CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

CREATE INDEX IF NOT EXISTS "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

CREATE INDEX IF NOT EXISTS "Notification_createdAt_idx" ON "Notification"("createdAt");

CREATE UNIQUE INDEX IF NOT EXISTS "StorageFile_key_key" ON "StorageFile"("key");

CREATE INDEX IF NOT EXISTS "StorageFile_entityType_entityId_idx" ON "StorageFile"("entityType", "entityId");

CREATE INDEX IF NOT EXISTS "StorageFile_bucket_idx" ON "StorageFile"("bucket");

CREATE INDEX IF NOT EXISTS "StorageFile_mimeType_idx" ON "StorageFile"("mimeType");

CREATE INDEX IF NOT EXISTS "StorageFile_createdAt_idx" ON "StorageFile"("createdAt");

CREATE UNIQUE INDEX IF NOT EXISTS "StorageQuota_entityType_key" ON "StorageQuota"("entityType");

CREATE UNIQUE INDEX IF NOT EXISTS "StorageQuota_entityId_key" ON "StorageQuota"("entityId");

CREATE INDEX IF NOT EXISTS "BackgroundJob_queue_status_idx" ON "BackgroundJob"("queue", "status");

CREATE INDEX IF NOT EXISTS "BackgroundJob_status_priority_idx" ON "BackgroundJob"("status", "priority");

CREATE INDEX IF NOT EXISTS "BackgroundJob_type_idx" ON "BackgroundJob"("type");

CREATE INDEX IF NOT EXISTS "BackgroundJob_createdAt_idx" ON "BackgroundJob"("createdAt");

CREATE INDEX IF NOT EXISTS "EmailLog_status_idx" ON "EmailLog"("status");

CREATE INDEX IF NOT EXISTS "EmailLog_templateId_idx" ON "EmailLog"("templateId");

CREATE INDEX IF NOT EXISTS "EmailLog_createdAt_idx" ON "EmailLog"("createdAt");

CREATE UNIQUE INDEX IF NOT EXISTS "EmailTemplate_name_key" ON "EmailTemplate"("name");

CREATE INDEX IF NOT EXISTS "SearchIndex_entityType_idx" ON "SearchIndex"("entityType");

CREATE INDEX IF NOT EXISTS "SearchIndex_rank_idx" ON "SearchIndex"("rank");

CREATE UNIQUE INDEX IF NOT EXISTS "SearchIndex_entityType_entityId_key" ON "SearchIndex"("entityType", "entityId");

CREATE INDEX IF NOT EXISTS "AnalyticsSnapshot_metric_idx" ON "AnalyticsSnapshot"("metric");

CREATE INDEX IF NOT EXISTS "AnalyticsSnapshot_date_idx" ON "AnalyticsSnapshot"("date");

CREATE UNIQUE INDEX IF NOT EXISTS "AnalyticsSnapshot_date_metric_key" ON "AnalyticsSnapshot"("date", "metric");

CREATE INDEX IF NOT EXISTS "HealthCheck_service_createdAt_idx" ON "HealthCheck"("service", "createdAt");

CREATE UNIQUE INDEX IF NOT EXISTS "WebsitePage_slug_key" ON "WebsitePage"("slug");

CREATE INDEX IF NOT EXISTS "WebsitePage_slug_idx" ON "WebsitePage"("slug");

CREATE INDEX IF NOT EXISTS "WebsitePage_status_idx" ON "WebsitePage"("status");

CREATE INDEX IF NOT EXISTS "WebsitePage_sortOrder_idx" ON "WebsitePage"("sortOrder");

CREATE INDEX IF NOT EXISTS "WebsiteSection_pageId_position_idx" ON "WebsiteSection"("pageId", "position");

CREATE INDEX IF NOT EXISTS "WebsiteSection_type_idx" ON "WebsiteSection"("type");

CREATE UNIQUE INDEX IF NOT EXISTS "WebsiteService_slug_key" ON "WebsiteService"("slug");

CREATE INDEX IF NOT EXISTS "WebsiteService_slug_idx" ON "WebsiteService"("slug");

CREATE INDEX IF NOT EXISTS "WebsiteService_status_idx" ON "WebsiteService"("status");

CREATE INDEX IF NOT EXISTS "WebsiteService_position_idx" ON "WebsiteService"("position");

CREATE INDEX IF NOT EXISTS "WebsiteTestimonial_approval_idx" ON "WebsiteTestimonial"("approval");

CREATE INDEX IF NOT EXISTS "WebsiteTestimonial_position_idx" ON "WebsiteTestimonial"("position");

CREATE INDEX IF NOT EXISTS "WebsiteClient_position_idx" ON "WebsiteClient"("position");

CREATE INDEX IF NOT EXISTS "WebsiteClient_featured_idx" ON "WebsiteClient"("featured");

CREATE INDEX IF NOT EXISTS "WebsiteGalleryItem_category_idx" ON "WebsiteGalleryItem"("category");

CREATE INDEX IF NOT EXISTS "WebsiteGalleryItem_position_idx" ON "WebsiteGalleryItem"("position");

CREATE INDEX IF NOT EXISTS "WebsiteGalleryItem_visible_idx" ON "WebsiteGalleryItem"("visible");

CREATE INDEX IF NOT EXISTS "WebsiteNavItem_position_idx" ON "WebsiteNavItem"("position");

CREATE INDEX IF NOT EXISTS "WebsiteNavItem_parentId_idx" ON "WebsiteNavItem"("parentId");

DO $$ BEGIN
  ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Permission" ADD CONSTRAINT "Permission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Client" ADD CONSTRAINT "Client_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Project" ADD CONSTRAINT "Project_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ProjectPhase" ADD CONSTRAINT "ProjectPhase_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Document" ADD CONSTRAINT "Document_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "DocumentTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Document" ADD CONSTRAINT "Document_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Document" ADD CONSTRAINT "Document_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Document" ADD CONSTRAINT "Document_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "DocumentVersion" ADD CONSTRAINT "DocumentVersion_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "DocumentItem" ADD CONSTRAINT "DocumentItem_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "DocumentSection" ADD CONSTRAINT "DocumentSection_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "QuotationItem" ADD CONSTRAINT "QuotationItem_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ApprovalStep" ADD CONSTRAINT "ApprovalStep_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "ApprovalRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ApprovalHistoryEntry" ADD CONSTRAINT "ApprovalHistoryEntry_approvalRequestId_fkey" FOREIGN KEY ("approvalRequestId") REFERENCES "ApprovalRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "QRVerification" ADD CONSTRAINT "QRVerification_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "WebsiteSection" ADD CONSTRAINT "WebsiteSection_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "WebsitePage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
