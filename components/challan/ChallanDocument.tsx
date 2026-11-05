/**
 * The printed delivery challan.
 *
 * It is drawn with the invoice's stylesheet, so the two documents a client receives look like one
 * family; only the parts an invoice has no use for (transport, receiver's signature) are added in
 * challan.css. Page breaks come from `challanPages`, so this render and the PDF's page count agree.
 */
import { addressLines, challanPages, challanTotals, lineValue, quantityByUnit, type ChallanState } from "@/lib/challan";
import { formatINR } from "@/components/invoice/invoice-model";
import { DocumentImage } from "@/components/invoice/DocumentImage";
import type { InvoiceBusiness } from "@/components/invoice/InvoiceDocument";
import { businessInfo, company } from "@/lib/company";
import { formatIndianPhone } from "@/lib/phone";
import "@/components/invoice/invoice.css";
import "./challan.css";

const DATE_FMT = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" });
const showDate = (v: string) => {
  const d = new Date(`${v}T00:00:00`);
  return Number.isNaN(d.getTime()) ? v : DATE_FMT.format(d);
};

export function ChallanDocument({ challan: c, business }: { challan: ChallanState; business?: InvoiceBusiness }) {
  const pages = challanPages(c);
  const total = pages.length;
  const hasHsn = c.items.some((i) => i.hsn.trim());
  const totals = challanTotals(c);
  const number = c.reference || (c.status === "DRAFT" ? "Draft" : "");
  const site = !c.deliverToSame;
  const businessName = c.gstName ? businessInfo.gstName : company.name;
  let row = 0;

  return (
    <div className="inv-document ch-document" style={{ ["--inv-pages" as string]: total }}>
      {pages.map((items, pageIndex) => {
        const isFirst = pageIndex === 0;
        const isLast = pageIndex === total - 1;
        return (
          <section className="inv-page" key={`ch-page-${pageIndex}`}>
            {c.status === "CANCELLED" && isFirst && <div className="inv-stamp inv-cancelled" aria-hidden="true">Cancelled</div>}

            <div className="inv-top">
              <div className="inv-from">
                <h2>{businessName}</h2>
                <p>
                  {businessInfo.registeredOffice},<br />
                  {["Haryana", businessInfo.documentPinCode].filter(Boolean).join(" ")}<br />
                  {company.phones[0] ? formatIndianPhone(company.phones[0]) : ""}
                  {company.email ? ` · ${company.email}` : ""}
                </p>
                {businessInfo.gstin && <span className="inv-gstin">GSTIN {businessInfo.gstin}</span>}
              </div>
              <div className="inv-head-right">
                <div className="inv-logo">
                  <DocumentImage src={business?.logoUrl} fallback="/stbs-logo-dark.png" alt={businessName} />
                </div>
                {isFirst && (
                  <div className="inv-title">
                    <h1>Delivery Challan</h1>
                    <span className="inv-sub">{c.purpose}</span>
                  </div>
                )}
              </div>
            </div>

            {isFirst ? (
              <>
                <div className="inv-parties">
                  <div className="inv-who">
                    <div className="inv-party">
                      <span className="inv-label">Consignee</span>
                      <b>{c.client.name || "—"}</b>
                      <p>
                        {c.client.contactPerson && <>Attn: {c.client.contactPerson}<br /></>}
                        {addressLines(c.client).map((line, i) => <span key={`c${i}`}>{line}<br /></span>)}
                        {c.client.phone}
                      </p>
                      {c.client.gstin && <span className="inv-gstin">GSTIN {c.client.gstin}</span>}
                    </div>
                    {site && (
                      <div className="inv-party">
                        <span className="inv-label">Deliver To / Site</span>
                        <b>{c.deliverTo.name || c.client.name}</b>
                        <p>
                          {addressLines(c.deliverTo).map((line, i) => <span key={`d${i}`}>{line}<br /></span>)}
                          {c.deliverTo.phone && <>Site contact: {c.deliverTo.phone}</>}
                        </p>
                      </div>
                    )}
                  </div>
                  <dl className="inv-facts">
                    {number && <div><dt>Challan #</dt><dd>{number}</dd></div>}
                    <div><dt>Date</dt><dd>{showDate(c.date)}</dd></div>
                    {c.invoiceRef && <div><dt>Against invoice</dt><dd>{c.invoiceRef}</dd></div>}
                    {c.quotationRef && <div><dt>Quotation</dt><dd>{c.quotationRef}</dd></div>}
                  </dl>
                </div>

                {(c.vehicleNumber || c.driverName || c.driverPhone || c.ewayBill || c.transportMode) && (
                  <dl className="ch-transport">
                    {c.transportMode && <div><dt>Mode</dt><dd>{c.transportMode}</dd></div>}
                    {c.vehicleNumber && <div><dt>Vehicle no.</dt><dd>{c.vehicleNumber.toUpperCase()}</dd></div>}
                    {c.driverName && <div><dt>Driver</dt><dd>{c.driverName}</dd></div>}
                    {c.driverPhone && <div><dt>Driver phone</dt><dd>{formatIndianPhone(c.driverPhone)}</dd></div>}
                    {c.ewayBill && <div><dt>E-way bill</dt><dd>{c.ewayBill}</dd></div>}
                  </dl>
                )}
              </>
            ) : (
              <p className="inv-continued">Delivery challan {number} · continued from page {pageIndex} of {total}</p>
            )}

            {(items.length > 0 || isFirst) && (
              <table className="inv-table ch-table">
                <colgroup>
                  <col style={{ width: "6%" }} />
                  <col />
                  {hasHsn && <col style={{ width: "12%" }} />}
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "9%" }} />
                  {c.showRates && <col style={{ width: "12%" }} />}
                  {c.showRates && <col style={{ width: "14%" }} />}
                </colgroup>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Description of goods</th>
                    {hasHsn && <th>HSN</th>}
                    <th className="inv-num">Qty</th>
                    <th>Unit</th>
                    {c.showRates && <th className="inv-num">Rate</th>}
                    {c.showRates && <th className="inv-num">Value</th>}
                  </tr>
                </thead>
                <tbody>
                  {items.length ? items.map((item) => {
                    row += 1;
                    return (
                      <tr key={item.id}>
                        <td>{row}</td>
                        <td>
                          <span className="inv-item-name">{item.description}</span>
                          {item.details.trim() && <span className="inv-item-details">{item.details.trim()}</span>}
                        </td>
                        {hasHsn && <td>{item.hsn}</td>}
                        <td className="inv-num">{item.quantity}</td>
                        <td>{item.unit}</td>
                        {c.showRates && <td className="inv-num">{formatINR(item.rate)}</td>}
                        {c.showRates && <td className="inv-num">{formatINR(lineValue(item))}</td>}
                      </tr>
                    );
                  }) : (
                    <tr><td colSpan={5 + (hasHsn ? 1 : 0) + (c.showRates ? 2 : 0)} className="ch-empty">No items yet</td></tr>
                  )}
                </tbody>
              </table>
            )}

            {isLast && (
              <>
                <div className="ch-sum">
                  <div><span>Total quantity</span><b>{quantityByUnit(c) || "—"}</b></div>
                  {c.showRates && <div><span>Value of goods</span><b>{formatINR(totals.value)}</b></div>}
                </div>

                {c.remarks.trim() && (
                  <div className="ch-remarks">
                    <h3>Remarks</h3>
                    <p>{c.remarks.trim()}</p>
                  </div>
                )}
                {c.status === "CANCELLED" && c.cancelledReason && (
                  <p className="ch-cancelled-note">Cancelled: {c.cancelledReason}</p>
                )}

                <div className="ch-signs">
                  <div className="ch-receiver">
                    <p className="ch-declare">Received the above goods in good condition.</p>
                    <div className="ch-signspace" />
                    <div className="inv-line">Receiver&apos;s name, signature &amp; date</div>
                  </div>
                  <div className="inv-sign">
                    <span className="inv-for">For {businessName}</span>
                    <div className="inv-signbox">
                      <DocumentImage src={business?.signatureUrl} fallback="/invoice/signature.png" alt="" />
                    </div>
                    <div className="inv-line">Authorised signatory</div>
                  </div>
                </div>
              </>
            )}

            <footer>
              <span>{businessName}{businessInfo.gstin ? ` · GSTIN ${businessInfo.gstin}` : ""}</span>
              <span>Page {pageIndex + 1} of {total}</span>
            </footer>
          </section>
        );
      })}
    </div>
  );
}
