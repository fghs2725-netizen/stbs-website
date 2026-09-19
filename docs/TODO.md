# STBS rebuild: TODO

Last updated 2026-09-19, after Phase 4c. Nothing here has been pushed or applied to production.

## A. Done: Phase 4c (contact, quote, gallery)

- [x] Contact page on shared renderers (placeholder map box removed, WhatsApp tile, tel/mailto links)
- [x] Gallery renderer (duotone, 4:3, captions below, no gradient overlay) and honest empty state
- [x] Quote form rebuilt: shared zod schema, inline errors, honeypot, `POST /api/quote`, real failure state
- [x] Verified the form in a browser (24 checks: validation, focus, loading, success, failure fallbacks, honeypot). Request intercepted, nothing sent.
- [x] Verified `/api/quote` paths that do not send (422 / 400 / 413 / 405 / honeypot / 429); EmailLog untouched
- [x] Quote page at 375px and gallery preview checked visually
- [x] Gate (tsc, lint, 6 test suites, build) and commit 4c

## B. Engineering still to do

### Phase 5: technical and SEO (Brief 1, Part D)
- [ ] Footer rebuild: registered address, GSTIN, business hours, service-area list, WhatsApp link, Google Maps embed, Privacy and Terms links (placeholders where data is missing). Old footer fails contrast (4.23:1).
- [ ] `/privacy` and `/terms` placeholder pages (also fixes the existing 404 link from `/verify/[code]`)
- [ ] WhatsApp float: pre-filled message, `aria-label`, ~400px scroll threshold, must not overlap the mobile footer CTA, put inside a landmark (axe "region" finding)
- [ ] JSON-LD: legal name, logo, `serviceType[]`, district-level `areaServed`; address / hours / geo only once supplied
- [ ] Per-page titles and descriptions with natural local keywords (Sonipat, Panipat, Gurugram, Rohtak, Kundli, NCR)
- [ ] Sitemap: add `/privacy`, `/terms`
- [ ] Image pass: unused ~2.8 MB `hero-industrial-cross-section.png`, duplicate logos, remaining PNG/JPEG; alt-text audit of every image
- [ ] Lighthouse on `/` (target 95+ performance, 100 accessibility)
- [ ] Extend `scripts/browser-editor-qa.ts` to cover the new homepage sections (it is written for the old ones; needs a non-production DB to run)

### Security backlog (from the audit)
- [ ] M-1 role checks on the ~30 session-only API routes
- [ ] M-3 CSRF / Origin checks on custom routes
- [ ] M-4 rate limiter trusts `x-forwarded-for` and is per-process without Redis
- [ ] M-5 one `AUTH_SECRET` used for three purposes; add rotation / separate secrets
- [ ] L-1 storage routes return `STORAGE_ACCESS_KEY_ID` in placeholder presigned URLs
- [ ] L-4 add a Content-Security-Policy; L-5 stop logging attempted login emails
- [ ] Dockerfile copies `.next/standalone` but `next.config.ts` never sets `output: "standalone"`

### Repo hygiene
- [ ] Untrack committed dev-server `.log` files, `project_structure.json` (5.6 MB) and `tsconfig.tsbuildinfo`
- [ ] Remove dead code: `components/documents/sections/**`, `lib/documents/**`, `lib/cache/redis-cache.ts`, `SavedQuotationPdf.tsx`
- [ ] Remove unused deps: `react-hook-form`, `@hookform/resolvers`, `@phosphor-icons/react`, `motion` (duplicate of framer-motion), `shadcn-ui` (a CLI)
- [ ] Old static `Testimonials` placeholder component in `site-additions.tsx` (unused; kept because testimonial content must not be deleted)

### Brief 2: admin panel (analysis done; code not started)
- [ ] Phase 6: quotation snapshot regression test (3 fixtures, HTML + PNG baseline, diff). The template component already exists.
- [ ] Phase 7: quotation editor rebuild. **Blocked on Q1-Q6** below.
- [ ] Phase 8: DOCX export (PDF export already exists and is server-side)
- [ ] Phase 9: website editor: zod schemas, character counters, required alt text, client-side image compression, last-10-versions history with rollback, unsaved-changes warning, publish confirmation

