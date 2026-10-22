# Google Business (Admin -> Google Business)

Manages the Google Business Profile listing from the admin, through Google's official Business Profile
APIs. Sections: **Overview** (views, calls, website clicks, directions, search terms, review summary,
review link to send customers), **Reviews** (read, reply, edit or delete replies, AI-drafted replies),
**Posts** (updates, offers, events, with photo and button), **Info** (name, description, phones, website,
opening hours, and Google's own edits to accept or undo) and **Photos** (add by category, delete).

## What it cannot do

These are Google's limits, not this page's:

- Post view counts: shown in Google's dashboard but not available in the API.
- Customer messages/chat: Google moved these to WhatsApp and SMS.
- Questions & answers: Google now generates these itself.
- Deleting customer reviews or reporting fake ones: done in Google's dashboard.
- Category, address and service-area changes: shown read-only, because Google may re-verify the
  business when they change. Edit them in Google's dashboard.
- Recurring (repeating) posts: the API supports them since April 2026; not built yet.

## One-time setup

1. **Google Cloud project.** At https://console.cloud.google.com/projectcreate, signed in with the
   Google account that owns the listing, create a project (e.g. "STBS website"). Note its project number.
2. **Apply for API access.** https://support.google.com/business/contact/api_default ->
   "Application for Basic API Access". Give the project number, https://www.stbs.in, and say it is for
   managing your own listing. Google reviews within 14 days. Until approved, Google allows 0 requests
   and the admin page says "Waiting for Google's approval"; everything else can be set up meanwhile.
3. **Enable the APIs** in that project (APIs & Services -> Library):
   - My Business Account Management API
   - My Business Business Information API
   - Business Profile Performance API
   - Google My Business API (reviews, posts, photos; may only appear after approval)
4. **Sign-in screen** (Google Auth Platform): External, add the owner's Gmail as a test user, then
   **Publish app**. While it is in "Testing", Google expires the sign-in every 7 days. Google shows an
   "unverified app" warning on the consent screen; for your own listing that is expected (Advanced ->
   continue).
5. **OAuth client** (Credentials -> Create credentials -> OAuth client ID -> Web application). Authorised
   redirect URIs:
   - `https://www.stbs.in/api/google-business/callback`
   - `http://localhost:3000/api/google-business/callback` (local testing only)
6. **Vercel env vars** (Production): `GOOGLE_BUSINESS_CLIENT_ID`, `GOOGLE_BUSINESS_CLIENT_SECRET`. Redeploy.
7. **Database:** apply the migration, as for every schema change:

       npx prisma migrate deploy

   It adds the `GoogleBusinessConnection` table. Until it is applied the page says so; nothing else breaks.
8. Open **Admin -> Google Business -> Connect Google account** and sign in with the owner's Google account.
   With one listing it is picked automatically; with several, the page asks which one.

## How it works

- `lib/google-business/` holds everything: `config.ts` (env, URLs, help links), `connection.ts` (the one
  connected account, token refresh, what the page should show), `api.ts` (typed API calls), `model.ts`
  (pure logic: hours, metrics, posts, listing edits, validation), `errors.ts` (Google errors to plain
  messages), `crypto.ts` (token sealing), `ai-reply.ts` (reply drafts).
- Tokens are stored AES-256-GCM encrypted with a key derived from `AUTH_SECRET`. Rotating `AUTH_SECRET`
  makes them unreadable; the page then asks to connect again.
- The OAuth routes (`/api/google-business/connect`, `/callback`) require an admin session and check a
  `state` cookie. Server actions check the session and refuse review/post/photo names that are not under
  the connected listing.
- Listing edits send only changed fields (`updateMask`), so untouched fields are never re-submitted for
  Google's review.
- Photos (for posts and the Photos tab) are re-encoded to JPEG in the browser (Google does not take WebP),
  uploaded through `/api/website/upload` to the public Blob store, and Google fetches them from there.
  This only works where uploads land on a public https URL (production with `STORAGE_PROVIDER=vercel-blob`).
- Performance ranges end 3 days before today because Google's daily figures arrive late; 3-month views are
  grouped by week.
- AI reply drafts use the website assistant's free keys (`GROQ_API_KEY` / `GEMINI_API_KEY`). The reviewer's
  name is not sent. Drafts are never posted without the owner pressing "Post reply". The button is hidden
  when neither key is set.

## Tests

    npm run test:google-business

Pure logic (hours, metrics, posts, edits, errors, sealing) and the API layer against a fake Google and an
in-memory database (listing auto-pick, token refresh, exact URLs and bodies, error paths). The live Google
calls themselves can only be exercised once Google approves the project.
