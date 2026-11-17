/**
 * The admin AI's line to the free providers (Groq first, Gemini as backup), reusing the website
 * assistant's provider list so both run on the same two keys.
 *
 * Two shapes of call:
 *  - `runTools`: a chat where the model may ask for business figures through read-only tools. Every
 *    number it quotes comes back from code; the model only chooses what to look up and phrases it.
 *  - `askJson`: one request whose answer must be a JSON object (drafting a quotation or reading a PO).
 *
 * A provider that fails part-way is dropped and the next one starts the conversation over, so a
 * reply never mixes two models' half-finished work.
 */
import type { Provider } from "@/lib/assistant/providers";

export type ChatMessage =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string; tool_calls?: ToolCall[] }
  | { role: "tool"; tool_call_id: string; name: string; content: string };

export type ToolCall = { id: string; type: "function"; function: { name: string; arguments: string } };

export type ToolDef = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  run: (args: Record<string, unknown>) => Promise<unknown>;
};

type Opts = { fetchImpl?: typeof fetch; timeoutMs?: number; maxTokens?: number; maxRounds?: number };

class ProviderError extends Error {}

async function post(p: Provider, body: Record<string, unknown>, opts: Opts) {
  const res = await (opts.fetchImpl ?? fetch)(p.url, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${p.key}` },
    body: JSON.stringify({ model: p.model, temperature: 0.2, max_tokens: opts.maxTokens ?? 1500, ...p.extra, ...body }),
    signal: AbortSignal.timeout(opts.timeoutMs ?? 25_000),
  });
  if (!res.ok) throw new ProviderError(`${p.name} answered ${res.status}`);
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: unknown; tool_calls?: unknown } }> };
  const m = data.choices?.[0]?.message;
  if (!m) throw new ProviderError(`${p.name} sent no message`);
  return { content: typeof m.content === "string" ? m.content.trim() : "", toolCalls: Array.isArray(m.tool_calls) ? (m.tool_calls as ToolCall[]) : [] };
}

function parseArgs(raw: string): Record<string, unknown> {
  try {
    const v = JSON.parse(raw || "{}");
    return v && typeof v === "object" && !Array.isArray(v) ? v : {};
  } catch {
    return {};
  }
}

/** A chat that may look things up. Returns null only when every provider failed. */
export async function runTools(providers: Provider[], messages: ChatMessage[], tools: ToolDef[], opts: Opts = {}): Promise<{ text: string; provider: string } | null> {
  const specs = tools.map((t) => ({ type: "function", function: { name: t.name, description: t.description, parameters: t.parameters } }));
  const byName = new Map(tools.map((t) => [t.name, t]));
  for (const p of providers) {
    const convo: ChatMessage[] = [...messages];
    try {
      for (let round = 0; round < (opts.maxRounds ?? 5); round++) {
        const last = round === (opts.maxRounds ?? 5) - 1;
        const reply = await post(p, { messages: convo, ...(last ? {} : { tools: specs, tool_choice: "auto" }) }, opts);
        if (!reply.toolCalls.length) {
          if (reply.content) return { text: reply.content, provider: p.name };
          throw new ProviderError(`${p.name} returned no text`);
        }
        convo.push({ role: "assistant", content: reply.content, tool_calls: reply.toolCalls });
        for (const call of reply.toolCalls) {
          const tool = byName.get(call.function?.name);
          let result: unknown;
          try {
            result = tool ? await tool.run(parseArgs(call.function.arguments)) : { error: `No tool called ${call.function?.name}` };
          } catch (e) {
            result = { error: e instanceof Error ? e.message : "Lookup failed" };
          }
          convo.push({ role: "tool", tool_call_id: call.id, name: call.function?.name ?? "", content: JSON.stringify(result) });
        }
      }
      throw new ProviderError(`${p.name} kept looking things up without answering`);
    } catch (e) {
      console.warn("[admin-ai]", e instanceof Error ? e.message : e);
    }
  }
  return null;
}

/** The first {...} block in a reply, parsed. Models sometimes wrap JSON in ``` fences or a sentence. */
export function extractJson(text: string): Record<string, unknown> | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const v = JSON.parse(text.slice(start, end + 1));
    return v && typeof v === "object" && !Array.isArray(v) ? v : null;
  } catch {
    return null;
  }
}

/** One request that must come back as a JSON object; tries each provider until one does. */
export async function askJson(providers: Provider[], messages: ChatMessage[], opts: Opts = {}): Promise<{ json: Record<string, unknown>; provider: string } | null> {
  for (const p of providers) {
    try {
      const reply = await post(p, { messages }, { maxTokens: 4000, timeoutMs: 40_000, ...opts });
      const json = extractJson(reply.content);
      if (json) return { json, provider: p.name };
      console.warn(`[admin-ai] ${p.name} did not return JSON`);
    } catch (e) {
      console.warn("[admin-ai]", e instanceof Error ? e.message : e);
    }
  }
  return null;
}

/** One plain-text request (the daily summary). */
export async function askText(providers: Provider[], messages: ChatMessage[], opts: Opts = {}): Promise<{ text: string; provider: string } | null> {
  for (const p of providers) {
    try {
      const reply = await post(p, { messages }, opts);
      if (reply.content) return { text: reply.content, provider: p.name };
    } catch (e) {
      console.warn("[admin-ai]", e instanceof Error ? e.message : e);
    }
  }
  return null;
}
