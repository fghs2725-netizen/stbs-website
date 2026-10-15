# Website projects (Admin -> Website projects)

The projects on the public site (homepage "Selected projects" and /projects) are rows in the
`WebsiteProject` table, edited at `/admin/projects`. A project that is switched on is live as soon as it
is saved; photos are uploaded through `/api/website/upload` and stored with the project.

## Before the first deploy

Apply the migration to the production database, as for every schema change:

    npx prisma migrate deploy

It creates the table and adds the three projects the site already showed (BigBasket, Ashoka University,
EOC Polymers) so they appear in the list ready to edit. Until it is applied the public pages fall back to
the built-in list and the admin page says the project list is unavailable; nothing breaks. After it is
applied, save any project (or wait up to a day) so the cached public pages pick up the table.

## Behaviour

- The first three live projects, in list order, show on the homepage; /projects shows all of them.
- New projects go to the top of the list. Use the arrows to reorder.
- Delete is a soft delete (the row stays in the database but leaves the site and the list).
- A photo removed from a project is not deleted from storage.