### Migration (`scripts/migrate-homepage.ts`, 11 steps, 30 changes, dry run only)
- [ ] Decide: run `--rehearse` against production (executes writes inside a transaction, then rolls back), then `--apply`
- [ ] After apply: check live homepage, `/clients` logos, navbar (Services, Clients, Projects, Contact)

## C. Needed from the owner (not invented; placeholders until supplied)

### Decisions (quotation, blocks Phase 7)
- [ ] Q1 GST: add real CGST/SGST/IGST lines (changes the locked output) or keep the prose term?
- [ ] Q2 Discount: add?
- [ ] Q3 Amount in words: add? (adds a totals row)
- [ ] Q4 Line items: add a "specification / size" column (seventh column)?
- [ ] Q5 Numbering: existing `STBS/{year}/{NNN}`; migrate to financial-year `STBS/2026-27/0142`, apply to new only, or keep?
- [ ] Q6 Page 4 is a hard cap (PDF fails on any other page count): allow the price offer to paginate?
- [ ] The quotation template hardcodes "30+" (years) on page 3, which contradicts 34. It is locked; change it?

### Business data
- [ ] Registered office address and pincode (documents show Dipalpur Road, Bhalgarh, Sonipat; 131021 in most, 131001 in one)
- [ ] GSTIN (consistent on your documents) and permission to publish it
- [ ] Business hours: the contact page says Mon-Sat 8:00-19:00, Sunday emergency only. Existing copy, unverified.
- [ ] Geo coordinates for JSON-LD; a real map location once an address is public
- [ ] Email delivery for the quote form: set `SMTP_HOST/PORT/USER/PASS/FROM` (or `RESEND_API_KEY`) in Vercel, and optionally `QUOTE_TO_EMAIL` (defaults to stbs2025@gmail.com). Until then the form shows its failure state with Call / WhatsApp / Email.
- [ ] Do the `info@stbs.in` / `quotes@stbs.in` mailboxes exist? (Email replacement was dropped; gmail stays everywhere.)

### Content and permissions
- [ ] Real hero photo: the current one looks computer-generated to me
- [ ] Confirm `site_pic.jpeg`, `Site_pic_2.jpeg` and the founder portrait are your own photos
- [ ] Real project results (yield, completion date, site photos) for the three featured projects
- [ ] Confirm Ashoka pipe diameter (160 mm in the description, 150 mm in the remarks) and the "4 sets / 8 boreholes" count
- [ ] Permission to name EOC Polymers (not on your client list), and client comfort with their logos; better logo files for Ashoka and BigBasket
- [ ] Company-profile PDF (`/company-profile` is a placeholder; upload `public/docs/stbs-company-profile.pdf` and change the hero CTA URL)
- [ ] Real, approved testimonials (the 5 rows in the CMS are unapproved drafts)
- [ ] Service-specific process, materials and typical-timeline content for Rainwater Harvesting and Material Supply; real FAQ answers (depth, turnaround, licensing, warranty)
- [ ] Confirm About copy: "Starting as a one-man operation", "over 1,200 projects"

### Actions only you can take
- [ ] Rotate the `admin@stbs.com` seed password if the seed ever ran against production (H-2); confirm `AUTH_SECRET` is not the compose default (H-3)
- [ ] Confirm `NEXT_PUBLIC_SITE_URL` in Vercel is `https://www.stbs.in` (or unset); add the `sainitubewell.com` -> `www.stbs.in` redirect
- [ ] Be careful sharing the BigBasket PO: it contains STBS bank account details

## D. Known limitations to remember
- Old footer and WhatsApp button still frame every page until Phase 5
- `.env` points at the **production** database: `test:publish`, `test:storage-blob` and `browser-editor-qa` write data and must not be run against it
- Interior-page H1s use the H2 type scale by design; the 40-76px scale is reserved for the homepage hero
