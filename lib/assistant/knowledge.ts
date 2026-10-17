import { businessInfo, clients, company } from "@/lib/company";
import { HOME_STATS } from "@/lib/website/home-defaults";
import { SERVICE_FAQS } from "@/lib/website/service-faqs";
import { SERVICE_PAGES } from "@/lib/website/service-pages";
import type { ProjectCase } from "@/lib/website/projects-data";
import type { ChatAction } from "@/lib/assistant/shared";

/**
 * What the assistant knows, and how each question picks the few facts it needs.
 *
 * The free AI plans allow only a modest number of tokens a day, so the whole site is NOT sent with
 * every question: a short "core" (who STBS is, contact, areas, services) always goes, plus the handful
 * of FAQ answers and projects that match the question. Matching understands common Hindi / Hinglish
 * words (gehra -> depth, paani -> water, kharcha -> price ...).
 *
 * Every fact comes from the site itself (lib/company, service FAQs, published projects), so the
 * assistant can never say more than the website already does.
 */

export interface Contact {
  phones: string[];
  whatsapp: string;
  email: string;
}
export interface KnowledgeEntry {
  text: string;
  terms: Set<string>;
  /** Shown when nothing in the question matches (areas, how to get a quote, the survey). */
  fallback?: boolean;
}
export interface Knowledge {
  core: string;
  entries: KnowledgeEntry[];
}

// Hindi / Hinglish / English variants mapped to one canonical word, so a question and a fact meet.
const SYNONYMS: Record<string, string> = {
  gehra: "depth", gehri: "depth", gahra: "depth", gahri: "depth", gehrai: "depth", gahrai: "depth", deep: "depth", deeper: "depth", depths: "depth",
  feet: "depth", foot: "depth", ft: "depth", meter: "depth", metre: "depth", meters: "depth", metres: "depth", "गहरा": "depth", "गहराई": "depth", "फीट": "depth",
  paani: "water", pani: "water", jal: "water", "पानी": "water", "जल": "water",
  boring: "borewell", bore: "borewell", borwell: "borewell", borewells: "borewell", "बोरवेल": "borewell", "बोरिंग": "borewell", "ट्यूबवेल": "tubewell", tubewells: "tubewell",
  barish: "rainwater", baarish: "rainwater", barsat: "rainwater", rain: "rainwater", harvesting: "rainwater", recharge: "rainwater", "बारिश": "rainwater", "वर्षा": "rainwater",
  test: "testing", tests: "testing", jaanch: "testing", janch: "testing", survey: "testing", "जांच": "testing", "जाँच": "testing", "सर्वे": "testing",
  pipe: "material", pipes: "material", motor: "material", pump: "material", pumps: "material", submersible: "material", saman: "material", samaan: "material", supply: "material", "पाइप": "material", "मोटर": "material",
  kharcha: "price", kharch: "price", rate: "price", rates: "price", daam: "price", kimat: "price", keemat: "price", cost: "price", costs: "price", charges: "price", charge: "price", budget: "price", paisa: "price", paise: "price", "कीमत": "price", "खर्च": "price", "रेट": "price",
  kahan: "area", kaha: "area", where: "area", areas: "area", city: "area", cities: "area", serve: "area", "कहाँ": "area", "कहां": "area",
  samay: "timeline", din: "timeline", days: "timeline", "समय": "timeline", "दिन": "timeline",
  inch: "diameter", inches: "diameter", mm: "diameter", size: "diameter", sizes: "diameter", "इंच": "diameter",
  quotation: "quote", proposal: "quote", estimate: "quote", quotes: "quote",
  clients: "client", customer: "client", customers: "client", projects: "project", kaam: "project", work: "project", jobs: "project",
};
const STOP = new Set([
  "a", "an", "the", "is", "are", "was", "be", "to", "of", "in", "on", "at", "for", "and", "or", "do", "does", "you", "your", "we", "our", "i", "me", "my",
  "it", "this", "that", "with", "can", "how", "what", "which", "who", "when", "will", "would", "please", "hi", "hello", "there", "about", "any", "have", "has",
  "kya", "hai", "hain", "ka", "ki", "ke", "ko", "se", "me", "mein", "mai", "aap", "ap", "hum", "ham", "mujhe", "bhi", "aur", "ya", "to", "toh", "na", "nahi", "ho", "kar", "karte", "karo", "chahiye", "kitna", "kitni", "kitne",
  "है", "का", "की", "के", "को", "से", "में", "और", "क्या", "आप", "हम", "मुझे", "भी",
]);

/** Lower-case words, stop words removed, variants mapped to their canonical form. */
export function terms(text: string): string[] {
  return text
    .normalize("NFC")
    .toLowerCase()
    .split(/[^\p{L}\p{M}\p{N}]+/u) // \p{M}: Devanagari vowel signs belong to the word
    .filter((w) => w.length > 1 && !STOP.has(w))
    .map((w) => SYNONYMS[w] ?? w);
}
const termSet = (...texts: string[]) => new Set(texts.flatMap(terms));

const fmtPhone = (p: string) => (/^\d{10}$/.test(p) ? `${p.slice(0, 5)} ${p.slice(5)}` : p);

