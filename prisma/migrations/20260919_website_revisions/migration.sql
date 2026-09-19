-- Version history for website content: the previously PUBLISHED snapshot of a page, service, client,
-- gallery item, settings or SEO row is stored before it is overwritten (application keeps the newest 10
-- per item). Purely additive: one new table, nothing existing is changed. The application treats a
-- missing table as "history unavailable", so it is safe to deploy the code before applying this.
CREATE TABLE "WebsiteRevision" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,

    CONSTRAINT "WebsiteRevision_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WebsiteRevision_entityType_entityId_createdAt_idx" ON "WebsiteRevision"("entityType", "entityId", "createdAt");
