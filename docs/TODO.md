# STBS rebuild: TODO

Last updated 2026-09-19, after Phase 7b (discount / GST / multi-page quotation) and the client logo wall. Nothing here has been pushed or applied to production.

## A. Done: Phases 4c, 5 and 6

- [x] 4c: contact, quote (real `POST /api/quote`, honeypot, rate limit, no false success) and gallery on shared renderers
- [x] 5a: footer (address / GSTIN / hours shown only when supplied), `/privacy` and `/terms` placeholders (noindex), WhatsApp float in a landmark
- [x] 5b: per-page titles/descriptions (`lib/website/seo-copy.ts`), LocalBusiness JSON-LD without invented address/geo, canonical host `www.stbs.in`, CMS metadata step in the migration
- [x] 5c: 3 unused assets deleted (~3.8 MB), alt-text audit clean. Lighthouse (local production build, simulated mobile): desktop `/` perf 98, mobile `/` perf 82-88 (LCP 3.3 s), accessibility / best-practices / SEO 100. See B for why mobile is lower.
- [x] 6: quotation template lock: `npm run test:quotation-snapshot` (3 fixtures, HTML + per-page PNG + PDF page count; baselines in `tests/quotation-snapshots/`). Template files were not touched. Re-record with `-- --update` only for an intended template change.

## B. Engineering still to do

### Performance (Lighthouse follow-ups)
- [ ] Mobile `/` LCP is the CMS hero image (the original upload is a 2.6 MB PNG; the optimizer serves a 44 KB AVIF). Upload the real photo as a compressed JPEG/WebP (< 300 KB) when you replace the hero, then re-run Lighthouse against the deployed URL (local numbers include cold DB and image-cache cost)
- [ ] Home is `force-dynamic` (TTFB ~2 s cold); consider ISR with on-publish revalidation
- [ ] Re-run `/services` Lighthouse SEO (one local run flagged the meta description although the tag is present)
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
- [x] Phase 6: quotation snapshot regression test (done)
- Finding for Q6: the price table sits on a fixed 297mm page with `overflow:hidden`; a long item list is clipped, not paginated (see `many-items` baseline)
- [x] Phase 7 (done, no template / schema change): line-items table (add, delete with confirm, duplicate, drag + arrow reorder, Tab / Enter / Escape, Indian grouping on blur, numeric-only), undo / redo (Ctrl+Z / Ctrl+Y), autosave of existing drafts with Saved / Saving / Unsaved / Not saved state, Ctrl+S save and Ctrl+P PDF, toasts, confirm dialogs (delete row, finalize, new), inline "what is missing" before finalize, preview debounced 200 ms, list view with search, status, created-date range, sort, amount, view / edit / PDF / duplicate / delete (soft delete via `deletedAt`, restorable).
- [x] Phase 7b (owner-approved template change): single discount (percent or flat) on the subtotal, optional GST per quotation (CGST+SGST or IGST, rate editable, default 18%), amount in words (Indian lakh/crore), client GSTIN (optional) and seller GSTIN printed when GST is on, the "Taxes" term hidden when GST is on, and a price section that flows onto extra pages (`04 / 06` numbering, headers repeated, totals only on the last page). Additive migration `20260919_quotation_discount_gst` applied. Existing quotations render unchanged apart from the new amount-in-words line.
- [x] Client logo wall on the quotation's Company Profile page (8 logos; BigBasket and O.P. Jindal Global University added to the list). The other 13 names stay as text.
- [ ] Still needs owner decisions: specification column, financial-year numbering (current `STBS/{year}/{NNN}` kept), page-4 wording; saved terms / standard-items libraries and an expiry date need a schema change
- [ ] Logo permission: confirm each client is comfortable with its logo on a commercial quotation, not only on the website. BigBasket's file is only 161x65 (soft in print); a better file would help.
- [ ] Not browser-tested: the full editor (autosave, finalize, list actions) because saving writes to the database in `.env`, which is production. Table, keyboard, undo and dialogs are covered by `npm run test:quotation-items-ui` on a dev-only harness (`/internal/quotation-items-harness`). Please click through the editor once on a non-production database.
- [ ] Phase 8: DOCX export (PDF export already exists and is server-side)
- [ ] Phase 9: website editor: zod schemas, character counters, required alt text, client-side image compression, last-10-versions history with rollback, unsaved-changes warning, publish confirmation

### Migration (`scripts/migrate-homepage.ts`, 12 steps, 38 changes, dry run only)
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
- `.env` points at the **production** database: `test:publish`, `test:storage-blob` and `browser-editor-qa` write data and must not be run against it
- Interior-page H1s use the H2 type scale by design; the 40-76px scale is reserved for the homepage hero
