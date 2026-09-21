# FINAL REPORT — STBS Visual Editor + Gallery Bug Fix

Delivered in **C:\Users\HP\my-website** (Next 15.5.20, Prisma 6.19.3, Neon Postgres,
Vercel Blob). Local dev :3010, seeded admin `admin@stbs.com` (password: see Admin > Account & password).

## Status: DONE (verified). Push NOT executed — awaiting your authorization.

## 1. What was fixed

### 1a. Gallery bug — *published* photos vanished from public /gallery
Problem: CMS `gallery` page row unpublished (DRAFT) but gallery photos already
published → public `/gallery` rendered an empty canvas instead of the live items.
Fix (`app/(public)/gallery/page.tsx`): when the page row isn't published, the
gallery route now falls back to `getPublishedGalleryItems()` and renders the
**published photos** through the shared public renderer. When nothing is published
the page shows an honest empty state. `revalidatePath("/gallery")` is fired on
gallery publish / unpublish / delete so the fallback is always fresh.
Proven by `test:publish` (includes an explicit "unpublish page → public still shows
published photos → unpublish photo → public empty" sequence) — 33/33.

### 1b. Administration: single visual editor at /admin/website
- `app/admin/(dashboard)/website/page.tsx`: rewritten to the visual editor server
  page (awaited `searchParams`, `Promise.all` getters, Prisma casts). This is the
  one visual editor — **no CMS tabs** (WebsiteCmsTabs hidden on the exact route).

## 2. Verified (all green)
- `tsc --noEmit` — clean
- `next lint` — clean
- `next build` (production) — clean
- `test:publish` 33/33 (gallery bug-fix proof + hero/publish/unpublish DB restore)
- `test:website` 21/21, `test:storage` 7/7, `test:storage-blob` 13/13,
  `test:quotation` 26/26
- Browser QA (login → visual editor → no CMS tabs → public zero chrome → public
  still static while unpublished → section hover chrome → **edit hero heading →
  Save draft persists → canvas reflects → edit/replace image → edit service → add
  + publish gallery photo → public /gallery shows it → unpublish → public empty →
  delete photo → DB baseline restored**): product flow passes headlessly.
  One harness assertion ("type into drawer via CSS attribute selector") is a known
  Puppeteer/React **controlled-input limitation** — React keeps input values in the
  DOM *property*, not the HTML `value` attribute, so CSS probes can't see them; the
  drawer opens and Save-draft works every run (this is the harness, not the app).

## 3. NOT verified locally (manual Vercel steps — not executed)
- Vercel **Blob** live upload/download (needs `BLOB_READ_WRITE_TOKEN`; `test:storage-blob`
  runs 13/13 against mocked blob, real round-trip is manual only — code path is shared
  with the local-disk provider already proven).
- Prod env vars, production build of the *deployed* site, domain/canonical `stbs.in`.

## 4. Constraints honored
Never fabricated testimonials/clients/projects/addresses/hours; no clearbit/external
logos; `STORAGE_PROVIDER=vercel-blob` kept (no `.storage`/public/uploads); quotation,
PDF/invoice, portal, auth/authorization, admin shell, Vercel Blob, domain config,
canonical https, QR/verification all intact; public pages never render editor chrome
or draft data; publish is explicit; targeted revalidation only.

## 5. Awaiting
Your go/no-go to `git push`. No commit/push has been made without your approval.
