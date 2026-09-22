/**
 * The printed invoice.
 *
 * Every optional part is a switch, and nothing here reads one switch to decide another: in particular
 * the HSN column and GST are wholly independent, which is what the owner asked for.
 *
 * All figures come from `calcInvoiceTotals`, and the page breaks from `paginateInvoiceItems`, so the
 * editor preview, this render and the PDF cannot disagree.
 */
import {
  calcInvoiceTotals, formatINR, getValidItems, lineAmount, overdueBy,
  type InvoiceState, type InvoiceSettings,
} from "./invoice-model";
import { invoicePages } from "./invoice-pagination";
import { resolveTemplate, type InvoiceTemplateRef } from "./template/invoice-template-model";
import { placeOfSupply } from "@/lib/india-gst";
import { formatInvoiceNumber } from "@/lib/invoice-numbering";
import { cleanDetails } from "../quotation/item-text";
import { amountInWords } from "@/lib/amount-in-words";
import { businessInfo, company } from "@/lib/company";
import { formatIndianPhone } from "@/lib/phone";
import "./invoice.css";

/** The seller's own details, and the values the owner fills in under Settings. */
export type InvoiceBusiness = {
  bank?: { accountName?: string; accountNumber?: string; ifsc?: string; bank?: string; upi?: string };
  signatureUrl?: string;
  stampUrl?: string;
  upiQrUrl?: string;
  logoUrl?: string;
};

export type InvoiceDocumentProps = {
  invoice: InvoiceState;
  settings: InvoiceSettings;
  template?: InvoiceTemplateRef | null;
  templateSnapshot?: unknown;
  business?: InvoiceBusiness;
  /** True in the editor, where an empty invoice should still show its table. */
  isEditorPreview?: boolean;
};

const DATE_FMT = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" });
function showDate(value?: string): string {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : DATE_FMT.format(d);
}

const addressLines = (p: {
  addressLine1?: string; addressLine2?: string; city?: string; state?: string; pinCode?: string;
}): string[] => {
  const where = [p.city, p.state].filter(Boolean).join(", ");
  return [p.addressLine1, p.addressLine2, [where, p.pinCode].filter(Boolean).join(" ")].filter(Boolean) as string[];
};

