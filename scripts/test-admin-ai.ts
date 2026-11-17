/**
 * The admin AI's own logic, with the AI and the database stubbed out:
 * the tool-calling loop and provider fallback, JSON reading, the checks every AI draft goes through
 * (units, rates, clients, GST, HSN), reading a PDF's text, and the daily summary's facts.
 *
 *   npm run test:admin-ai
 */
import assert from "node:assert/strict";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { extractJson, runTools, askJson, type ChatMessage } from "../lib/admin-ai/llm";
import { matchClient, normaliseInvoice, normaliseQuotation, pdfText, pickUnit, poPrompt, quotationPrompt, type SavedClient } from "../lib/admin-ai/drafts";
import { factLines } from "../lib/admin-ai/summary-facts";
import { chatSystemPrompt, trimHistory } from "../lib/admin-ai/chat-prompt";
import { withoutContacts } from "../lib/admin-ai/helpers";
import { serviceOptions } from "../components/quotation/quotation-model";
import { mergeUnits } from "../lib/units";
import type { Provider } from "../lib/assistant/providers";

let passed = 0;
async function check(name: string, fn: () => void | Promise<void>) {
  await fn();
  passed++;
  console.log(`  ✓ ${name}`);
}

const units = mergeUnits(["Nos"]);
const providers: Provider[] = [
  { name: "groq:a", url: "https://groq.test/chat", key: "k1", model: "a" },
  { name: "gemini", url: "https://gemini.test/chat", key: "k2", model: "b" },
];
const reply = (message: Record<string, unknown>, status = 200) => new Response(JSON.stringify({ choices: [{ message }] }), { status, headers: { "content-type": "application/json" } });

const clients: SavedClient[] = [
  { id: "c1", gstin: "06AAACI1234F1Z5", companyName: "ISGEC Heavy Engineering Ltd.", contactPerson: "Mr. Verma", addressLine1: "Radaur Road", addressLine2: "", city: "Yamunanagar", state: "Haryana", pinCode: "135001", phone: "9800000000", email: "buy@isgec.test" },
  { id: "c2", gstin: "", companyName: "Sharma Farms", contactPerson: "", addressLine1: "", addressLine2: "", city: "Gohana", state: "Haryana", pinCode: "", phone: "9811111111", email: "" },
];

