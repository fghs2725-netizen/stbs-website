-- Quotation templates: editable wording, one marked default, chosen per quotation.
-- Purely additive: a new table plus three nullable columns on "Quotation". Existing
-- quotations keep rendering exactly as before (null template = the default wording),
-- and the code already live keeps working because it never reads any of this.
CREATE TABLE "QuotationTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "layout" TEXT NOT NULL DEFAULT 'classic',
    "content" JSONB NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuotationTemplate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "QuotationTemplate_isDefault_idx" ON "QuotationTemplate"("isDefault");

ALTER TABLE "Quotation" ADD COLUMN "templateId" TEXT;
ALTER TABLE "Quotation" ADD COLUMN "templateSnapshot" JSONB;

ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "QuotationTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
