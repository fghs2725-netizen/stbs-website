import { describeBalance, formatRupees } from "@/lib/worker-ledger";

/** "To pay ₹4,500" (the business owes him), "Advance ₹2,000" (he has taken more), or "Settled". */
export function balanceText(balance: number): string {
  const b = describeBalance(balance);
  return b.kind === "TO_PAY" ? `To pay ${formatRupees(b.amount)}` : b.kind === "ADVANCE" ? `Advance ${formatRupees(b.amount)}` : "Settled";
}

export function BalanceLabel({ balance, size = "sm" }: { balance: number; size?: "sm" | "lg" }) {
  const b = describeBalance(balance);
  const tone = b.kind === "TO_PAY" ? "a-pill-warn" : b.kind === "ADVANCE" ? "a-pill-brand" : "a-pill-neutral";
  return <span className={`a-pill ${tone} a-num ${size === "lg" ? "text-[0.9375rem]" : ""}`}>{balanceText(balance)}</span>;
}