export function InvoiceDocument({ invoice, settings, template, templateSnapshot, business, isEditorPreview }: InvoiceDocumentProps) {
  const t = resolveTemplate(templateSnapshot, template).content;
  const { columns: col, blocks } = settings;
  const totals = calcInvoiceTotals(invoice, settings);
  const items = getValidItems(invoice.items);
  const hasItems = items.length > 0;

  const showDiscount = Boolean(invoice.discountType) && totals.discount > 0;
  const showAdvance = blocks.advanceBalance && totals.paid > 0;
  const showRoundOff = blocks.roundOff && totals.roundOff !== 0;

  const paged = invoicePages(invoice, settings);
  const totalPages = paged.total;

  const supply = placeOfSupply(invoice.client.state, invoice.client.gstin);
  const overdue = overdueBy(invoice);
  const stamp =
    invoice.status === "CANCELLED" ? { label: "Cancelled", cls: "inv-cancelled" }
    : invoice.status === "PAID" ? { label: "Paid", cls: "inv-paid" }
    : overdue > 0 ? { label: "Overdue", cls: "inv-overdue" }
    : null;

  const ship = invoice.shipTo;
  const showShipTo = blocks.shipTo && Boolean(ship) && !ship?.sameAsBilling && Boolean(ship?.companyName || ship?.addressLine1);

  const gstLabel = (rate: number) => `${Number(rate.toFixed(2))}%`;
  const number = invoice.number ? formatInvoiceNumber(invoice.number) : "Draft";

  return (
    <div className="inv-document" style={{ ["--inv-pages" as string]: totalPages }}>
      {paged.pages.map((rows, pageIndex) => {
        const isFirst = pageIndex === 0;
        const isLast = pageIndex === paged.pages.length - 1;
        return (
          <section className="inv-page" key={`inv-page-${pageIndex}`}>
            {blocks.statusStamp && stamp && isFirst && (
              <div className={`inv-stamp ${stamp.cls}`} aria-hidden="true">{stamp.label}</div>
            )}

            <div className="inv-top">
              <div className="inv-from">
                <h2>{company.name}</h2>
                <p>
                  {businessInfo.registeredOffice},<br />
                  {["Haryana", businessInfo.pinCode].filter(Boolean).join(" ")}<br />
                  {company.phones[0] ? formatIndianPhone(company.phones[0]) : ""}
                  {company.email ? ` · ${company.email}` : ""}
                </p>
                {businessInfo.gstin && <span className="inv-gstin">GSTIN {businessInfo.gstin}</span>}
              </div>
              {/* The title rides beside the masthead rather than on a band of its own: that band cost
                  a page nearly fifty points of height that the item table wanted. */}
              <div className="inv-head-right">
                <div className="inv-logo">
                  <img src={business?.logoUrl ?? "/stbs-logo-dark.png"} alt={company.name} />
                </div>
                {isFirst && (
                  <div className="inv-title">
                    <h1>{t.title}</h1>
                    {blocks.originalMarker && t.copyMarker && <span className="inv-sub">{t.copyMarker}</span>}
                  </div>
                )}
              </div>
            </div>

            {isFirst ? (
              <>
                <div className="inv-parties">
                  <div className="inv-who">
                    <div className="inv-party">
                      <span className="inv-label">Bill To</span>
                      <b>{invoice.client.companyName || "—"}</b>
                      <p>
                        {invoice.client.contactPerson && <>Attn: {invoice.client.contactPerson}<br /></>}
                        {addressLines(invoice.client).map((line, i) => <span key={`b${i}`}>{line}<br /></span>)}
                        {invoice.client.phone}
                      </p>
                      {invoice.client.gstin && <span className="inv-gstin">GSTIN {invoice.client.gstin}</span>}
                    </div>

                    {showShipTo && (
                      <div className="inv-party">
                        <span className="inv-label">Ship To / Site</span>
                        <b>{ship?.companyName || invoice.client.companyName}</b>
                        <p>
                          {addressLines(ship ?? {}).map((line, i) => <span key={`s${i}`}>{line}<br /></span>)}
                          {ship?.phone && <>Site contact: {ship.phone}</>}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="inv-facts">
                    <div><dt>Invoice #</dt><dd>{number}</dd></div>
                    <div><dt>Invoice date</dt><dd>{showDate(invoice.date)}</dd></div>
                    {blocks.dueDate && invoice.dueDate && <div><dt>Due date</dt><dd>{showDate(invoice.dueDate)}</dd></div>}
                    {blocks.placeOfSupply && supply && <div><dt>Place of supply</dt><dd>{supply}</dd></div>}
                    {invoice.purchaseOrder && <div><dt>Your order</dt><dd>{invoice.purchaseOrder}</dd></div>}
                    {blocks.quotationRef && invoice.quotationReference && (
                      <div><dt>Quotation</dt><dd>{invoice.quotationReference}</dd></div>
                    )}
                    {blocks.reverseCharge && (
                      <div className="inv-note"><dt>Reverse charge</dt><dd>{invoice.reverseCharge ? "Yes" : "No"}</dd></div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <p className="inv-continued">
                {t.title} {invoice.number ? number : ""} · continued from page {pageIndex} of {totalPages}
              </p>
            )}

            {/* A last page carrying only the totals has no rows, and prints no heading above them. */}
            {(rows.length > 0 || isFirst) && (
            <table className="inv-table">
              <thead>
                <tr>
                  {col.srNo && <th className="inv-c-sr">#</th>}
                  <th>Description</th>
                  {col.hsn && <th className="inv-c-hsn">HSN/SAC</th>}
                  <th className="inv-num inv-c-qty">Qty</th>
                  {col.unit && <th className="inv-c-unit">Unit</th>}
                  {col.lineDiscount && <th className="inv-num inv-c-disc">Disc.</th>}
                  {col.lineGst && <th className="inv-num inv-c-gst">GST</th>}
                  <th className="inv-num inv-c-rate">Rate</th>
                  <th className="inv-num inv-c-amt">Amount</th>
                </tr>
              </thead>
              <tbody>
                {rows.length ? rows.map((item, n) => {
                  const details = col.details ? cleanDetails(item.details) : "";
                  return (
                    <tr key={item.id}>
                      {col.srNo && <td>{paged.starts[pageIndex] + n + 1}</td>}
                      <td>
                        {details
                          ? <><span className="inv-item-name">{item.description}</span><span className="inv-item-details">{details}</span></>
                          : item.description}
                      </td>
                      {col.hsn && <td>{item.hsn || ""}</td>}
                      <td className="inv-num">{item.quantity}</td>
                      {col.unit && <td>{item.unit}</td>}
                      {col.lineDiscount && <td className="inv-num">{item.discountPercent ? `${item.discountPercent}%` : ""}</td>}
                      {col.lineGst && <td className="inv-num">{gstLabel(item.gstRate ?? invoice.gstRate)}</td>}
                      <td className="inv-num">{formatINR(Number(item.rate)).replace("₹", "")}</td>
                      <td className="inv-num">{formatINR(lineAmount(item, col.lineDiscount))}</td>
                    </tr>
                  );
                }) : (
                  isEditorPreview && isFirst ? (
                    <tr><td colSpan={12} style={{ textAlign: "center", color: "#a6b0b8", fontStyle: "italic", padding: "20px 6px" }}>No items added</td></tr>
                  ) : null
                )}
              </tbody>
            </table>
            )}

            {isLast && hasItems && (
              <>
                <div className="inv-sum">
                  <div className="inv-box">
                    <div><span>Subtotal</span><span>{formatINR(totals.subtotal)}</span></div>
                    {showDiscount && (
                      <div>
                        <span>Discount{invoice.discountType === "PERCENT" ? ` (${Number(invoice.discountValue)}%)` : ""}</span>
                        <span>−{formatINR(totals.discount)}</span>
                      </div>
                    )}
                    {showDiscount && <div><span>Taxable value</span><span>{formatINR(totals.taxable)}</span></div>}
                    {invoice.gstEnabled && invoice.gstMode === "IGST" && (
                      <div><span>IGST{col.lineGst ? "" : ` (${gstLabel(invoice.gstRate)})`}</span><span>{formatINR(totals.igst)}</span></div>
                    )}
                    {invoice.gstEnabled && invoice.gstMode !== "IGST" && (
                      <>
                        <div><span>CGST{col.lineGst ? "" : ` (${gstLabel(invoice.gstRate / 2)})`}</span><span>{formatINR(totals.cgst)}</span></div>
                        <div><span>SGST{col.lineGst ? "" : ` (${gstLabel(invoice.gstRate / 2)})`}</span><span>{formatINR(totals.sgst)}</span></div>
                      </>
                    )}
                    {showRoundOff && (
                      <div><span>Round off</span><span>{totals.roundOff < 0 ? "−" : ""}{formatINR(Math.abs(totals.roundOff))}</span></div>
                    )}
                    <div className="inv-total"><span>Total (INR)</span><span>{formatINR(totals.grandTotal)}</span></div>
                    {showAdvance && (
                      <>
                        <div className="inv-paid"><span>Advance received</span><span>−{formatINR(totals.paid)}</span></div>
                        <div className="inv-balance"><span>Balance due</span><span>{formatINR(totals.balance)}</span></div>
                      </>
                    )}
                  </div>
                </div>

                {blocks.amountWords && (
                  <p className="inv-words">
                    <b>In words:</b> {amountInWords(showAdvance ? totals.balance : totals.grandTotal)}
                  </p>
                )}
              </>
            )}

            {isLast && (
              <div className="inv-foot">
                <div className="inv-left">
                  {blocks.bankDetails && business?.bank && (
                    <div className="inv-pay">
                      <h3>{t.paymentHeading}</h3>
                      <dl>
                        {business.bank.accountName && <><dt>Account name</dt><dd>{business.bank.accountName}</dd></>}
                        {business.bank.accountNumber && <><dt>Account no.</dt><dd>{business.bank.accountNumber}</dd></>}
                        {business.bank.ifsc && <><dt>IFSC</dt><dd>{business.bank.ifsc}</dd></>}
                        {business.bank.bank && <><dt>Bank / branch</dt><dd>{business.bank.bank}</dd></>}
                        {business.bank.upi && <><dt>UPI</dt><dd>{business.bank.upi}</dd></>}
                      </dl>
                      {t.paymentNote && <p>{t.paymentNote}</p>}
                      {blocks.upiQr && business.upiQrUrl && <img className="inv-qr" src={business.upiQrUrl} alt="UPI QR code" />}
                    </div>
                  )}

                  <div className="inv-terms">
                  {blocks.terms && t.terms.length > 0 && (
                    <>
                      <h3>{t.termsHeading}</h3>
                      {t.terms.map((line, i) => <p key={`term-${i}`}>{line}</p>)}
                    </>
                  )}

                  {blocks.declaration && t.declaration && (
                    <>
                      <h3>{t.declarationHeading}</h3>
                      <p>{t.declaration}</p>
                    </>
                  )}
                  </div>
                </div>

                {blocks.signature && (
                  <div className="inv-sign">
                    <span className="inv-for">{t.signatureFor}</span>
                    <div className="inv-signbox">
                      {/* Settings can override it with an upload; the owner's own signature is the default. */}
                      <img src={business?.signatureUrl ?? "/invoice/signature.png"} alt="" />
                    </div>
                    <div className="inv-line">{settings.signatureName || t.signatureLine}</div>
                  </div>
                )}
              </div>
            )}

            <footer>
              <span>{company.name}{businessInfo.gstin ? ` · GSTIN ${businessInfo.gstin}` : ""}</span>
              <span>Page {pageIndex + 1} of {totalPages}</span>
            </footer>
          </section>
        );
      })}
    </div>
  );
}
