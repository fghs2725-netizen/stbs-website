import assert from "node:assert/strict";
import {
  RESET_COOLDOWN_MS,
  RESET_TTL_MS,
  hashToken,
  isExpired,
  issuedRecently,
  looksLikeToken,
  newRawToken,
  normalizeIdentifier,
  parseRecoveryAddress,
  resetEmail,
  resetIdentifier,
  tokenExpiry,
} from "../lib/password-reset-core";
import { newPasswordProblem, passwordProblem } from "../lib/password-policy";

let passed = 0;
function check(label: string, fn: () => void) { fn(); passed++; console.log(`  ok  ${label}`); }

/* ---------- tokens ---------- */

check("tokens are 43 URL-safe characters and never repeat", () => {
  const seen = new Set<string>();
  for (let i = 0; i < 500; i++) {
    const t = newRawToken();
    assert.match(t, /^[A-Za-z0-9_-]{43}$/);
    assert.ok(looksLikeToken(t));
    seen.add(t);
  }
  assert.equal(seen.size, 500);
});
check("only well-formed values are treated as tokens (so junk never reaches the database)", () => {
  for (const bad of [undefined, null, 5, "", "short", "a".repeat(42), "a".repeat(44), "a".repeat(42) + "!", "a".repeat(42) + " ", ["x"], { t: 1 }]) assert.equal(looksLikeToken(bad), false);
});
check("what is stored is a one-way SHA-256 of the token, not the token", () => {
  const raw = newRawToken();
  const stored = hashToken(raw);
  assert.match(stored, /^[0-9a-f]{64}$/);
  assert.notEqual(stored, raw);
  assert.ok(!stored.includes(raw));
  assert.equal(hashToken(raw), stored, "stable, so a presented token can be looked up");
  assert.notEqual(hashToken(newRawToken()), stored);
});
check("the token identifier is namespaced per account and cannot collide with other uses of the table", () => {
  assert.equal(resetIdentifier("abc123"), "pwreset:abc123");
  assert.notEqual(resetIdentifier("a"), resetIdentifier("b"));
});

/* ---------- timing ---------- */

check("a token lives exactly 30 minutes and is expired at, not after, the boundary", () => {
  const now = 1_000_000_000_000;
  const expires = tokenExpiry(now);
  assert.equal(expires.getTime() - now, RESET_TTL_MS);
  assert.equal(RESET_TTL_MS, 30 * 60 * 1000);
  assert.equal(isExpired(expires, now + RESET_TTL_MS - 1), false);
  assert.equal(isExpired(expires, now + RESET_TTL_MS), true);
  assert.equal(isExpired(expires, now + RESET_TTL_MS + 1), true);
});
check("a second email is held back for 5 minutes after the first, then allowed", () => {
  const issuedAt = 2_000_000_000_000;
  const expires = tokenExpiry(issuedAt);
  assert.equal(RESET_COOLDOWN_MS, 5 * 60 * 1000);
  assert.equal(issuedRecently(expires, issuedAt), true, "immediately");
  assert.equal(issuedRecently(expires, issuedAt + RESET_COOLDOWN_MS - 1), true, "just inside the cooldown");
  assert.equal(issuedRecently(expires, issuedAt + RESET_COOLDOWN_MS), false, "exactly at the boundary it is allowed again");
  assert.equal(issuedRecently(expires, issuedAt + RESET_TTL_MS), false, "long after");
});
check("mail-bombing is bounded: at most 12 emails an hour to one inbox", () => {
  assert.ok(Math.floor((60 * 60 * 1000) / RESET_COOLDOWN_MS) <= 12);
});

/* ---------- where the link may go, and who may ask ---------- */

check("the recovery address must be a single, plain email address", () => {
  assert.equal(parseRecoveryAddress("owner@example.com"), "owner@example.com");
  assert.equal(parseRecoveryAddress("  owner@example.com  "), "owner@example.com");
  for (const bad of [undefined, null, "", "  ", "nope", "a@b", "a@b.c", "a b@example.com", "a@example.com, b@example.com", "a@example.com;b@example.com", "<a@example.com>", "a@@example.com", "x".repeat(250) + "@e.com"]) {
    assert.equal(parseRecoveryAddress(bad as string), null, String(bad));
  }
});
check("the typed identifier is trimmed, lower-cased and bounded; non-strings become empty", () => {
  assert.equal(normalizeIdentifier("  Admin@STBS.com "), "admin@stbs.com");
  assert.equal(normalizeIdentifier("x".repeat(500)).length, 254);
  for (const bad of [undefined, null, 5, {}, []]) assert.equal(normalizeIdentifier(bad), "");
});

/* ---------- the email ---------- */

const mail = resetEmail({ link: "https://www.stbs.in/admin/reset-password?token=TOKEN123", account: "admin@stbs.com", requestedAt: "21 Sept 2026, 10:15" });
check("the email carries the link once in the text, mentions expiry, and says what to do if it was not you", () => {
  assert.equal(mail.text.split("TOKEN123").length - 1, 1);
  assert.match(mail.text, /30 minutes/);
  assert.match(mail.text, /ignore this email/i);
  assert.ok(!mail.subject.includes("TOKEN123"), "the token is never in the subject line");
});
check("account text in the HTML email is escaped, so it cannot inject markup", () => {
  const evil = resetEmail({ link: "https://x.test/r?token=T", account: `"><script>alert(1)</script>`, requestedAt: "now" });
  assert.ok(!evil.html.includes("<script>"));
  assert.match(evil.html, /&lt;script&gt;/);
});
check("a link with special characters cannot break out of the href attribute", () => {
  const m = resetEmail({ link: `https://x.test/r?token=T" onmouseover="alert(1)`, account: "a@b.co", requestedAt: "now" });
  assert.ok(!/href="[^"]*"\s+onmouseover=/.test(m.html));
});

/* ---------- choosing the new password ---------- */

check("resetting needs no current password, but every other rule still applies", () => {
  assert.equal(newPasswordProblem({ next: "a-Fresh-Long-Phrase-7", confirm: "a-Fresh-Long-Phrase-7", email: "admin@stbs.com" }), null);
  assert.match(newPasswordProblem({ next: "short", confirm: "short" })!, /at least/i);
  assert.match(newPasswordProblem({ next: "a-Fresh-Long-Phrase-7", confirm: "different" })!, /do not match/i);
  assert.match(newPasswordProblem({ next: "STBS@admin123", confirm: "STBS@admin123" })!, /default password/i);
  assert.match(newPasswordProblem({ next: "aaaaaaaaaaaa", confirm: "aaaaaaaaaaaa" })!, /repetitive/i);
});
check("changing a password still demands the current one, and still rejects re-using it", () => {
  assert.match(passwordProblem({ current: "", next: "a-Fresh-Long-Phrase-7", confirm: "a-Fresh-Long-Phrase-7" })!, /current password/i);
  assert.match(passwordProblem({ current: "same-Password-99", next: "same-Password-99", confirm: "same-Password-99" })!, /different/i);
});

console.log(`\n${passed} checks passed`);
