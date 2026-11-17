/**
 * WhatsApp status maker: the occasion calendar and the text helpers the stories draw with.
 *   npm run test:status
 */
import assert from "node:assert/strict";
import { CUSTOM_OCCASION, OCCASIONS, occasionDate, shortDate, todayInIndia, upcomingOccasions, whenLabel } from "../lib/status/occasions";
import { STORY, STORY_FONTS, STORY_LAYOUTS, displayPhone, splitGreeting, storyFileName, wrapLines } from "../lib/status/render";
import { STORY_BRAND } from "../lib/status/brand";
import { ArtworkError, DEFAULT_IMAGE_MODEL, artworkPrompt, generateArtwork } from "../lib/status/artwork";
import fs from "node:fs";

let passed = 0;
const check = (name: string, fn: () => void) => { fn(); passed++; console.log(`  ok  ${name}`); };

check("every occasion has a unique id, a date rule, and a greeting with two lines in both languages", () => {
  const ids = new Set<string>();
  for (const o of [...OCCASIONS, CUSTOM_OCCASION]) {
    assert.ok(!ids.has(o.id), `duplicate id ${o.id}`);
    ids.add(o.id);
    if (o !== CUSTOM_OCCASION) assert.ok(Boolean(o.day) !== Boolean(o.dates), `${o.id} needs a fixed day or yearly dates, not both`);
    for (const lang of ["en", "hi"] as const) {
      assert.ok(o.title[lang].trim(), `${o.id} title ${lang}`);
      assert.equal(o.lines[lang].length, 2, `${o.id} lines ${lang}`);
      for (const line of o.lines[lang]) assert.ok(line.trim().length > 0 && line.length <= 140, `${o.id} line ${lang}: ${line}`);
    }
    assert.match(o.title.hi + o.lines.hi.join(""), /[ऀ-ॿ]/, `${o.id} Hindi text is in Devanagari`);
    assert.doesNotMatch(o.title.en + o.lines.en.join(""), /[ऀ-ॿ]/, `${o.id} English text has no Devanagari`);
  }
});

check("dates are real calendar days", () => {
  for (const o of OCCASIONS) {
    for (const day of [o.day, ...Object.values(o.dates ?? {})]) {
      if (!day) continue;
      assert.match(day, /^\d{2}-\d{2}$/, `${o.id} ${day}`);
      const d = new Date(`2028-${day}T00:00:00Z`); // a leap year, so 02-29 would pass if ever used
      assert.equal(d.toISOString().slice(5, 10), day, `${o.id} ${day}`);
    }
  }
});

check("festival dates that move are the published ones", () => {
  const date = (id: string, year: number) => occasionDate(OCCASIONS.find((o) => o.id === id)!, year);
  assert.equal(date("guru-nanak-jayanti", 2026), "2026-11-24");
  assert.equal(date("maha-shivratri", 2027), "2027-03-06");
  assert.equal(date("holi", 2027), "2027-03-22");
  assert.equal(date("raksha-bandhan", 2027), "2027-08-17");
  assert.equal(date("janmashtami", 2027), "2027-08-25");
  assert.equal(date("dussehra", 2027), "2027-10-09");
  assert.equal(date("diwali", 2027), "2027-10-29");
  assert.equal(date("guru-nanak-jayanti", 2027), "2027-11-14");
  assert.equal(date("diwali", 2026), null); // not listed: not offered, never guessed
  assert.equal(date("childrens-day", 2031), "2031-11-14");
});

check("today is India's date, whatever the server's clock zone", () => {
  assert.equal(todayInIndia(new Date("2026-11-13T18:29:00Z")), "2026-11-13"); // 23:59 IST
  assert.equal(todayInIndia(new Date("2026-11-13T18:30:00Z")), "2026-11-14"); // 00:00 IST
  assert.equal(todayInIndia(new Date("2026-12-31T20:00:00Z")), "2027-01-01");
});

