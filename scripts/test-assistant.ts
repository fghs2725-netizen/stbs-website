import assert from "node:assert/strict";
import { buildKnowledge, buildSystemPrompt, postProcess, selectRelevant, terms } from "../lib/assistant/knowledge";
import { assistantEnabled, complete, providersFromEnv } from "../lib/assistant/providers";
import { leadDetails, type ChatMessage } from "../lib/assistant/shared";
import { PROJECTS } from "../lib/website/projects-data";

let passed = 0;
async function check(label: string, fn: () => void | Promise<void>) { await fn(); passed++; console.log(`  ok  ${label}`); }

const kb = buildKnowledge({ projects: PROJECTS, contact: { phones: ["9812003001", "8708128632"], whatsapp: "9812003001", email: "stbs2025@gmail.com" } });
const pick = (q: string) => selectRelevant(kb, q).map((e) => e.text).join("\n");

async function main() {
  await check("Hindi, Hinglish and English words meet on one canonical term", () => {
    assert.deepEqual(terms("Borewell kitna gehra hoga?"), ["borewell", "depth", "hoga"]);
    assert.ok(terms("बारिश का पानी").includes("rainwater") && terms("बारिश का पानी").includes("water"));
    assert.ok(terms("What is the rate?").includes("price"));
  });
  await check("questions pull the matching facts (areas, depth, a place, rainwater in Devanagari)", () => {
    assert.match(pick("Which areas do you serve?"), /Sonipat, Panipat, Kundli/);
    assert.match(pick("survey kitna gehra hota hai"), /800 m/);
    assert.match(pick("Kundli mein kaam kiya hai?"), /BigBasket/);
    assert.match(pick("बारिश का पानी जमा करना है"), /Rainwater/i);
    assert.match(pick("kharcha kitna aayega"), /does not publish prices/);
  });
  await check("a question that matches nothing still gets the useful defaults", () => {
    const got = selectRelevant(kb, "hello namaste");
    assert.ok(got.length > 0 && got.every((e) => e.fallback));
  });
  await check("the prompt carries the core facts and rules, and stays small for the free daily allowance", () => {
    const p = buildSystemPrompt(kb, "borewell depth in Kundli");
    assert.match(p, /since 1992/);
    assert.match(p, /Never give prices/);
    assert.match(p, /\[\[LEAD_FORM\]\]/);
    assert.ok(p.length < 9000, `prompt is ${p.length} characters`);
  });
  await check("replies: markers become actions and disappear; markdown is stripped", () => {
    assert.deepEqual(postProcess("We can help.\n[[LEAD_FORM]]"), { text: "We can help.", action: "lead" });
    assert.deepEqual(postProcess("Please call 98120 03001.\n[[HANDOFF]]"), { text: "Please call 98120 03001.", action: "handoff" });
    assert.equal(postProcess("**Bold** answer\n* one\n* two").text, "Bold answer\n- one\n- two");
  });
  await check("any price in a reply is blocked and turned into the enquiry form; specs and phone numbers are not", () => {
    for (const bad of ["It costs about ₹450 per foot.", "Rate is Rs 300 per ft", "Around 2 lakh rupees", "लगभग 500 रुपये प्रति फीट"]) {
      const r = postProcess(bad);
      assert.equal(r.action, "lead", bad);
      assert.match(r.text, /quoted in writing/);
    }
    for (const ok of ["We drill 150 to 300 mm bores.", "Call 98120 03001 or 87081 28632.", "Casing rated 10 kg/cm²."]) {
      assert.equal(postProcess(ok).text, ok);
    }
  });
  await check("the enquiry details keep the visitor's own questions, newest first kept, within 2,000 characters", () => {
    const h: ChatMessage[] = [];
    for (let i = 0; i < 30; i++) { h.push({ role: "user", content: `Question ${i} ${"x".repeat(150)}` }); h.push({ role: "assistant", content: "Answer" }); }
    const d = leadDetails(h);
    assert.ok(d.length <= 2000, `${d.length}`);
    assert.match(d, /Question 29/);
    assert.doesNotMatch(d, /Answer/);
    assert.match(d, /earlier messages shortened/);
    assert.match(leadDetails([{ role: "user", content: "Need a borewell in Kundli" }]), /- Need a borewell in Kundli$/);
  });
  await check("providers: Groq's two free models first, then Gemini; nothing without keys", () => {
    assert.equal(providersFromEnv({}).length, 0);
    assert.equal(assistantEnabled({}), false);
    const p = providersFromEnv({ GROQ_API_KEY: "g", GEMINI_API_KEY: "m" });
    assert.deepEqual(p.map((x) => x.name), ["groq:openai/gpt-oss-120b", "groq:openai/gpt-oss-20b", "gemini"]);
    assert.deepEqual(p[0].extra, { reasoning_effort: "low" });
    assert.equal(p[2].model, "gemini-flash-latest");
    assert.equal(assistantEnabled({ GEMINI_API_KEY: "m" }), true);
  });
  await check("when one provider refuses (quota used up), the next one answers; all down gives null", async () => {
    const p = providersFromEnv({ GROQ_API_KEY: "g", GEMINI_API_KEY: "m" });
    const calls: string[] = [];
    const fake = (async (url: string, init?: RequestInit) => {
      const model = JSON.parse(String(init?.body)).model as string;
      calls.push(model);
      if (url.includes("groq")) return new Response("rate limited", { status: 429 });
      return new Response(JSON.stringify({ choices: [{ message: { content: "Hello from Gemini" } }] }), { status: 200 });
    }) as typeof fetch;
    const r = await complete(p, [{ role: "user", content: "hi" }], { fetchImpl: fake });
    assert.deepEqual(r, { text: "Hello from Gemini", provider: "gemini" });
    assert.deepEqual(calls, ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "gemini-flash-latest"]);
    const down = (async () => { throw new Error("offline"); }) as typeof fetch;
    assert.equal(await complete(p, [{ role: "user", content: "hi" }], { fetchImpl: down }), null);
  });
  console.log(`\n${passed} checks passed`);
}

main().catch((e) => { console.error(e); process.exit(1); });
