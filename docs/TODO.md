# STBS rebuild: TODO

Last updated 2026-09-21, after the invoicing work (Brief 3). The quotation discount/GST migration and the
invoice migration have both been applied to production; the homepage content migration has not.

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
- [x] The `.log` files, `project_structure.json` and `tsconfig.tsbuildinfo` are already untracked (checked 2026-09-21; `git ls-files` returns none of them)
- [ ] Remove dead code: `components/documents/sections/**` (7 files plus its CSS) and `components/documents/shared/PageWrapper.tsx`, which only those files use, and `lib/cache/redis-cache.ts`. Checked 2026-09-21: **`lib/documents/**` is NOT dead** — the approvals and document-versions API routes import it, so the earlier note here was wrong. There is no `SavedQuotationPdf.tsx` in the repo.
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
- [x] Phase 8: Word (.docx) export via the `docx` library, `STBS-Quotation-{number}-{clientSlug}` filenames for PDF and Word, Word/Print buttons in the editor, Word on the detail page and list. Word is a close match, not pixel-identical: the side-panel artwork, watermark and brand fonts (Calibri fallback) are not reproduced. Not done: Share on WhatsApp (needs a shareable PDF link).
- [x] Phase 9 (code complete, browser-untested): server-side validation before every website save and a publish preflight that refuses to publish broken content (`lib/website/validation.ts`, zod); character counters on headlines and SEO fields; image upload guardrails (type/size check, auto-compression to WebP); required alt text; unsaved-changes warning; publish confirmation with a summary; toasts instead of `alert()`; version history UI with restore.
- [x] Phase 9 migration `20260919_website_revisions` is applied (confirmed 2026-09-21 by `prisma migrate status`), so version history is live. Still open from Phase 9: two live gallery photos have file names as alt text (WhatsApp image names) and will block publish until described. Alt text cannot be enforced (no column) for service images, testimonial and founder photos, logos, favicon and OG image.
- [ ] Phase 9 not verified in a browser: the website admin needs a login and every save writes to the live database, so I did not click through it. Test on a non-production database.

### Brief 3: invoicing (built 2026-09-21; migration applied, never run in a browser)

Owner's decisions are recorded in `docs/invoice-questionnaire.md` and were answered in full. The design
is `docs/invoice-design-v1.html`; the SQL that was applied is `docs/invoice-migration.sql`.

- [x] Migration `20260921_invoice` applied to production: 9 new tables, no existing table altered, no
      destructive statement. Verified after applying — 83 quotations, 893 quotation items and 1 client untouched.
- [x] Pure logic: totals, discount, CGST/SGST vs IGST from the client's state, round off, payments and
      balance, numbering from 764, conversion from a quotation (`npm run test:invoice`, 37 checks).
- [x] The printed invoice, with page breaks held by `npm run test:invoice-snapshot` (22 checks, 5 fixtures)
      — the check that matters is that nothing sits below the page box, because the heights are estimates.
- [x] Data layer: settings, save, issue, cancel, payments, credit notes, edit log, HSN library.
- [x] Screens: list with overdue ageing, detail with issue/pay/cancel, editor, settings, HSN codes.
- [x] Editor driven in a real browser on a dev-only harness (`npm run test:invoice-editor-ui`, 12 checks).
- [x] PDF, and share on WhatsApp or email, reusing the quotation's renderer and share sheet.
- [x] Raise invoice on a quotation; it then links to the invoice instead (one invoice per quotation).
- [ ] **Never run against a real database.** Issuing, recording a payment and the PDF route have never
      executed: they need a login and a database write, and `.env` points at production, where issuing
      would consume number 765 for good. Test on a Neon branch before raising a real invoice.
- [ ] Owner still to supply, all uploads in Settings: bank details, signature and stamp images, UPI QR image.
- [x] Invoice template editor and the proforma variant. Wording is frozen onto an invoice when it is
      issued, so editing a template never rewrites one a client already holds.
- [x] Credit notes: their own consecutive numbered series, raised from an issued invoice. They reduce
      what is owed without altering the invoice as printed.

### Migration (`scripts/migrate-homepage.ts`, 12 steps, 38 changes, dry run only)
- [ ] Decide: run `--rehearse` against production (executes writes inside a transaction, then rolls back), then `--apply`
- [ ] After apply: check live homepage, `/clients` logos, navbar (Services, Clients, Projects, Contact)

## C. Needed from the owner (not invented; placeholders until supplied)

**Owner answered the questionnaire on 2026-09-19.** Applied in code: financial-year quotation numbers (`STBS/2026-27/0142`, new quotations only, counter continues), page 3 "34+ Years", registered address / pincode 131001 / legal name / hours Mon-Sun 08:00-19:00 (footer, JSON-LD), GSTIN stays public, company-profile button removed. Left as printed at the owner's instruction: "500+ Projects", "100% ISI Certified", "24/7 Site Support".

**Open after the answers (need a decision or go-ahead):**
- [ ] Testimonials: owner asked me to write them; declined, since a testimonial must come from a real client. Section stays hidden until real approved quotes exist.
- [ ] Owner said `site_pic.jpeg` and `Site_pic_2.jpeg` are NOT confirmed as their own (only the founder portrait was ticked). Both are used on the About page and gallery. Confirm ownership or replace.
- [ ] FAQ / timeline answers live in the database (per-service), not code. Owner supplied: borewell diameter 100-400 mm (entered under "depth", almost certainly diameter), typical completion 2-4 days / under 4 days. Depth still unknown. Needs a go-ahead to write to the live database.
- [ ] Saved terms and standard-items libraries: approved in principle; needs a migration and UI (SQL shown before running).
- [ ] Homepage content migration: owner marked "Done" but has not said to apply; rehearse first, then apply.
- [ ] Hero photo: owner needs help arranging one.
- [ ] Page 3 says 500+ projects while the site says 1,200+; page 3 says 24/7 support while hours are 08:00-19:00.

### Decisions (quotation)
Settled: GST (optional, per quotation), discount (one, on the subtotal), amount in words, page overflow (price offer paginates), logo layout. Still open in the questionnaire: specification column, numbering scheme, the "30+ years" / "500+ projects" / "100% ISI" / "24/7" claims on page 3, GST defaults, saved libraries, expiry date.

### Business data
- [ ] Registered office address and pincode (documents show Dipalpur Road, Bhalgarh, Sonipat; 131021 in most, 131001 in one)
- [x] GSTIN supplied and in use; confirm it may stay in the public footer (questionnaire)
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
