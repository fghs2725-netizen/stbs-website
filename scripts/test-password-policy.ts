import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { KNOWN_DEFAULT_PASSWORDS, MAX_PASSWORD_BYTES, MIN_PASSWORD_LENGTH, isKnownDefaultPassword, passwordProblem, type PasswordInput } from "../lib/password-policy";
import { passwordFingerprint } from "../lib/password-fingerprint";

let passed = 0;
function check(label: string, fn: () => void) { fn(); passed++; console.log(`  ok  ${label}`); }

const base = { current: "old-password-1", next: "a-Fresh-Long-Phrase-7", confirm: "a-Fresh-Long-Phrase-7", email: "admin@stbs.com" };
const problem = (over: Partial<PasswordInput>) => passwordProblem({ ...base, ...over });

check("a long, different, matching password with the right current one is accepted", () => {
  assert.equal(problem({}), null);
});
check("every field is required, and the two new passwords must match", () => {
  assert.match(problem({ current: "" })!, /current password/i);
  assert.match(problem({ next: "", confirm: "" })!, /new password/i);
  assert.match(problem({ confirm: "a-Fresh-Long-Phrase-8" })!, /do not match/i);
});
check("the minimum length is enforced exactly at the boundary", () => {
  const nine = "Abcdef!12"; const ten = "Abcdef!123";
  assert.equal(nine.length, MIN_PASSWORD_LENGTH - 1);
  assert.match(problem({ next: nine, confirm: nine })!, /at least/i);
  assert.equal(problem({ next: ten, confirm: ten }), null);
});
check("anything past bcrypt's 72-byte limit is refused, not silently truncated", () => {
  const ok = "abcdefghij".repeat(7) + "kl"; // 72 bytes, varied enough to pass the repetition rule
  const tooLong = ok + "y";
  assert.equal(problem({ next: ok, confirm: ok }), null);
  assert.match(problem({ next: tooLong, confirm: tooLong })!, /too long/i);
  // multi-byte characters count as bytes, not characters
  const emoji = "🔑".repeat(19); // 76 bytes, only 38 UTF-16 units
  assert.match(problem({ next: emoji, confirm: emoji })!, /too long/i);
});
check("bcrypt really does ignore everything after 72 bytes (which is why the limit exists)", () => {
  const a = "z".repeat(72) + "AAAA"; const b = "z".repeat(72) + "BBBB";
  assert.equal(bcrypt.compareSync(b, bcrypt.hashSync(a, 4)), true);
  assert.equal(MAX_PASSWORD_BYTES, 72);
});
check("the new password must differ from the current one", () => {
  assert.match(problem({ current: "same-Password-99", next: "same-Password-99", confirm: "same-Password-99" })!, /different/i);
});
check("the default password from the seed script is refused, in any letter case", () => {
  for (const d of KNOWN_DEFAULT_PASSWORDS) {
    for (const v of [d, d.toLowerCase(), d.toUpperCase()]) assert.match(problem({ next: v, confirm: v })!, /default password/i);
    assert.equal(isKnownDefaultPassword(d), true);
  }
  assert.equal(isKnownDefaultPassword("something-else-entirely"), false);
});
check("repetitive passwords and ones built from the email are refused", () => {
  assert.match(problem({ next: "aaaaaaaaaaaa", confirm: "aaaaaaaaaaaa" })!, /repetitive/i);
  assert.match(problem({ next: "xx-admin-xx-2026", confirm: "xx-admin-xx-2026", email: "admin@stbs.com" })!, /email or username/i);
  assert.equal(problem({ next: "xx-adm-xx-2026-q", confirm: "xx-adm-xx-2026-q", email: "ab@stbs.com" }), null, "a very short local part is not policed");
});
check("a missing email does not break the check", () => {
  assert.equal(problem({ email: null }), null);
  assert.equal(problem({ email: undefined }), null);
});

check("the session fingerprint is stable for one hash and changes when the password changes", () => {
  const h1 = bcrypt.hashSync("first-password-123", 4);
  const h2 = bcrypt.hashSync("second-password-456", 4);
  assert.equal(passwordFingerprint(h1), passwordFingerprint(h1));
  assert.notEqual(passwordFingerprint(h1), passwordFingerprint(h2));
});
check("re-hashing the SAME password still ends old sessions (fresh salt), which is the safe direction", () => {
  assert.notEqual(passwordFingerprint(bcrypt.hashSync("same-password-123", 4)), passwordFingerprint(bcrypt.hashSync("same-password-123", 4)));
});
check("the fingerprint is short, hex, and does not contain the hash it came from", () => {
  const h = bcrypt.hashSync("another-password-1", 4);
  const f = passwordFingerprint(h);
  assert.match(f, /^[0-9a-f]{24}$/);
  assert.ok(!h.includes(f));
});

console.log(`\n${passed} checks passed`);
