-- Units and per-invoice segments: additive only. Nothing existing is altered or dropped.

-- Which segments this one invoice adds or removes. NULL means it follows the global settings.
ALTER TABLE "Invoice" ADD COLUMN "settingsOverride" JSONB;

-- A unit the owner typed that was not built in, offered on every later quotation and invoice.
CREATE TABLE "CustomUnit" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomUnit_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CustomUnit_name_key" ON "CustomUnit"("name");
