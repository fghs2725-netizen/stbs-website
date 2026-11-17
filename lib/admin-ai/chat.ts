import { providersFromEnv } from "@/lib/assistant/providers";
import { todayIST } from "@/lib/worker-ledger";
import { runTools, type ChatMessage } from "./llm";
import { businessTools } from "./tools";
import { chatSystemPrompt, trimHistory, type ChatTurn } from "./chat-prompt";

export type { ChatTurn };

export async function answer(turns: ChatTurn[], now = new Date()) {
  const today = todayIST(now);
  const messages: ChatMessage[] = [{ role: "system", content: chatSystemPrompt(today) }, ...trimHistory(turns)];
  return runTools(providersFromEnv(), messages, businessTools(now));
}
