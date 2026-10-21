# Town pages (Admin -> Website town pages)

The town pages (`/areas/<town>`) list the clients the owner has switched on, with the kind of work and the
years read live from those clients' issued invoices (drafts and cancelled invoices are ignored). A new
invoice for a client who is already shown updates the page within a day, or at once when anything is
saved on the admin page. New clients start hidden.

## Before the first deploy

Apply the migration to the production database, as for every schema change:

    npx prisma migrate deploy

It creates the `WebsiteAreaClient` table with the 69 clients the owner approved on 2026-10-21. Until it is
applied the town pages use the same list built into `lib/website/areas.ts` and the admin page says the
list is unavailable; nothing breaks.

## Behaviour

- Each invoiced client is one row in the admin list (names are matched ignoring case and spacing). Pick
  a town to show it, or Hidden to take it off; the name on the website and the locality are editable.
- A client invoiced under two spellings can share one website entry: the seed does this for a few
  (for example A R V Footwear, Indogulf). Hiding one spelling only drops that spelling.
- The work label comes from invoice item descriptions (`lib/website/area-work.ts`); amounts and invoice
  numbers never reach the website.
