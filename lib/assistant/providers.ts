/**
 * Free AI providers for the website assistant, tried in order until one answers.
 *
 *   1. Groq, openai/gpt-oss-120b   (free plan; chats are not used for training)
 *   2. Groq, openai/gpt-oss-20b    (same key, its own separate daily allowance)
 *   3. Google Gemini Flash         (free plan; Google may use free-tier chats to improve its products,
 *                                   which is why visitors' names and numbers never go through the AI)
 *
 * Only providers whose key is set are used. With no key at all the assistant is off and the site shows
 * the plain WhatsApp button. Keys on a free plan with no card attached can never be charged: when a daily
 * allowance runs out the provider refuses, and the chain moves on (and finally to WhatsApp / call).
 *
 * Env: GROQ_API_KEY, GROQ_MODELS (comma list, optional), GEMINI_API_KEY, GEMINI_MODEL (optional).
 */

export interface Provider {
  name: string;
  url: string;
  key: string;
  model: string;
  extra?: Record<string, unknown>;
}
export interface LlmMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

type Env = Record<string, string | undefined>;

export function providersFromEnv(env: Env = process.env): Provider[] {
  const list: Provider[] = [];
  const groq = env.GROQ_API_KEY?.trim();
  if (groq) {
    const models = (env.GROQ_MODELS ?? "openai/gpt-oss-120b,openai/gpt-oss-20b").split(",").map((m) => m.trim()).filter(Boolean);
    for (const model of models) {
      list.push({
        name: `groq:${model}`,
        url: "https://api.groq.com/openai/v1/chat/completions",
        key: groq,
        model,
        // gpt-oss models think before answering; a short think keeps replies fast and within the free allowance.
        ...(model.includes("gpt-oss") ? { extra: { reasoning_effort: "low" } } : {}),
      });
    }
  }
  const gemini = env.GEMINI_API_KEY?.trim();
  if (gemini) {
    list.push({
      name: "gemini",
      url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      key: gemini,
      model: env.GEMINI_MODEL?.trim() || "gemini-flash-latest",
    });
  }
  return list;
}

export function assistantEnabled(env: Env = process.env): boolean {
  return Boolean(env.GROQ_API_KEY?.trim() || env.GEMINI_API_KEY?.trim());
}

/** Asks each provider in turn (OpenAI-compatible chat API); returns the first non-empty answer, or null. */
export async function complete(
  providers: Provider[],
  messages: LlmMessage[],
  opts: { maxTokens?: number; timeoutMs?: number; fetchImpl?: typeof fetch } = {},
): Promise<{ text: string; provider: string } | null> {
  const doFetch = opts.fetchImpl ?? fetch;
  for (const p of providers) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 15_000);
    try {
      const res = await doFetch(p.url, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${p.key}` },
        body: JSON.stringify({ model: p.model, messages, temperature: 0.3, max_tokens: opts.maxTokens ?? 900, ...p.extra }),
        signal: ctrl.signal,
      });
      if (!res.ok) {
        console.warn(`[assistant] ${p.name} answered ${res.status}`);
        continue;
      }
      const data = (await res.json()) as { choices?: Array<{ message?: { content?: unknown } }> };
      const text = data.choices?.[0]?.message?.content;
      if (typeof text === "string" && text.trim()) return { text: text.trim(), provider: p.name };
      console.warn(`[assistant] ${p.name} returned no text`);
    } catch (e) {
      console.warn(`[assistant] ${p.name} failed:`, e instanceof Error ? e.message : e);
    } finally {
      clearTimeout(timer);
    }
  }
  return null;
}
