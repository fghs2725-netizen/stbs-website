import assert from "node:assert/strict";
import { amountInWords } from "../lib/amount-in-words";

let passed = 0;
function check(label: string, actual: string, expected: string) { assert.equal(actual, expected, label); passed++; console.log(`  ok  ${label}`); }

check("zero", amountInWords(0), "Rupees Zero Only");
check("one", amountInWords(1), "Rupees One Only");
check("teens", amountInWords(19), "Rupees Nineteen Only");
check("tens with hyphen", amountInWords(41), "Rupees Forty-One Only");
check("exact tens", amountInWords(90), "Rupees Ninety Only");
check("hundreds", amountInWords(100), "Rupees One Hundred Only");
check("hundreds and units", amountInWords(999), "Rupees Nine Hundred Ninety-Nine Only");
check("thousand", amountInWords(1000), "Rupees One Thousand Only");
check("thousand boundary", amountInWords(99999), "Rupees Ninety-Nine Thousand Nine Hundred Ninety-Nine Only");
check("lakh", amountInWords(100000), "Rupees One Lakh Only");
check("lakh with thousands", amountInWords(253017), "Rupees Two Lakh Fifty-Three Thousand Seventeen Only");
check("skips an empty thousand group", amountInWords(200005), "Rupees Two Lakh Five Only");
check("crore", amountInWords(10000000), "Rupees One Crore Only");
check("crore and below", amountInWords(123456789), "Rupees Twelve Crore Thirty-Four Lakh Fifty-Six Thousand Seven Hundred Eighty-Nine Only");
check("hundreds of crores", amountInWords(1250000000), "Rupees One Hundred Twenty-Five Crore Only");
check("paise only when non-zero", amountInWords(253017.5), "Rupees Two Lakh Fifty-Three Thousand Seventeen and Fifty Paise Only");
check("single paisa", amountInWords(10.01), "Rupees Ten and One Paise Only");
check("float noise does not leak paise", amountInWords(0.1 + 0.2 + 100), "Rupees One Hundred and Thirty Paise Only");
check("negative and NaN clamp to zero", amountInWords(-5), "Rupees Zero Only");
check("NaN", amountInWords(NaN), "Rupees Zero Only");
console.log(`\n${passed} checks passed`);