check("the picker lists today's occasion first, then the next ones in order, across the new year", () => {
  const onDay = upcomingOccasions("2026-11-14");
  assert.equal(onDay[0].occasion.id, "childrens-day");
  assert.equal(onDay[0].daysAway, 0);
  assert.equal(whenLabel(onDay[0]), "Today");
  assert.equal(onDay[1].occasion.id, "guru-nanak-jayanti");
  assert.equal(whenLabel(onDay[1]), "24 Nov");

  const after = upcomingOccasions("2026-11-17");
  assert.deepEqual(after.slice(0, 5).map((d) => d.occasion.id), ["guru-nanak-jayanti", "kisan-diwas", "christmas", "new-year", "lohri"]);
  assert.equal(after.find((d) => d.occasion.id === "new-year")!.date, "2027-01-01");
  for (let n = 1; n < after.length; n++) assert.ok(after[n].daysAway >= after[n - 1].daysAway);
  assert.equal(new Set(after.map((d) => d.occasion.id)).size, after.length, "each occasion once");
  assert.equal(whenLabel(upcomingOccasions("2026-12-24")[0]), "Tomorrow");
  assert.equal(shortDate("2027-03-06"), "6 Mar");
});

check("festival dates are listed at least six months ahead", () => {
  // Fails when the yearly dates in occasions.ts are running out: add next year's.
  const today = todayInIndia();
  const year = Number(today.slice(0, 4));
  const horizon = `${today.slice(5, 7) <= "06" ? year : year + 1}`;
  const movable = OCCASIONS.filter((o) => o.dates);
  const listed = movable.filter((o) => o.dates![Number(horizon)]);
  assert.ok(listed.length >= movable.length - 1, `add ${horizon} dates for: ${movable.filter((o) => !o.dates![Number(horizon)]).map((o) => o.id).join(", ")}`);
});

check("text wraps at words and never drops any", () => {
  const measure = (s: string) => s.length * 10;
  assert.deepEqual(wrapLines(measure, "Happy Children's Day", 120), ["Happy", "Children's", "Day"]);
  assert.deepEqual(wrapLines(measure, "Happy Children's Day", 400), ["Happy Children's Day"]);
  assert.deepEqual(wrapLines(measure, "one\ntwo three", 400), ["one", "two three"]);
  assert.deepEqual(wrapLines(measure, "Supercalifragilistic word", 100), ["Supercalifragilistic", "word"]);
  assert.deepEqual(wrapLines(measure, "   ", 100), []);
  const hindi = "बाल दिवस की हार्दिक शुभकामनाएँ";
  assert.equal(wrapLines(measure, hindi, 150).join(" "), hindi);
});

check("phone, file names, greeting split and the story frame", () => {
  assert.equal(displayPhone("9812003001"), "+91 9812003001");
  assert.equal(displayPhone("+91 98120 03001"), "+91 9812003001");
  assert.equal(displayPhone("0130-2381207"), "0130-2381207");
  assert.equal(storyFileName("childrens-day", 0), "stbs-childrens-day-1.jpg");
  assert.equal(storyFileName("../x", 3), "stbs-x-4.jpg");
  assert.deepEqual(splitGreeting("Happy Dussehra"), { kicker: "HAPPY", main: "Dussehra" });
  assert.deepEqual(splitGreeting("Merry Christmas"), { kicker: "MERRY", main: "Christmas" });
  assert.deepEqual(splitGreeting("World Water Day"), { kicker: "", main: "World Water Day" });
  assert.deepEqual(splitGreeting("दशहरा की हार्दिक शुभकामनाएँ"), { kicker: "", main: "दशहरा की हार्दिक शुभकामनाएँ" });
  assert.equal(STORY.width / STORY.height, 9 / 16);
  assert.equal(STORY_LAYOUTS.length, 4);
  for (const font of STORY_FONTS) assert.ok(fs.existsSync(`public${font.url}`), `${font.url} is in the repo`);
});

