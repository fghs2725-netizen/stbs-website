-- AlterTable
ALTER TABLE "WebsiteClient" ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "status" "WebsitePageStatus" NOT NULL DEFAULT 'DRAFT';

-- AlterTable
ALTER TABLE "WebsiteGalleryItem" ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "status" "WebsitePageStatus" NOT NULL DEFAULT 'DRAFT';

-- AlterTable
ALTER TABLE "WebsiteNavItem" ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "status" "WebsitePageStatus" NOT NULL DEFAULT 'DRAFT';

-- CreateIndex
CREATE INDEX "WebsiteClient_status_idx" ON "WebsiteClient"("status");

-- CreateIndex
CREATE INDEX "WebsiteGalleryItem_status_idx" ON "WebsiteGalleryItem"("status");

-- CreateIndex
CREATE INDEX "WebsiteNavItem_status_idx" ON "WebsiteNavItem"("status");