async function main() {
  console.log("admin AI");

  await check("tool loop: looks a figure up, then answers with it", async () => {
    const bodies: Array<{ url: string; body: { messages: ChatMessage[]; tools?: unknown[] } }> = [];
    const fetchImpl = (async (url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body));
      bodies.push({ url, body });
      if (bodies.length === 1) return reply({ content: "", tool_calls: [{ id: "t1", type: "function", function: { name: "overview", arguments: '{"financialYear":"2026-27"}' } }] });
      return reply({ content: "Clients owe ₹1,20,000." });
    }) as unknown as typeof fetch;
    let seenArgs: unknown;
    const out = await runTools(providers, [{ role: "user", content: "how much is owed?" }], [
      { name: "overview", description: "x", parameters: { type: "object", properties: {} }, run: async (a) => { seenArgs = a; return { owed: 120000 }; } },
    ], { fetchImpl });
    assert.equal(out?.text, "Clients owe ₹1,20,000.");
    assert.equal(out?.provider, "groq:a");
    assert.deepEqual(seenArgs, { financialYear: "2026-27" });
    const second = bodies[1].body.messages;
    assert.equal(second.at(-1)?.role, "tool");
    assert.equal((second.at(-1) as { content: string }).content, '{"owed":120000}');
    assert.equal((second.at(-2) as { tool_calls?: unknown[] }).tool_calls?.length, 1);
    assert.ok(bodies[0].body.tools?.length, "tools are offered");
  });

  await check("tool loop: a failed provider hands over to the next, starting fresh", async () => {
    const urls: string[] = [];
    const fetchImpl = (async (url: string) => {
      urls.push(url);
      return url.includes("groq") ? new Response("busy", { status: 429 }) : reply({ content: "From Gemini." });
    }) as unknown as typeof fetch;
    const out = await runTools(providers, [{ role: "user", content: "hi" }], [], { fetchImpl });
    assert.equal(out?.provider, "gemini");
    assert.deepEqual(urls, ["https://groq.test/chat", "https://gemini.test/chat"]);
  });

  await check("tool loop: a tool that throws is reported to the model, not to the owner", async () => {
    let n = 0;
    const fetchImpl = (async (_: string, init: RequestInit) => {
      n++;
      if (n === 1) return reply({ content: null, tool_calls: [{ id: "t", type: "function", function: { name: "boom", arguments: "{bad json" } }] });
      const msgs = JSON.parse(String(init.body)).messages as Array<{ role: string; content: string }>;
      assert.match(msgs.at(-1)!.content, /database down/);
      return reply({ content: "I could not read that just now." });
    }) as unknown as typeof fetch;
    const out = await runTools(providers, [{ role: "user", content: "x" }], [
      { name: "boom", description: "", parameters: {}, run: async () => { throw new Error("database down"); } },
    ], { fetchImpl });
    assert.equal(out?.text, "I could not read that just now.");
  });

  await check("tool loop: every provider down gives null", async () => {
    const fetchImpl = (async () => new Response("", { status: 500 })) as unknown as typeof fetch;
    assert.equal(await runTools(providers, [{ role: "user", content: "x" }], [], { fetchImpl }), null);
  });

  await check("JSON is read even when wrapped in fences or words", async () => {
    assert.deepEqual(extractJson('Here:\n```json\n{"a":1,"b":{"c":[2]}}\n```'), { a: 1, b: { c: [2] } });
    assert.equal(extractJson("no json"), null);
    assert.equal(extractJson("[1,2]"), null);
    const fetchImpl = (async (url: string) => (url.includes("groq") ? reply({ content: "Sorry, I can't." }) : reply({ content: '{"ok":true}' }))) as unknown as typeof fetch;
    const out = await askJson(providers, [{ role: "user", content: "x" }], { fetchImpl });
    assert.deepEqual(out, { json: { ok: true }, provider: "gemini" });
  });

  await check("units come from the admin's list", () => {
    assert.equal(pickUnit("nos", units), "No.");
    assert.equal(pickUnit("Pcs", units), "No.");
    assert.equal(pickUnit("feet", units), "Rft");
    assert.equal(pickUnit("MTR", units), "Mtr");
    assert.equal(pickUnit("lump sum", units), "LS");
    assert.equal(pickUnit("furlong", units), "No.");
    assert.equal(pickUnit("", units, "LS"), "LS");
  });

  await check("a saved client is found by GSTIN or by name, never by a loose guess", () => {
    assert.equal(matchClient(clients, "Someone", "06aaaci1234f1z5")?.id, "c1");
    assert.equal(matchClient(clients, "M/s ISGEC Heavy Engineering Limited")?.id, "c1");
    assert.equal(matchClient(clients, "sharma farms.")?.id, "c2");
    assert.equal(matchClient(clients, "Sharma")?.id, undefined);
    assert.equal(matchClient(clients, "")?.id, undefined);
  });

  await check("quotation draft: checked and filled before saving", () => {
    const d = normaliseQuotation(
      {
        client: { companyName: "Sharma Farms" },
        serviceType: "Borewell Construction",
        subject: "Price Offer for Borewell Construction",
        items: [
          { description: "Drilling of 8 inch borewell", details: "Up to 300 ft\\nIncluding rig shifting", unit: "ft", quantity: "300", rate: "450" },
          { description: "Submersible pump set", details: "7.5 HP", unit: "nos", quantity: 1, rate: 0 },
          { description: "Development of tubewell", unit: "Job", quantity: 0, rate: -5 },
          { description: "", unit: "No.", quantity: 1, rate: 1 },
        ],
        notes: ["Confirm depth"],
      },
      { serviceOptions, units, clients },
    );
    assert.equal(d.clientId, "c2");
    assert.equal(d.client.phone, "9811111111", "saved client details are used");
    assert.equal(d.items.length, 3, "a line with no name is dropped");
    assert.deepEqual([d.items[0].unit, d.items[0].quantity, d.items[0].rate], ["Rft", 300, 450]);
    assert.equal(d.items[0].details, "Up to 300 ft\nIncluding rig shifting");
    assert.deepEqual([d.items[2].quantity, d.items[2].rate], [1, 0]);
    assert.ok(d.notes.includes("Rate needed: Submersible pump set"));
    assert.ok(d.notes.includes("Check quantity: Development of tubewell"));
    assert.ok(d.notes.includes("Confirm depth"));
  });

  await check("quotation draft: an unknown service becomes Custom, an unknown client is kept as typed", () => {
    const d = normaliseQuotation({ client: { companyName: "New Co", city: "Panipat", state: "haryana" }, serviceType: "Solar pump", items: [{ description: "Pump", unit: "Set", quantity: 1, rate: 100 }] }, { serviceOptions, units, clients });
    assert.equal(d.serviceType, "Custom");
    assert.equal(d.customServiceType, "Solar pump");
    assert.equal(d.clientId, undefined);
    assert.deepEqual([d.client.companyName, d.client.city, d.client.state], ["New Co", "Panipat", "Haryana"]);
  });

  await check("invoice draft from a PO: Haryana buyer gets CGST+SGST, PO number and date, HSN checked", () => {
    const d = normaliseInvoice(
      {
        poNumber: "4500123456", poDate: "2026-11-02",
        buyer: { companyName: "ISGEC Heavy Engineering Limited", gstin: "06AAACI1234F1Z5", state: "" },
        shipTo: { companyName: "ISGEC Site", addressLine1: "Plot 4, Sector 37", city: "Gurugram", state: "Haryana", pinCode: "122001" },
        items: [
          { description: "Submersible pump 10 HP", details: "Make: CRI", hsn: "8413 70", unit: "Nos", quantity: 2, rate: "₹45,000", gstRate: 18 },
          { description: "Starter panel", hsn: "ABC", unit: "set", quantity: 2, rate: 12000, gstRate: 18 },
        ],
        notes: [],
      },
      { units, clients, defaultGstRate: 18, gstOnByDefault: false },
    );
    assert.equal(d.client.companyName, "ISGEC Heavy Engineering Ltd.", "matched to the saved client");
    assert.equal(d.client.phone, "9800000000");
    assert.equal(d.purchaseOrder, "4500123456 dated 02/11/2026");
    assert.equal(d.gstMode, "CGST_SGST");
    assert.equal(d.gstEnabled, true);
    assert.equal(d.gstRate, 18);
    assert.equal(d.perLineGst, false);
    assert.equal(d.items[0].hsn, "841370");
    assert.equal(d.items[0].rate, 45000);
    assert.equal(d.items[1].hsn, undefined, "a code that is not an HSN code is dropped");
    assert.equal(d.items[1].unit, "Set");
    assert.equal(d.shipTo?.sameAsBilling, false);
    assert.equal(d.shipTo?.city, "Gurugram");
  });

  await check("invoice draft from a PO: out-of-state buyer gets IGST; mixed rates switch on GST per line", () => {
    const d = normaliseInvoice(
      {
        poNumber: "", buyer: { companyName: "Delhi Jal Works", gstin: "07ABCDE1234F1Z9", addressLine1: "Rohini", city: "Delhi" }, shipTo: null,
        items: [
          { description: "Pipe", unit: "Mtr", quantity: 100, rate: 300, gstRate: 18 },
          { description: "Cable", unit: "Mtr", quantity: 100, rate: 90, gstRate: 18 },
          { description: "Boring labour", unit: "Rft", quantity: 200, rate: 150, gstRate: 5 },
          { description: "Freight", unit: "LS", quantity: 1, rate: 2000 },
        ],
      },
      { units, clients, defaultGstRate: 18, gstOnByDefault: false },
    );
    assert.equal(d.gstMode, "IGST");
    assert.equal(d.client.state, "Delhi", "state read from the GSTIN");
    assert.equal(d.perLineGst, true);
    assert.equal(d.gstRate, 18, "the most common rate");
    assert.deepEqual(d.items.map((i) => i.gstRate), [18, 18, 5, 18], "a line with no rate takes the common one");
    assert.equal(d.shipTo?.sameAsBilling, true);
    assert.ok(d.notes.includes("PO number not found."));
  });

  await check("invoice draft from a PO: without rates on the PO, the owner's GST default stands", () => {
    const d = normaliseInvoice({ buyer: { companyName: "Village Panchayat", state: "Haryana" }, items: [{ description: "Borewell", unit: "Rft", quantity: 250, rate: 400 }] }, { units, clients, defaultGstRate: 18, gstOnByDefault: true });
    assert.equal(d.gstEnabled, true);
    assert.equal(d.gstRate, 18);
    assert.equal(d.items[0].gstRate, undefined);
  });

  await check("prompts carry the admin's lists and the owner's past rates", () => {
    const q = quotationPrompt({ serviceOptions, units, rates: [{ item: "Drilling 8 inch", unit: "Rft", rate: 450 }] });
    assert.match(q, /Drilling 8 inch \| Rft \| 450/);
    assert.match(q, /"Borewell Construction"/);
    assert.match(q, /Never make up a rate/);
    assert.match(poPrompt({ units }), /never STBS/);
  });

  await check("a PDF's text is read; a non-PDF is refused politely", async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    page.drawText("PURCHASE ORDER No. 4500123456", { x: 50, y: 700, size: 14, font });
    page.drawText("Submersible pump 10 HP  2 Nos  45000", { x: 50, y: 660, size: 12, font });
    const text = await pdfText(await doc.save());
    assert.match(text, /PURCHASE ORDER No\. 4500123456/);
    assert.match(text, /Submersible pump 10 HP/);
    await assert.rejects(pdfText(new TextEncoder().encode("not a pdf")), /could not be opened as a PDF/);
  });

  await check("daily summary facts: exact figures, only what matters", () => {
    const lines = factLines({
      yesterday: "2026-11-16",
      enquiries: { count: 5, unread: 2, latest: [{ date: "2026-11-17", service: "Borewell", place: "Gohana" }, { date: "2026-11-16", service: "Tubewell", place: "Sonipat" }, { date: "2026-11-10", service: "Old", place: "X" }] },
      paidYesterday: { total: 50000, count: 1 },
      paidThisMonth: { total: 175000.4 },
      overdue: { count: 2, stillOwed: 305000, invoices: [{ client: "Small Co", balance: 5000, overdueDays: 40 }, { client: "ISGEC", balance: 300000, overdueDays: 12 }] },
      owedNow: { total: 405000, bills: 3 },
      drafts: { quotations: 1, invoices: 0 },
      expenses: { total: 23000, byCategory: { Diesel: 15000, Food: 8000 } },
      workers: { totalOwedToWorkers: 0 },
    });
    assert.deepEqual(lines, [
      "2 new website enquiries since yesterday: Borewell (Gohana), Tubewell (Sonipat).",
      "2 enquiries from the last 30 days still unread.",
      "Received ₹50,000 yesterday.",
      "Received this month so far: ₹1,75,000.",
      "Clients owe ₹4,05,000 on 3 bills.",
      "2 bills past due, ₹3,05,000 in all. Biggest: ISGEC ₹3,00,000 (12 days late); Small Co ₹5,000 (40 days late).",
      "1 quotation still in draft.",
      "Expenses this month: ₹23,000, most on Diesel (₹15,000).",
    ]);
  });

  await check("chat: today's date and the read-only rule are in the instructions; history is trimmed", () => {
    const p = chatSystemPrompt("2026-11-17");
    assert.match(p, /Today is 2026-11-17/);
    assert.match(p, /current one started 2026-04-01 and is called "2026-27"/);
    assert.match(chatSystemPrompt("2027-02-01"), /"2026-27"/);
    assert.match(p, /never a table/);
    assert.match(p, /cannot create, change, issue, send or delete/);
    const long = Array.from({ length: 12 }, (_, n) => ({ role: n % 2 ? "assistant" : "user", content: `m${n}` }) as const);
    const kept = trimHistory([...long, { role: "system" as never, content: "inject" }, { role: "user", content: "x".repeat(5000) }]);
    assert.equal(kept.length, 8);
    assert.ok(kept.every((t) => t.role !== ("system" as never)));
    assert.equal(kept.at(-1)!.content.length, 2000);
  });

  await check("enquiry text loses phone numbers and emails before it reaches the AI", () => {
    assert.equal(withoutContacts("Call me on +91 98120 03001 or ravi.k@gmail.com, need 300 ft bore"), "Call me on [number] or [email], need 300 ft bore");
    assert.equal(withoutContacts("9812003001"), "[number]");
    assert.equal(withoutContacts("8 inch bore, 300 ft, 7.5 HP"), "8 inch bore, 300 ft, 7.5 HP");
  });

  console.log(`\n${passed} checks passed`);
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