check("the footer carries what the owner's posters carry", () => {
  assert.deepEqual(STORY_BRAND.phones, ["9812003001", "7988024114"]);
  assert.equal(STORY_BRAND.website, "www.stbs.in");
  assert.equal(STORY_BRAND.tagline, "Engineering a Better Tomorrow");
  assert.equal(STORY_BRAND.since, "SINCE 1992");
  assert.deepEqual(STORY_BRAND.services, ["BOREWELL", "TUBEWELL", "RAINWATER HARVESTING", "MATERIAL SUPPLY"]);
});

check("every occasion has a picture prompt that forbids text; a custom one needs the owner's words", () => {
  for (const o of OCCASIONS) {
    const prompt = artworkPrompt(o.id);
    assert.ok(prompt, `${o.id} has a scene`);
    assert.match(prompt!, /no text, letters, numbers, logos/);
    assert.ok(prompt!.includes(o.name), o.id);
  }
  assert.match(artworkPrompt("diwali", "  with a   tubewell in the field ")!, /Also: with a tubewell in the field\./);
  assert.equal(artworkPrompt("custom"), null);
  assert.match(artworkPrompt("custom", "sunrise over wheat fields")!, /Scene: sunrise over wheat fields\./);
  assert.equal(artworkPrompt("no-such-day"), null);
  assert.ok(artworkPrompt("custom", "x".repeat(900))!.length < 800, "the owner's words are capped");
});

async function pictureRequest() {
  let sent: { url: string; headers: Record<string, string>; body: Record<string, unknown> } | undefined;
  const reply = (status: number, json: unknown) => async (url: string, init: { headers: Record<string, string>; body: string }) => {
    sent = { url, headers: init.headers, body: JSON.parse(init.body) };
    return { ok: status < 400, status, json: async () => json };
  };
  const bytes = await generateArtwork("a prompt", { apiKey: "test-key", fetch: reply(200, { data: [{ b64_json: Buffer.from([255, 216, 255]).toString("base64") }] }) });
  assert.deepEqual([...bytes], [255, 216, 255]);
  assert.equal(sent!.url, "https://api.openai.com/v1/images/generations");
  assert.equal(sent!.headers.Authorization, "Bearer test-key");
  assert.deepEqual(sent!.body, { model: DEFAULT_IMAGE_MODEL, prompt: "a prompt", n: 1, size: "1024x1536", quality: "medium", output_format: "jpeg", output_compression: 90 });
  await generateArtwork("p", { apiKey: "k", model: "other-model", fetch: reply(200, { data: [{ b64_json: "AA==" }] }) });
  assert.equal(sent!.body.model, "other-model");

  const fails = async (status: number, json: unknown, pattern: RegExp, code: number) => {
    await assert.rejects(generateArtwork("p", { apiKey: "k", fetch: reply(status, json) }), (e: unknown) => e instanceof ArtworkError && pattern.test(e.message) && e.status === code && !e.message.includes("test-key"));
  };
  await fails(401, { error: { message: "Incorrect API key" } }, /key was not accepted/, 502);
  await fails(429, { error: { message: "quota" } }, /out of credit or over its limit/, 502);
  await fails(400, { error: { message: "Rejected by the safety system" } }, /declined to draw/, 422);
  await fails(500, { error: { message: "boom" } }, /could not make the picture: boom/, 502);
  await fails(200, { data: [] }, /without a picture/, 502);
  await assert.rejects(generateArtwork("p", { apiKey: "k", fetch: async () => { throw new Error("offline"); } }), /could not be reached/);
  passed++;
  console.log("  ok  the picture request is a portrait JPEG, and failures come back in plain words");
}

pictureRequest().then(() => console.log(`\n${passed} checks passed.`)).catch((error) => { console.error(error); process.exit(1); });
