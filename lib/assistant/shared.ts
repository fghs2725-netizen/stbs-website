/**
 * Website chat assistant: types and helpers shared by the browser panel and the /api/chat route.
 * Nothing here touches the network or the database.
 */

export const ASSISTANT_NAME = "STBS Assistant";

export type ChatRole = "user" | "assistant";
export interface ChatMessage {
  role: ChatRole;
  content: string;
}
/** What the panel should offer under a reply: the short enquiry form, or WhatsApp / call. */
export type ChatAction = "lead" | "handoff" | null;

export interface ChatReply {
  ok: true;
  reply: string;
  action: ChatAction;
}
export interface ChatFailure {
  ok: false;
  error: string;
  /** True when the AI is unavailable (no key, quota used up, provider down): offer WhatsApp / call instead. */
  fallback?: boolean;
}

/** Longest single visitor message the API accepts. */
export const MAX_MESSAGE_CHARS = 500;
/** Most recent messages sent with each question (older ones are dropped). */
export const MAX_HISTORY = 10;

/**
 * The enquiry's "Details" field for a lead taken in the chat: what the visitor asked, newest kept
 * when it has to be shortened. Fits the quote form's 2,000-character limit.
 */
export function leadDetails(history: ChatMessage[], limit = 2000): string {
  const head = "Sent from the website chat (STBS Assistant). What the visitor asked:";
  const lines = history
    .filter((m) => m.role === "user")
    .map((m) => `- ${m.content.replace(/\s+/g, " ").trim()}`)
    .filter((l) => l.length > 2);
  if (!lines.length) return "Sent from the website chat (STBS Assistant).";
  const kept: string[] = [];
  let size = head.length;
  for (let i = lines.length - 1; i >= 0; i--) {
    let line = lines[i];
    const room = limit - size - 1;
    if (room <= 3) break;
    if (line.length > room) line = `${line.slice(0, room - 1)}…`;
    kept.unshift(line);
    size += line.length + 1;
  }
  if (kept.length < lines.length) kept.unshift("- (earlier messages shortened)");
  const out = [head, ...kept].join("\n");
  return out.length > limit ? out.slice(0, limit) : out;
}
