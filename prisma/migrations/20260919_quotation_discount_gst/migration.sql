-- Optional discount and GST settings per quotation, plus an optional client GSTIN.
-- Purely additive: every column is nullable or has a default, so existing quotations
-- keep rendering exactly as before (no discount, GST off).
ALTER TABLE "Quotation" ADD COLUMN "clientGstin" TEXT;
ALTER TABLE "Quotation" ADD COLUMN "discountType" TEXT;
ALTER TABLE "Quotation" ADD COLUMN "discountValue" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "Quotation" ADD COLUMN "gstEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Quotation" ADD COLUMN "gstMode" TEXT;
ALTER TABLE "Quotation" ADD COLUMN "gstRate" DECIMAL(5,2) NOT NULL DEFAULT 18;
