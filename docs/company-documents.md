# Company documents

The admin library is at `/admin/company-documents` (also in the phone's More menu).
It accepts PDF, JPG/JPEG, PNG, WebP, DOC/DOCX, XLS/XLSX and CSV, up to 20 MiB per file.
Selected files are shared as separate attachments, with a 50 MiB preparation limit.
Browsers without multi-file Web Share support offer individual downloads for manual attachment.
Native share targets may impose their own file type, count, or size limits.

## Production setup

1. Apply `npx prisma migrate deploy` before deploying the app.
2. Use a **private** Vercel Blob store dedicated to this library. A store named
   `stbs-company-documents` was created during implementation (Mumbai / `bom1`).
3. Set its read/write token as `COMPANY_DOCUMENTS_BLOB_READ_WRITE_TOKEN` in the
   application's environment, then deploy. Keep this server-only. Do not replace
   existing website-media credentials or connect it under the public media variable names.
4. Upload a test PDF, refresh the library, preview/download it, and delete it.
   Confirm that its raw storage URL is inaccessible without authentication.

The existing public website storage service is not used. Direct browser uploads use
short-lived tokens restricted to the server-generated pathname, type and size; the
completion callback is signature-verified by the Blob SDK. An authenticated completion
endpoint also finalizes uploads when the callback is delayed or unavailable locally.
Completion checks the stored size, private URL, and file signature before exposing a row.
Private reads always pass through an authenticated application route with `no-store`.

Development without a private token stores files in `.storage/private` (outside `public`).
Production and Vercel never fall back to local or public storage. Existing local uploads
are development data; they are not automatically copied into a production Blob store.

Deleting a document hides it before deleting its object. A repeated deletion is safe;
failed object deletion can be retried. Library visits clean up up to 10 abandoned uploads
older than 24 hours and outstanding deletion tombstones. Pending uploads never appear
in the library. Previously shared copies cannot be recalled.

## Checks

- `npm run test:company-documents`: validation, file signatures, filename handling and private local storage.
- `npm run test:company-documents-e2e`: against a local dev server on port 3010, authenticated upload/list/edit/read/delete and access checks. Uses temporary files and rows and removes them afterward.
- `npx tsc --noEmit` and `npm run build`.
- Browser QA: upload several files, select/filter, rename, share cancellation, failed preparation,
  download fallback, keyboard dialogs, and mobile layout. Native phone share-sheet delivery
  requires a real supported device and selecting a recipient manually.
