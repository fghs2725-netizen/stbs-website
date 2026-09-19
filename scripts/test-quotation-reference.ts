import assert from "node:assert/strict";
import { financialYearLabel, financialYearStart, formatQuotationReference } from "../lib/quotation-reference";

let passed = 0;
function check(label: string, fn: () => void) { fn(); passed++; console.log(`  ok  ${label}`); }

check("the financial year starts on 1 April (IST)", () => {
  assert.equal(financialYearStart(new Date("2026-04-01T10:00:00+05:30")), 2026);
  assert.equal(financialYearStart(new Date("2026-03-31T10:00:00+05:30")), 2025);
});
check("months after April belong to the year they fall in; January to March belong to the year before", () => {
  assert.equal(financialYearStart(new Date("2026-09-19T10:00:00+05:30")), 2026);
  assert.equal(financialYearStart(new Date("2026-12-31T10:00:00+05:30")), 2026);
  assert.equal(financialYearStart(new Date("2027-01-01T10:00:00+05:30")), 2026);
  assert.equal(financialYearStart(new Date("2027-03-31T23:59:00+05:30")), 2026);
});
check("the boundary is judged in IST, not UTC", () => {
  // 31 Mar 19:00 UTC is already 1 April 00:30 in India.
  assert.equal(financialYearStart(new Date("2026-03-31T19:00:00Z")), 2026);
  assert.equal(financialYearStart(new Date("2026-03-31T18:00:00Z")), 2025); // 23:30 IST on 31 March
});
check("labels are two-digit second years, including across a century", () => {
  assert.equal(financialYearLabel(2026), "2026-27");
  assert.equal(financialYearLabel(2009), "2009-10");
  assert.equal(financialYearLabel(2099), "2099-00");
});
check("references are zero-padded to four digits and keep growing past 9999", () => {
  assert.equal(formatQuotationReference(2026, 142), "STBS/2026-27/0142");
  assert.equal(formatQuotationReference(2026, 1), "STBS/2026-27/0001");
  assert.equal(formatQuotationReference(2026, 12345), "STBS/2026-27/12345");
});
check("a new-scheme reference can never equal an old-scheme one (both must stay unique)", () => {
  assert.notEqual(formatQuotationReference(2026, 12), "STBS/2026/012");
});

console.log(`\n${passed} checks passed`);
