-- Projects drafted from the owner's billing records (Vyapar backup, Oct 2026) and approved for the site.
-- Ordered scope only: no rates, amounts or GSTINs. Published, not on the homepage; photos are added in the admin.
-- Fixed ids and ON CONFLICT keep a re-run harmless.
INSERT INTO "WebsiteProject" ("id", "title", "location", "sector", "summary", "scope", "depth", "output", "year", "photos", "published", "featured", "position", "createdAt", "updatedAt") VALUES
  ('seed-project-4', 'Rainwater harvesting borewells, Y.P. Infratech', 'Dwarka, New Delhi', 'Commercial', 'Five 300 mm rainwater harvesting borewells installed, with a water test report.', '300 mm rainwater harvesting borewell installation, 5 nos
Water test report', NULL, NULL, '2026', '[]', true, false, 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('seed-project-5', 'Rainwater harvesting borewell and recharge chamber, Jain Electroplast', 'Nathupur Industrial Area, Sonipat', 'Industrial', '116 m of 300 mm drilling with 200 mm PVC pipe, gravel pack, bore cleaning and an RCC recharge chamber.', '300 mm borewell drilling for rainwater harvesting, 116 m
200 mm PVC pipe, 10 kg/cm² pressure rating, 92 m
Slotted filter assembly with fittings and end cap, 36 m
Gravel pack (4–6 mm, double washed), 200 ft
Bore cleaning with heavy-duty pump
RCC chamber with RCC cover and overflow pipe to the outside', '116 m', NULL, '2026', '[]', true, false, 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('seed-project-6', 'Rainwater harvesting borewells, Indogulf Cropsciences', 'Barwasni, Sonipat', 'Industrial', 'Two 300 mm rainwater harvesting borewells, 132 m each, with 200 mm PVC pipe, slotted filter and gravel pack, plus a 75 m borewell in 2026.', '300 mm borewell drilling, two borewells of 132 m each
200 mm PVC pipe, 10 kg/cm² pressure rating, 132 m per borewell
Slotted filter assembly with fittings, 48 m per borewell
Gravel pack (4–6 mm, double washed), 300 ft per borewell
Bore cleaning and gravel packing
Further 300 mm borewell, 75 m, with 60 m of 200 mm PVC pipe (April 2026)', '132 m', NULL, '2025–26', '[]', true, false, 6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('seed-project-7', 'Rainwater harvesting borewell, DS Cold Storage Chain', 'Murthal Road, Sonipat', 'Cold storage', '95 m of 300 mm drilling with 200 mm PVC pipe, filter assembly, gravel pack and bore cleaning.', '300 mm borewell drilling for rainwater harvesting, 95 m
200 mm PVC pipe, 10 kg/cm² pressure rating, 77 m
Filter assembly with fittings and end cap, 12 m
Gravel pack and packing labour
Bore cleaning', '95 m', NULL, '2026', '[]', true, false, 7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('seed-project-8', 'Water supply borewells with pumping system, Shine India Sales and Services', 'Buana Lakhu, Panipat', 'Commercial', 'Two 300 mm borewells (150 m and 135 m) with 225 mm PVC casing, 7.5 HP submersible pump, delivery line, cable and starter panel.', '300 mm borewell drilling, 150 m and 135 m
225 mm PVC pipe, 10 kg/cm² pressure rating, 135 m and 120 m
Slotted filter assembly, 36 m per borewell
7.5 HP submersible pump with pump fitting, pump lock and safety wire
3 in HDPE delivery pipe, 50 m, with plate pipe and flange
6 mm 3-core copper cable, 80 m
Starter panel with voltmeter and ammeter
Bore cleaning with heavy-duty pump', 'Up to 150 m', NULL, '2026', '[]', true, false, 8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('seed-project-9', 'Industrial borewells, Bahadurgarh footwear and laminate units', 'MIE and HSIIDC Sector 17, Bahadurgarh', 'Industrial', '300 mm borewells with pumping set-ups for six factories: Green Line Laminates, Singhla Laminates, Ojas Footwear, Dayz Footwear, Kapur Rubber Industries and Welcome Polymers.', '300 mm borewell drilling
225 mm PVC pipe, 10 kg/cm² pressure rating, with reducer sockets and fittings
3 in delivery pipe, 70 m, with plate pipe
6 mm 3-core copper cable, 100 m
Starter panel', NULL, NULL, '2026', '[]', true, false, 9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('seed-project-10', 'Submersible pump installations, Bahadurgarh industrial units', 'HSIIDC Sector 17, MIE and Kassar Road, Bahadurgarh', 'Industrial', '7.5 to 12.5 HP submersible pump sets for about ten factories, including A R V Footwear, S.G. Footwears, A.P. Plastic Industries and SFR Footwear.', 'Submersible pump sets, 7.5 HP (5 stage) to 12.5 HP
225 mm PVC pipe with reducer sockets and fittings
3 in delivery pipe with plate pipe, SS nipple and flange welding
6 mm 3-core copper cable, about 100 ft per set
Pump lock and safety rope
Starter panel where ordered', NULL, NULL, '2025–26', '[]', true, false, 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('seed-project-11', 'Borewells and pumping, Toyo Springs', 'Bahalgarh Road, Sonipat', 'Industrial', 'Several borewells drilled and cleaned across three orders, one with a submersible pump, delivery line and starter panel.', 'Borewell drilling, 304.8 m (1,000 ft) on the first order, then 290 ft and 300 ft
PVC casing with filter assemblies, fittings and end caps
Gravel pack
Bore cleaning with heavy-duty pump
Submersible pump with 50 m delivery pipe, 60 m cable and starter panel', NULL, NULL, '2021–22', '[]', true, false, 11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('seed-project-12', 'Borewells and water supply, Kirorimal Kashiram Marketing and Agencies', 'Bhurri, Sonipat', 'Distribution', 'Borewells drilled and cased over two orders, 500 ft on the second, with delivery line, cable and starter panel.', 'Borewell drilling, 500 ft (second order)
PVC casing with 12 filter assemblies and fittings
Gravel pack, 400 ft
3 in delivery pipe, 220 ft, with plate pipe and fittings
3-core copper cable, about 548 m
Starter panel and bore cleaning', NULL, NULL, '2021–22', '[]', true, false, 12, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('seed-project-13', 'Large-diameter borewells, LT Foods', 'GT Road, Bahalgarh, Sonipat', 'Food processing', '12 in (300 mm) borewell drilling, 1,682 ft in all with six bore cleanings, and six 300 mm piling borewells in 2025.', '12 in (300 mm) borewell drilling, 1,682 ft
Borewell cleaning, 6 nos
300 mm piling borewells, 6 nos (2025)', NULL, NULL, '2022, 2025', '[]', true, false, 13, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('seed-project-14', 'Borewells, Nextra City', 'Kharkhoda, Sonipat', 'Real estate development', '503 m of borewell drilling with PVC casing, filter assemblies and gravel pack.', 'Borewell drilling, 503 m
PVC pipe, 414 m
Filter assemblies with fittings and end caps, 108 m
Gravel pack, 850 sq ft
Borewell cleaning, 10 nos', NULL, NULL, '2024', '[]', true, false, 14, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('seed-project-15', 'Rainwater harvesting borewells and chambers, Capital Extrusion', 'HSIIDC Industrial Estate, Kundli, Sonipat', 'Industrial', '192 m of borewell drilling with slotted filters and gravel pack, four RCC rainwater chambers and two septic tank borewells.', 'Borewell drilling, 192 m
PVC pipe, 192 m
Slotted filters with fittings, 24 nos
Gravel pack, about 506 sq ft
RCC rainwater harvesting chambers with RCC covers and overflow pipe to the outside drain, 4 nos
RCC septic tank chambers with covers, 2 nos
12 in septic tank borewells with 200 mm PVC pipe and 20 m slotted filter, 2 nos', NULL, NULL, '2023', '[]', true, false, 15, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('seed-project-16', '800 mm borewell, Ludhiana Builders', 'Gurugram', 'Construction', '720 ft of 800 mm large-diameter borewell drilling.', '800 mm borewell drilling, 720 ft
Extra work as ordered', '720 ft', NULL, '2025', '[]', true, false, 16, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('seed-project-17', 'Rainwater harvesting borewells and pit maintenance, Usha Towers', 'Sonipat', 'Residential', 'Rainwater harvesting pit and borewell cleaning, then a 100 m, 300 mm borewell with 225 mm PVC casing.', 'Rainwater harvesting pit cleaning
Rainwater harvesting borewell cleaning
300 mm borewell drilling for rainwater harvesting, 100 m (2025)
225 mm PVC pipe, 10 kg/cm² pressure rating, 90 m
Filter assembly, 48 m
Gravel pack, 200 sq ft', NULL, NULL, '2024–25', '[]', true, false, 17, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('seed-project-18', 'Rainwater harvesting borewell, Swastik Polyvinyls', 'Kundli, Sonipat', 'Industrial', '62 m of 300 mm drilling with 200 mm PVC pipe, filters, gravel pack and cleaning by heavy-duty pump.', '300 mm borewell drilling for rainwater harvesting, 62 m
200 mm PVC pipe, 10 kg/cm² pressure rating
Filter assemblies, 5 nos
Gravel pack, 150 sq ft
Cleaning with heavy-duty pump', '62 m', NULL, '2022', '[]', true, false, 18, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('seed-project-19', 'Rainwater harvesting borewells, Jivo Wellness', 'Gannaur, Sonipat', 'Industrial', 'Two rainwater harvesting borewells constructed, 210 ft and 220 ft.', 'Rainwater harvesting borewell construction, 210 ft and 220 ft', 'Up to 220 ft', NULL, '2022', '[]', true, false, 19, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('seed-project-20', 'Borewell and pumping, Svera Agro', 'Dhaturi, Sonipat', 'Agro industry', 'Pump supply, then a borewell with PVC casing, delivery line, cable and starter panel.', '3 HP 15-stage submersible pump (2022)
PVC pipe and sockets with filter assemblies (2023)
3 in delivery pipe, 120 ft, with plate pipe
Copper cable, 50 m
Starter panel', NULL, NULL, '2022–23', '[]', true, false, 20, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('seed-project-21', 'Borewell, Savanah Seeds', 'Khewra, Sonipat', 'Agro industry', '220 ft borewell with PVC casing, three filter assemblies and bore cleaning.', 'Borewell drilling, 220 ft
PVC pipe with sockets
Filter assemblies, 3 nos
Borewell cleaning', '220 ft', NULL, '2024', '[]', true, false, 21, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('seed-project-22', 'Rainwater harvesting borewell and chamber, Shri Shyam Metals', 'Jhundpur Industrial Area, Bahalgarh, Sonipat', 'Industrial', '55 m borewell with PVC pipe and filter, and an RCC rainwater harvesting chamber.', 'Borewell drilling, 55 m
PVC pipe, filter, sockets and fittings
RCC rainwater harvesting chamber', '55 m', NULL, '2024', '[]', true, false, 22, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('seed-project-23', 'Rainwater harvesting borewell, IRS Polymers', 'Bazidpur Saboli, Rai, Sonipat', 'Industrial', '48 m of PVC casing with 24 m of slotted filter, gravel pack, chamber core cutting and bore cleaning.', 'PVC pipe, 48 m
Slotted filter, 24 m
Gravel pack, 100 sq ft
Chamber core cutting
Borewell cleaning', NULL, NULL, '2024', '[]', true, false, 23, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('seed-project-24', 'Rainwater harvesting chamber, Aquapop Bottlers', 'Badli, Jhajjar', 'Beverages', 'Rainwater harvesting chamber with chamber cover and manhole.', 'Rainwater harvesting chamber with chamber cover and manhole', NULL, NULL, '2025', '[]', true, false, 24, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('seed-project-25', 'Rainwater harvesting percolation boreholes, Ujjwal Contracts', 'Delhi', 'Construction', 'Three rainwater harvesting percolation boreholes drilled.', 'Rainwater harvesting percolation boreholes, 3 nos', NULL, NULL, '2024', '[]', true, false, 25, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('seed-project-26', 'Pump maintenance and repair, Sonipat Cooperative Sugar Mills and ECE Industries', 'Sonipat', 'Industrial', 'Submersible pump rewinding, bearing and bush replacement, and pump lowering and lifting for two large industrial sites.', 'Submersible motor winding and repair, including 20 HP units
Thrust plate bearing sets and motor bushes
Pump up and down service', NULL, NULL, '2022–25', '[]', true, false, 26, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('seed-project-27', 'Village borewells, Gram Panchayat Aurangabad', 'Aurangabad', 'Public water supply', 'Ten borewells drilled for the village panchayat.', 'Borewell drilling, 10 nos', NULL, NULL, '2026', '[]', true, false, 27, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('seed-project-28', 'Community borewell, Parmarth Samaj Sewi Sansthan', 'Urai, Jalaun, Uttar Pradesh', 'Community', '56 m borewell with PVC casing, slotted filters and gravel pack.', 'Borewell drilling, 56 m
PVC pipe, 56 m
Slotted filters with gravel setting labour, 2 nos', '56 m', NULL, '2022', '[]', true, false, 28, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
