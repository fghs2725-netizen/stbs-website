-- Quotation presets: additive only. Nothing existing is altered or dropped.

CREATE TABLE "QuotationPreset" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuotationPreset_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "QuotationPreset_key_key" ON "QuotationPreset"("key");

-- One question. "key" is the placeholder it answers; "options" are the choices offered for it.
CREATE TABLE "QuotationPresetField" (
    "id" TEXT NOT NULL,
    "presetId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "allowCustom" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "QuotationPresetField_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "QuotationPresetField_presetId_key_key" ON "QuotationPresetField"("presetId", "key");

CREATE TABLE "QuotationPresetItem" (
    "id" TEXT NOT NULL,
    "presetId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "lastRate" DECIMAL(12,2),

    CONSTRAINT "QuotationPresetItem_pkey" PRIMARY KEY ("id")
);

-- Where a generated line came from, so its rate can find its way back once the quotation is final.
ALTER TABLE "QuotationItem" ADD COLUMN "presetItemId" TEXT;

ALTER TABLE "QuotationPresetField" ADD CONSTRAINT "QuotationPresetField_presetId_fkey"
    FOREIGN KEY ("presetId") REFERENCES "QuotationPreset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "QuotationPresetItem" ADD CONSTRAINT "QuotationPresetItem_presetId_fkey"
    FOREIGN KEY ("presetId") REFERENCES "QuotationPreset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "QuotationItem" ADD CONSTRAINT "QuotationItem_presetItemId_fkey"
    FOREIGN KEY ("presetItemId") REFERENCES "QuotationPresetItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
