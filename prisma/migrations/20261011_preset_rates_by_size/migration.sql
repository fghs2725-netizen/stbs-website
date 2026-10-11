-- Last quoted rate per size for each quotation preset line (e.g. drilling at 300 mm vs 160 mm).
ALTER TABLE "QuotationPresetItem" ADD COLUMN "lastRates" JSONB;