export function buildKnowledge(input: { projects: ReadonlyArray<ProjectCase>; contact: Contact }): Knowledge {
  const { projects, contact } = input;
  const stats = HOME_STATS.slice(0, 3).map((s) => `${s.value} ${s.label.toLowerCase()}`).join(", ");
  const services = SERVICE_PAGES.map((s) => `${s.fullTitle}: ${s.summary} (page ${s.href})`).join("\n  - ");
  const phones = contact.phones.filter(Boolean).map(fmtPhone);
  const core = [
    `- Saini Tubewell Boring Service (STBS): borewell and tubewell contractor based in ${businessInfo.registeredOffice}, Haryana, working since ${company.established}. Founder and Managing Director: ${company.managingDirector}.`,
    `- Track record: ${stats}.`,
    `- Areas served: ${businessInfo.serviceAreas.join(", ")}.`,
    `- Services:\n  - ${services}`,
    `- Office: ${businessInfo.registeredOffice}, Haryana ${businessInfo.pinCode}. Hours: ${businessInfo.hours.join("; ")}.`,
    `- Contact: phone ${phones.join(", ")}; WhatsApp ${fmtPhone(contact.whatsapp)}; email ${contact.email}.`,
    `- A written proposal can be requested on the page /quote, or in this chat.`,
  ].join("\n");

  const entries: KnowledgeEntry[] = [];
  for (const page of SERVICE_PAGES) {
    for (const [q, a] of SERVICE_FAQS[page.slug] ?? []) {
      const text = `${page.title}. Q: ${q} A: ${a}`;
      if (entries.some((e) => e.text.endsWith(`Q: ${q} A: ${a}`))) continue; // shared FAQs (areas, quote) once
      const fallback = /which areas|quotation|survey before/i.test(q);
      entries.push({ text, terms: termSet(page.title, q, a), ...(fallback ? { fallback } : {}) });
    }
  }
  for (const p of projects) {
    const text = `Past project: ${p.title} (${p.sector}, ${p.location}${p.year ? `, ordered ${p.year}` : ""}). ${p.summary}${p.depth ? ` Depth: ${p.depth}.` : ""}`;
    entries.push({ text, terms: termSet(p.title, p.sector, p.location, p.summary, "project client") });
  }
  entries.push({ text: `Clients include: ${clients.join(", ")}.`, terms: termSet(clients.join(" "), "client project industry") });
  entries.push({
    text: "Pricing: STBS does not publish prices. Depth, diameter, ground conditions and materials change the cost, so every job is quoted in writing after the site details are known.",
    terms: termSet("price cost rate quote"),
  });
  return { core, entries };
}

/** The few entries that best match the question (plus a default set when nothing matches). */
export function selectRelevant(kb: Knowledge, query: string, k = 7): KnowledgeEntry[] {
  const q = [...new Set(terms(query))];
  const scored = kb.entries
    .map((e, i) => {
      let score = 0;
      for (const t of q) {
        if (e.terms.has(t)) score += 1;
        else if (t.length >= 5 && [...e.terms].some((x) => x.length >= 5 && (x.startsWith(t) || t.startsWith(x)))) score += 0.5;
      }
      return { e, i, score };
    })
    .filter((s) => s.score >= 1)
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .slice(0, k)
    .map((s) => s.e);
  return scored.length ? scored : kb.entries.filter((e) => e.fallback).slice(0, k);
}

export function buildSystemPrompt(kb: Knowledge, query: string): string {
  const details = selectRelevant(kb, query).map((e) => `- ${e.text}`).join("\n");
  return `You are STBS Assistant, the chat assistant on the website of Saini Tubewell Boring Service (STBS).

ABOUT STBS
${kb.core}

DETAILS RELEVANT TO THIS QUESTION
${details}

HOW TO REPLY
1. Answer only from the facts above. If the answer is not there (for example the right depth for a particular site, water yield, timelines, warranties, permits or approvals), say the team confirms it after looking at the site and offer a site assessment. Never guess or invent numbers, clients or projects.
2. Never give prices, rates or cost estimates, not even rough ones. Explain that every job is quoted in writing once the site details are known, and offer the form.
3. Reply in the visitor's language: Hindi in Devanagari if they write Devanagari, Hinglish (Hindi in English letters) if they write Hinglish, otherwise English. Be warm and respectful (use "aap" in Hindi).
4. Be brief: 1 to 4 short sentences, or up to 4 short lines starting with "- ". Plain text only: no bold, headings, tables or emojis.
5. Do not ask for names, phone numbers or addresses in the chat. When the visitor wants a quote, a price, a site visit or a callback, or sounds ready to start, end your reply with [[LEAD_FORM]] on its own line; the website then shows a short form.
6. If the visitor wants to talk to a person, has a complaint or an urgent problem, give the phone/WhatsApp number and end with [[HANDOFF]] on its own line.
7. Only discuss STBS and water, borewell, tubewell and rainwater topics. Politely decline anything else.
8. If asked, say you are an AI assistant for STBS.`;
}

const PRICE = /(₹|\brs\.?\s?\d|\binr\s?\d|\d[\d,.]*\s?(\/-|rupees?|rupaye|rs\b|lakh|lac|हज़ार|रुपये))/i;

/** Cleans a model reply: reads and removes the action markers, strips markdown, blocks any price. */
export function postProcess(raw: string): { text: string; action: ChatAction } {
  let action: ChatAction = null;
  if (/\[\[?\s*lead[_ ]?form\s*\]?\]/i.test(raw)) action = "lead";
  else if (/\[\[?\s*hand[_ ]?off\s*\]?\]/i.test(raw)) action = "handoff";
  let text = raw
    .replace(/\[\[?\s*(lead[_ ]?form|hand[_ ]?off)\s*\]?\]/gi, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[*•]\s+/gm, "- ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (PRICE.test(text)) {
    text = "We don't share prices in chat: depth, diameter, ground conditions and materials change the cost, so every job is quoted in writing once we know the site. Share a few details below and the team will get back to you.";
    action = "lead";
  }
  if (text.length > 1200) text = `${text.slice(0, 1190).trimEnd()}…`;
  return { text, action };
}
