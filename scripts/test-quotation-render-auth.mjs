process.env.AUTH_SECRET = "stbs-render-test-secret";
const { createQuotationRenderToken, verifyQuotationRenderToken } = await import("../lib/quotation-render-auth.ts");
const now = Date.UTC(2026, 0, 1) * 1;
const token = createQuotationRenderToken("quotation-1", now);
const checks = {
  valid: verifyQuotationRenderToken(token, "quotation-1", now),
  expired: !verifyQuotationRenderToken(token, "quotation-1", now + 121_000),
  modified: !verifyQuotationRenderToken(`${token}x`, "quotation-1", now),
  wrongId: !verifyQuotationRenderToken(token, "quotation-2", now),
  missing: !verifyQuotationRenderToken(undefined, "quotation-1", now),
};
if (!Object.values(checks).every(Boolean)) throw new Error(JSON.stringify(checks));
console.log(JSON.stringify(checks));
