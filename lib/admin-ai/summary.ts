/**
 * The "Today" card on the admin Home page.
 *
 * The facts are worked out in code from the same read-only lookups the chat uses, so every figure on
 * the card is exact. The AI only turns them into a few plain lines and suggests what to do first; if
 * no AI is available the card shows the facts as they are. One summary is kept per day (India time)
 * and made again only when the owner taps Refresh.
 */
import { prisma } from "@/lib/prisma";
import { providersFromEnv } from "@/lib/assistant/providers";
import { todayIST } from "@/lib/worker-ledger";
import { askText } from "./llm";
import { businessTools } from "./tools";
import { addDays } from "./helpers";
import { factLines, type Lookups } from "./summary-facts";

export type DailySummary = { day: string; facts: string[]; text: string | null; provider: string | null; at: string };

const METRIC = "admin-ai-daily-summary";

async function gather(now: Date): Promise<Lookups> {
  const tools = new Map(businessTools(now).map((t) => [t.name, t.run]));
  const run = (name: string, args: Record<string, unknown> = {}) => tools.get(name)!(args) as Promise<never>;
  const today = todayIST(now);
  const yesterday = addDays(today, -1);
  const [enquiries, paidYesterday, paidThisMonth, overdue, overview, draftQuotes, expenses, workers] = await Promise.all([
    run("enquiries"),
    run("payments", { from: yesterday, to: yesterday }),
    run("payments"),
    run("invoices", { status: "overdue", from: "2000-01-01" }),
    run("overview"),
    run("quotations", { status: "DRAFT" }),
    run("expenses"),
    run("workers"),
  ]);
  const o = overview as { owedNow: { total: number; bills: number }; draftInvoices: number };
  return {
    yesterday, enquiries, paidYesterday, paidThisMonth, overdue,
    owedNow: o.owedNow,
    drafts: { quotations: (draftQuotes as { matching: number }).matching, invoices: o.draftInvoices },
    expenses, workers,
  };
}

async function phrase(facts: string[], today: string) {
  if (!facts.length) return null;
  return askText(providersFromEnv(), [
    {
      role: "system",
      content:
        "You write the morning note for the owner of a borewell and tubewell business in Haryana, read on a phone. Use only the facts given; never add or change a number. Write at most 4 short bullet lines of what matters today, then a line 'Do first:' with at most 3 short bullet actions (e.g. call a client about a late payment, reply to an enquiry, finish a draft). Plain text, '-' for bullets, no headings, no greeting.",
    },
    { role: "user", content: `Today is ${today}.\nFacts:\n${facts.map((f) => `- ${f}`).join("\n")}` },
  ], { maxTokens: 700 });
}

export async function dailySummary(opts: { refresh?: boolean; now?: Date } = {}): Promise<DailySummary> {
  const now = opts.now ?? new Date();
  const day = todayIST(now);
  const date = new Date(`${day}T00:00:00Z`);
  if (!opts.refresh) {
    const cached = await prisma.analyticsSnapshot.findUnique({ where: { date_metric: { date, metric: METRIC } } });
    if (cached) return cached.value as DailySummary;
  }
  const facts = factLines(await gather(now));
  const ai = await phrase(facts, day);
  const summary: DailySummary = { day, facts, text: ai?.text ?? null, provider: ai?.provider ?? null, at: now.toISOString() };
  // A note the AI failed to write is not kept, so the next visit tries again.
  if (!summary.text && facts.length && providersFromEnv().length) return summary;
  await prisma.analyticsSnapshot.upsert({
    where: { date_metric: { date, metric: METRIC } },
    create: { date, metric: METRIC, value: summary },
    update: { value: summary },
  });
  return summary;
}
