-- Cash invoices: issued without a number, so the GST series has no gap. Existing invoices are not cash.
ALTER TABLE "Invoice" ADD COLUMN "isCash" BOOLEAN NOT NULL DEFAULT false;
