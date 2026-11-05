import { company } from "@/lib/company";
import { complete, providersFromEnv, type LlmMessage } from "@/lib/assistant/providers";
import { LIMITS } from "./model";

/**
 * Drafts a reply to a Google review with the same free AI keys as the website assistant.
 * The owner always reads and edits the draft before it is posted; nothing is sent automatically.
 * The reviewer's name is left out of the prompt (the free Gemini tier may keep prompts), and the
 * draft does not greet anyone by name so the owner can add it.
 */

export function replyPrompt(input: { stars: number; comment: string }, business = company): LlmMessage[] {
  const phone = business.phones[0] ?? "";
  const system = [
    `You write replies from the owner of ${business.name}, a borewell, tubewell and rainwater-harvesting contractor in Haryana and Delhi NCR (since ${business.established}), to its Google reviews.`,
    "Rules:",
    "- 2 to 4 short sentences, under 80 words. Plain, warm and professional.",
    "- Thank the customer and mention something specific they said, if they said anything.",
    `- For 1 to 3 stars: apologise once, do not argue or blame, and invite them to call ${phone} so it can be put right.`,
    "- Never promise refunds, discounts or free work, never admit legal fault, and never invent facts about the job.",
    "- Do not greet the customer by name, and use no emojis, hashtags or links.",
    "- Reply in the language of the review (Hindi in Devanagari, Hinglish, or English). If the review has no text, reply in English.",
    "- Output only the reply text.",
  ].join("\n");
  const text = input.comment.trim().slice(0, 2000) || "(no text, only a star rating)";
  return [
    { role: "system", content: system },
    { role: "user", content: `Star rating: ${input.stars} of 5\nReview: ${text}` },
  ];
}

export function cleanDraft(raw: string): string {
  let t = raw.trim().replace(/^["“']+|["”']+$/g, "").trim();
  t = t.replace(/^(reply|response)\s*:\s*/i, "");
  while (new TextEncoder().encode(t).length > LIMITS.reply) t = t.slice(0, -20);
  return t;
}

export async function draftReviewReply(input: { stars: number; comment: string }): Promise<string | null> {
  const providers = providersFromEnv();
  if (!providers.length) return null;
  const result = await complete(providers, replyPrompt(input), { maxTokens: 700, timeoutMs: 20_000 });
  return result ? cleanDraft(result.text) || null : null;
}
