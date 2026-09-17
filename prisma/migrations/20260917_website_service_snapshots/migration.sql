-- Keep the last published service card live while its current fields are edited as a draft.
ALTER TABLE "WebsiteService" ADD COLUMN "publishedData" JSONB;
