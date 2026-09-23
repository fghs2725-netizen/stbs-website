import assert from "node:assert/strict";
import { buildQuoteEmail, processQuote, quoteSchema, quoteWhatsAppUrl, type QuoteRequest, type QuoteSender } from "../lib/quote-request";

let passed = 0;
async function check(label: string, fn: () => void | Promise<void>) {
  await fn();
  passed++;
  console.log(`  ok  ${label}`);
}

const valid: QuoteRequest = { name: "A. Buyer", organisation: "Acme Ltd", phone: "+91 98120 03001", email: "a@example.com", service: "Rainwater Harvesting", location: "Kundli, Sonipat", details: "Two recharge pits", website: "" };

function fakeSender(result: { success: boolean; error?: string }) {
  const calls: Array<Parameters<QuoteSender>[0]> = [];
  const send: QuoteSender = async (mail) => {
    calls.push(mail);
    return result;
  };
  return { send, calls };
}

(async () => {
  await check("a valid request passes the schema", () => assert.equal(quoteSchema.safeParse(valid).success, true));

  await check("phone accepts +91, spaces, dashes and a leading 0", () => {
    for (const p of ["9812003001", "+91 98120 03001", "98120-03001", "919812003001", "09812003001"]) assert.equal(quoteSchema.safeParse({ ...valid, phone: p }).success, true, p);
  });
  await check("phone rejects short, long and non-numeric input", () => {
    for (const p of ["12345", "98120030011", "abcdefghij", ""]) assert.equal(quoteSchema.safeParse({ ...valid, phone: p }).success, false, p);
  });
  await check("required fields are enforced with readable messages", async () => {
    const r = await processQuote({ ...valid, name: "", location: "", service: "" }, fakeSender({ success: true }).send, "to@x.in");
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.status, 422);
      assert.equal(r.fields?.name, "Enter your name");
      assert.equal(r.fields?.location, "Enter the site location");
      assert.equal(r.fields?.service, "Choose a service");
    }
  });
  await check("optional email must be valid when given, and may be empty", () => {
    assert.equal(quoteSchema.safeParse({ ...valid, email: "not-an-email" }).success, false);
    assert.equal(quoteSchema.safeParse({ ...valid, email: "" }).success, true);
  });
  await check("only known services are accepted", () => assert.equal(quoteSchema.safeParse({ ...valid, service: "Anything else" }).success, false));
  await check("newlines in single-line fields are rejected (email header injection)", () => {
    assert.equal(quoteSchema.safeParse({ ...valid, name: "Bob\r\nBcc: victim@x.com" }).success, false);
    assert.equal(quoteSchema.safeParse({ ...valid, location: "a\nb" }).success, false);
  });
  await check("details over 2000 characters are rejected", () => assert.equal(quoteSchema.safeParse({ ...valid, details: "x".repeat(2001) }).success, false));

  await check("a valid request is sent once, to the recipient, and reports success", async () => {
    const { send, calls } = fakeSender({ success: true });
    const r = await processQuote(valid, send, "quotes@x.in");
    assert.deepEqual(r, { ok: true });
    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0].to, ["quotes@x.in"]);
    assert.match(calls[0].subject, /Rainwater Harvesting/);
    assert.equal(calls[0].metadata.source, "website-quote-form");
  });
  await check("honeypot: a filled hidden field looks successful but sends NOTHING", async () => {
    const { send, calls } = fakeSender({ success: true });
    const r = await processQuote({ ...valid, website: "http://spam.example" }, send, "quotes@x.in");
    assert.deepEqual(r, { ok: true });
    assert.equal(calls.length, 0);
  });
  await check("invalid input never reaches the sender", async () => {
    const { send, calls } = fakeSender({ success: true });
    await processQuote({ ...valid, phone: "1" }, send, "quotes@x.in");
    assert.equal(calls.length, 0);
  });
  await check("a failed send is reported as a failure (never a false success)", async () => {
    const r = await processQuote(valid, fakeSender({ success: false, error: "SMTP host not configured" }).send, "quotes@x.in");
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.status, 503);
      assert.doesNotMatch(r.error, /SMTP|host|configured/i, "provider details must not leak to the visitor");
    }
  });

  // The admin app stores each request before emailing it.
  const fakeStore = (outcome: "ok" | "throw") => {
    const saved: QuoteRequest[] = [];
    const store = async (q: QuoteRequest) => {
      if (outcome === "throw") throw new Error("database down");
      saved.push(q);
      return "enq_1";
    };
    return { store, saved };
  };
  await check("a stored request reports its id and is still emailed, carrying the id", async () => {
    const { send, calls } = fakeSender({ success: true });
    const { store, saved } = fakeStore("ok");
    const r = await processQuote(valid, send, "quotes@x.in", store);
    assert.deepEqual(r, { ok: true, enquiryId: "enq_1" });
    assert.equal(saved.length, 1);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].metadata.enquiryId, "enq_1");
  });
  await check("stored but the email failed: still a success, because the owner has it", async () => {
    const r = await processQuote(valid, fakeSender({ success: false }).send, "quotes@x.in", fakeStore("ok").store);
    assert.deepEqual(r, { ok: true, enquiryId: "enq_1" });
  });
  await check("not stored but emailed: a success with no id", async () => {
    const r = await processQuote(valid, fakeSender({ success: true }).send, "quotes@x.in", fakeStore("throw").store);
    assert.deepEqual(r, { ok: true });
  });
  await check("neither stored nor emailed: a failure", async () => {
    const r = await processQuote(valid, fakeSender({ success: false }).send, "quotes@x.in", fakeStore("throw").store);
    assert.equal(r.ok, false);
  });
  await check("honeypot and invalid input are never stored", async () => {
    const { store, saved } = fakeStore("ok");
    await processQuote({ ...valid, website: "http://spam.example" }, fakeSender({ success: true }).send, "quotes@x.in", store);
    await processQuote({ ...valid, phone: "1" }, fakeSender({ success: true }).send, "quotes@x.in", store);
    assert.equal(saved.length, 0);
  });

  await check("email body escapes visitor HTML", () => {
    const { htmlBody, textBody } = buildQuoteEmail({ ...valid, details: '<script>alert(1)</script> & "q"' });
    assert.doesNotMatch(htmlBody, /<script>/);
    assert.match(htmlBody, /&lt;script&gt;/);
    assert.match(textBody, /<script>alert\(1\)<\/script>/); // plain text is not HTML: kept as typed
  });
  await check("subject is a single line, capped in length", () => {
    const { subject } = buildQuoteEmail({ ...valid, name: "N".repeat(100) });
    assert.doesNotMatch(subject, /[\r\n]/);
    assert.ok(subject.length <= 200);
  });
  await check("WhatsApp fallback link carries the details, URL-encoded, to the primary number", () => {
    const url = quoteWhatsAppUrl(valid);
    assert.match(url, /^https:\/\/wa\.me\/919812003001\?text=/);
    assert.match(decodeURIComponent(url), /Service: Rainwater Harvesting/);
    assert.match(decodeURIComponent(url), /Site: Kundli, Sonipat/);
  });

  console.log(`\n${passed} checks passed`);
})();
