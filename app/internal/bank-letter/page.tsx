import { notFound } from "next/navigation";
import { company, businessInfo } from "@/lib/company";
import { verifyQuotationRenderToken } from "@/lib/quotation-render-auth";
import { bankLetterBinding, decodeBankLetter } from "@/lib/company-documents/bank-letter";
import { LETTERHEAD_CSS, LetterheadPage } from "@/components/letterhead/Letterhead";

export const dynamic = "force-dynamic";

const CSS = `*{box-sizing:border-box}html,body{margin:0;padding:0;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}@page{size:A4 portrait;margin:0}
  #bank-letter-document { font-family: Inter, Arial, sans-serif; color: #1d1d1f; font-size: 11pt; line-height: 1.55; }
  #bank-letter-document .bl-date { text-align: right; margin: 4px 0 18px; }
  #bank-letter-document h1 { font-size: 14pt; margin: 18px 0 6px; text-align: center; letter-spacing: .03em; text-transform: uppercase; }
  #bank-letter-document table.bl { width: 100%; border-collapse: collapse; margin: 14px 0 18px; }
  #bank-letter-document table.bl td { border: 1px solid #d9d9de; padding: 8px 12px; }
  #bank-letter-document table.bl td:first-child { width: 36%; background: #f5f5f7; color: #4a4a4f; font-weight: 600; }
  #bank-letter-document .bl-sign { margin-top: 36px; break-inside: avoid; }
  #bank-letter-document .bl-sign img { height: 70px; width: auto; display: block; margin: 6px 0; mix-blend-mode: multiply; }
`;

// Reached only by the PDF renderer, with a short-lived token bound to exactly these details.
export default async function BankLetterRender({ searchParams }: { searchParams: Promise<{ d?: string; token?: string }> }) {
  const { d, token } = await searchParams;
  if (!d || !verifyQuotationRenderToken(token, bankLetterBinding(d))) notFound();
  const b = decodeBankLetter(d);
  if (!b) notFound();
  const date = new Date(`${b.date}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
  const rows: [string, string][] = [
    ["Account holder name", b.accountName], ["Bank name", b.bankName], ["Branch", b.branch], ["Account number", b.accountNumber],
    ["Account type", b.accountType], ["IFSC code", b.ifsc], ["MICR code", b.micr], ["SWIFT code", b.swift], ["UPI ID", b.upi],
    ["PAN", b.pan], ["GSTIN", b.includeGstin ? businessInfo.gstin : ""],
  ];
  return (
    <div id="bank-letter-document" data-pdf-ready="true">
      <style dangerouslySetInnerHTML={{ __html: LETTERHEAD_CSS + CSS }} />
      <LetterheadPage>
      <div className="bl-date">Date: {date}</div>
      <p>To Whom It May Concern,</p>
      <h1>Bank account details</h1>
      <p>Please find below the bank account details of <b>{company.name}</b> for making payments and remittances.</p>
      <table className="bl"><tbody>
        {rows.filter(([, v]) => v).map(([k, v]) => <tr key={k}><td>{k}</td><td>{v}</td></tr>)}
      </tbody></table>
      <p>Kindly use these details for all payments. Please contact us on {company.phones[0]} to confirm before acting on any change to payment details.</p>
      <div className="bl-sign">
        <p>Yours faithfully,<br /><b>For {company.name}</b></p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/invoice/signature.png" alt="Signature" />
        <b>{company.managingDirector}</b><br />Managing Director
      </div>
      </LetterheadPage>
    </div>
  );
}
