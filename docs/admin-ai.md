# Admin AI helper

The owner's AI inside the admin. It runs on the same free keys as the website assistant
(`GROQ_API_KEY`, with `GEMINI_API_KEY` as backup; see `docs/assistant.md`). With no key the AI page says
how to switch it on, and the Home card shows the day's facts without the AI's note.

## What it does

- **Ask** (Admin → AI helper): questions about bills, payments, quotations, expenses, workers and
  enquiries, in English, Hindi or Hinglish.
- **Today** (card on Home): a short note on what needs attention, made once a day and kept; Refresh
  makes it again.
- **Quotation**: paste a customer's requirement and get a DRAFT quotation on the default template, with
  rates taken from past quotations, bills and preset rates. Lines with no known rate are left at 0.
- **Invoice from PO**: upload the client's PO (PDF, up to 4 MB) and get a DRAFT invoice with the buyer,
  ship-to, PO number and date, items, HSN codes, rates and GST.

## Rules it keeps

- It reads; it never changes anything. Drafts are only drafts: nothing is numbered, issued, finalised
  or sent by the AI. The draft opens in the normal editor and the owner checks and issues it.
- Figures come from code, not from the model. The chat looks figures up through read-only tools
  (`lib/admin-ai/tools.ts`) that do the sums with the same arithmetic as the invoice pages
  (`rowTotals` in `lib/invoice-analytics.ts`). The Home note is written from facts worked out in code.
- Every draft the model fills is checked before it is saved (`lib/admin-ai/drafts.ts`): units must be
  in the admin's list, quantities and rates must be numbers, HSN codes must look like HSN codes, a known
  client is filled from the saved client, and CGST/SGST or IGST follows the buyer's state or GSTIN.
- Phone numbers and email addresses are not sent to the AI. Website visitors appear by service and
  place only, with any number or email in their message blanked out.
- Only the SUPER_ADMIN account can use it.

Google may use Gemini free-tier requests to improve its products. Groq answers first; Gemini is only
reached when Groq is busy or its daily allowance is used up.

## Code

- `lib/admin-ai/llm.ts`: the calls (tool loop, JSON answer, plain answer) over the provider chain.
- `lib/admin-ai/tools.ts`: the read-only lookups.
- `lib/admin-ai/chat.ts`, `chat-prompt.ts`: the chat.
- `lib/admin-ai/summary.ts`, `summary-facts.ts`: the Today card, cached in `AnalyticsSnapshot`
  (metric `admin-ai-daily-summary`).
- `lib/admin-ai/drafts.ts`, `make-drafts.ts`: the quotation and PO drafts. PDFs are read with `unpdf`;
  a scanned PO (pictures, no text) is refused with a message.
- `app/api/admin-ai/*`: the endpoints. `app/admin/(dashboard)/ai/page.tsx` and
  `components/admin/ai/*`: the screens.

Tests: `npm run test:admin-ai` (the AI and the database are stubbed).
