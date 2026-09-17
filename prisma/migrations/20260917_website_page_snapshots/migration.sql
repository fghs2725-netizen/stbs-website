-- Keep page metadata (including the public Open Graph image) in the same
-- immutable published snapshot model as sections and collection records.
ALTER TABLE "WebsitePage" ADD COLUMN "publishedData" JSONB;

-- Preserve the currently visible metadata for pages that were published before
-- this column existed. Future publishes overwrite this snapshot atomically.
UPDATE "WebsitePage"
SET "publishedData" = jsonb_build_object(
  'name', "name",
  'slug', "slug",
  'title', "title",
  'seoTitle', "seoTitle",
  'metaDescription', "metaDescription",
  'ogTitle', "ogTitle",
  'ogDescription', "ogDescription",
  'ogImage', "ogImage",
  'sortOrder', "sortOrder",
  'hideFromNav', "hideFromNav"
)
WHERE "publishedAt" IS NOT NULL;
