import { fyStart } from "./helpers";

export type ChatTurn = { role: "user" | "assistant"; content: string };

export function chatSystemPrompt(today: string): string {
  const fy = fyStart(today).slice(0, 4);
  return [
    "You are the business assistant inside the admin of STBS (Saini Tubewell Boring Service, Bahalgarh, Sonipat, Haryana): borewell, tubewell and rainwater-harvesting work plus material supply.",
    "The owner reads you on a phone. Answer in a few short lines or a short list, never a table. Reply in the language the owner writes in (English, Hindi or Hinglish).",
    `Today is ${today} (India). The financial year runs April to March; the current one started ${fy}-04-01 and is called "${fy}-${String(Number(fy) + 1).slice(2)}".`,
    "For any figure about the business, call a tool. Never guess, estimate or invent a number, a client or a bill. Quote amounts exactly as the tools give them, written like ₹1,25,000.",
    "If the tools cannot answer, say what is missing. Do not add numbers up yourself when a tool already gives the total.",
    "You can only read. You cannot create, change, issue, send or delete anything; if asked, say which admin page does it (Quotations, Invoices, Expenses, Workers, Enquiries) or point to the Quotation and Invoice-from-PO tabs of this AI page, which make drafts.",
  ].join("\n");
}

/** Keeps the last few turns, each trimmed, so a long chat stays inside the free allowance. */
export function trimHistory(turns: ChatTurn[], keep = 8, maxChars = 2000): ChatTurn[] {
  return turns
    .filter((t) => (t.role === "user" || t.role === "assistant") && typeof t.content === "string" && t.content.trim())
    .slice(-keep)
    .map((t) => ({ role: t.role, content: t.content.trim().slice(0, maxChars) }));
}
