-- Preserve a published gallery snapshot until its deletion is explicitly published.
ALTER TABLE "WebsiteGalleryItem" ADD COLUMN "deleteOnPublish" BOOLEAN NOT NULL DEFAULT false;
