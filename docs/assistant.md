# Website chat assistant ("Ask STBS")

The corner button on the public site. Visitors ask questions in Hindi, Hinglish or English. The
assistant answers only from the site's own facts:

- `lib/company.ts`
- the service FAQs (`lib/website/service-faqs.ts`)
- the published projects

## Code

- `lib/assistant/knowledge.ts`: the facts, the reply rules, and how each question picks the few facts
  it needs. The full site is never sent, which keeps each question small for the free daily allowance.
- `lib/assistant/providers.ts`: the free AI chain, tried in order. Groq `openai/gpt-oss-120b`, then Groq
  `openai/gpt-oss-20b`, then Gemini `gemini-flash-latest`.
- `app/api/chat/route.ts`: the public endpoint. It applies size checks and per-visitor and daily caps.
  It stores nothing.
- `components/site-assistant.tsx`: the panel. It has quick questions, WhatsApp and Call, and an
  in-chat enquiry form.

## Rules the assistant follows

- It never gives prices; any price in a reply is replaced and the form is offered.
- It never guesses depths, yields, timelines, warranties or permits.
- It mentions only clients and projects that are on the site.
- It doesn't ask for personal details in the chat.

## Leads

The in-chat form posts to `/api/quote`, the same as the quote page. The request is saved in Admin →
Enquiries, emailed, and pushed to the owner's phone, with the visitor's chat questions in **Details**.

Chats that don't become enquiries are not stored.

## Turning it on

1. Create free keys:
   - Groq: https://console.groq.com/keys
   - Gemini: https://aistudio.google.com/apikey

   Add no card, so the accounts can never be charged.
2. In Vercel, open **Project → Settings → Environment Variables**. Add `GROQ_API_KEY` and
   `GEMINI_API_KEY` for Production.
3. Redeploy the latest production deployment.

Without either key, the site shows the plain WhatsApp button, exactly as before.

## Free allowances

As of October 2026, Groq allows 200K tokens a day per model, and the questions here use about
1,100–1,200 prompt tokens each. That's roughly 100 answers a day per Groq model, with Gemini beyond
that.

If everything is used up, the panel offers WhatsApp and Call. You can tune
`ASSISTANT_DAILY_LIMIT`, which defaults to 600 a day.

## Testing

`npm run test:assistant` runs the retrieval, price-guard, lead-details and provider-fallback checks.

For local UI work, set `ASSISTANT_MOCK=1`. It gives canned replies in development only.
