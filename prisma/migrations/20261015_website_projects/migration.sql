-- CreateTable
CREATE TABLE "WebsiteProject" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "sector" TEXT NOT NULL DEFAULT '',
    "summary" TEXT NOT NULL DEFAULT '',
    "scope" TEXT,
    "depth" TEXT,
    "output" TEXT,
    "year" TEXT,
    "photos" JSONB NOT NULL DEFAULT '[]',
    "published" BOOLEAN NOT NULL DEFAULT false,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "WebsiteProject_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WebsiteProject_published_position_idx" ON "WebsiteProject"("published", "position");

-- The three projects the site already shows, so they appear in the admin list ready to edit.
INSERT INTO "WebsiteProject" ("id", "title", "location", "sector", "summary", "scope", "depth", "output", "year", "photos", "published", "featured", "position", "createdAt", "updatedAt") VALUES
  ('seed-project-1', 'Rainwater harvesting system, BigBasket distribution centre', 'Kundli, Sonipat', 'Warehousing & distribution', '220 ft of 250 mm drilling with 225 mm PVC pipe, gravel pack and bore cleaning by heavy-duty pump.', '250 mm borewell drilling, 220 ft
225 mm PVC pipe, 10 kg/cm² pressure rating
Filter assembly with fittings and end caps
Gravel pack, 200 ft
Bore cleaning with machine and heavy-duty pump', NULL, NULL, '2022', '[]', true, true, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('seed-project-2', 'Rainwater harvesting boreholes, Ashoka University North Campus', 'Rajiv Gandhi Education City, Sonipat', 'Institutional campus', 'Four sets of paired 300 mm percolation boreholes, up to 40 m deep, with slotted UPVC casing and pea-gravel pack.', 'Two boreholes per recharge pit, 300 mm, reverse rotary drilling in all soil types
Slotted UPVC casing, 6 kg/cm² (IS 12818 perforated slotted)
Pea-gravel pack, 3–6 mm, around the casing
Rig mobilisation and site restoration on completion
Ordered across two work orders, July and December 2022', 'Up to 40 m', NULL, '2022', '[]', true, true, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('seed-project-3', 'Rainwater harvesting pit, EOC Polymers', 'HSIIDC Industrial Estate, Barhi, Sonipat', 'Industrial', '80 m of 300 mm drilling with 225 mm PVC pipe, gravel pack and a 5.5 × 9 ft recharge pit including civil works.', '300 mm borewell drilling, 80 m
225 mm PVC pipe, about 216 ft
Filter assembly and gravel pack (4–6 mm, 250 ft)
Bore cleaning with machine and heavy-duty pump
Recharge pit 5.5 × 9 ft with labour, material and civil work', NULL, NULL, '2022', '[]', true, true, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
