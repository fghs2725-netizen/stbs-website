import { quotation as fixed } from "./quotation-data";
import { serviceLabel, type QuotationState, getValidItems, calcAmount, calcTotals, formatINR, hasDiscount } from "./quotation-model";
import { pricePagesFor, FIXED_PAGES } from "./pagination";
import { amountInWords } from "@/lib/amount-in-words";
import { businessInfo } from "@/lib/company";
import { logoFor, type ClientLogo } from "@/lib/website/client-logos";
import "./quotation.css";
import "./quotation-refinement.css";
import "./responsive-print.css";

/* ---------- Side panel ---------- */
function SidePanel() {
  return (
    <aside className="q-side">
      <div className="q-depth">STBS<br /><span>ENGINEERING</span></div>
      <div className="q-strata"><i /><i /><i /><i /><i /></div>
      <div className="q-casing"><span className="q-slot s1" /><span className="q-slot s2" /><span className="q-slot s3" /><span className="q-slot s4" /></div>
      <div className="q-water" />
      <div className="q-scale"><span>0m</span><span>50m</span><span>100m</span><span>150m</span></div>
    </aside>
  );
}

/* ---------- Watermark ---------- */
function Watermark() {
  return (
    <div className="q-watermark" aria-hidden="true">
      <div className="wm-ground wm-one" />
      <div className="wm-ground wm-two" />
      <div className="wm-ground wm-three" />
      <div className="pump-ring" />
      <div className="pump-body" />
      <div className="pump-pipe" />
      <div className="pump-flow" />
    </div>
  );
}

/* ---------- Page shell ---------- */
const pad2 = (n: number) => String(n).padStart(2, "0");

function Page({ n, total, kicker, title, subtitle, pricePage, children }: {
  n: number; total: number; kicker: string; title: string; subtitle?: string; pricePage?: boolean; children: React.ReactNode;
}) {
  return (
    <section className="q-page" data-price-page={pricePage ? "true" : undefined}>
      <img className="q-banner" src="/quotation/banner/stbs-premium-banner.png" alt="Saini Tubewell Boring Service" />
      <SidePanel />
      <Watermark />
      <div className="q-main">
        <div className="q-kicker">{kicker} <span>/{String(n).padStart(2, "0")}</span></div>
        {subtitle && <div className="q-service-heading">{subtitle}</div>}
        <h1>{title}</h1>
        {children}
      </div>
      <footer>
        <span>SAINI TUBEWELL BORING SERVICE</span>
        <span>{pad2(n)} / {pad2(total)}</span>
      </footer>
    </section>
  );
}

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="q-section"><h2>{title}</h2>{children}</div>
);

/* ==========================================================================
   QuotationDocument
   Contains ONLY the four A4 pages. No editor UI. Suitable for PDF rendering.
   ========================================================================== */
export function QuotationDocument({ quotation, isEditorPreview = false }: {
  quotation: QuotationState;
  /** When true, shows dev-only hints like "No items added". Must be false for PDF. */
  isEditorPreview?: boolean;
}) {
  const service = serviceLabel(quotation);
  const validItems = getValidItems(quotation.items);
  const hasItems = validItems.length > 0;
  const totals = calcTotals(quotation);
  const pricePages = pricePagesFor(quotation);
  const totalPages = FIXED_PAGES + pricePages.pages.length;
  const showDiscount = hasDiscount(quotation, totals);
  const gstRate = Number(quotation.gstRate ?? 0);
  // Terms are the owner's fixed wording; the "Taxes" line is only hidden when the totals state the tax explicitly.
  // Clients with a staged logo become a logo wall; the rest keep the existing text list. Nothing is dropped.
  const clientLogos = fixed.clients.map((name: string) => logoFor(name)).filter(Boolean) as ClientLogo[];
  const clientNames = fixed.clients.filter((name: string) => !logoFor(name));
  const terms = fixed.terms.filter(([t]: readonly string[]) => !(quotation.gstEnabled && t === "Taxes"));

  // Build client lines for display
  const clientLines = [
    { key: "companyName", value: quotation.client.companyName },
    { key: "contactPerson", value: quotation.client.contactPerson },
    { key: "addressLine1", value: quotation.client.addressLine1 },
    { key: "addressLine2", value: quotation.client.addressLine2 },
    { key: "location", value: [quotation.client.city, quotation.client.state, quotation.client.pinCode].filter(Boolean).join(" – ") },
    { key: "phone", value: quotation.client.phone },
    { key: "email", value: quotation.client.email },
    { key: "gstin", value: quotation.client.gstin ? `GSTIN: ${quotation.client.gstin}` : "" },
  ].filter(line => Boolean(line.value));
/*
    quotation.client.companyName,
    quotation.client.contactPerson,
    quotation.client.addressLine1,
    quotation.client.addressLine2,
    [quotation.client.city, quotation.client.state, quotation.client.pinCode].filter(Boolean).join(" – "),
    quotation.client.phone,
    quotation.client.email,
  ].filter(Boolean);
*/

  const subject = quotation.subject || `Price Offer for ${service}`;

  return (
    <div className="q-document" style={totalPages === 4 ? undefined : ({ "--q-pages": totalPages } as React.CSSProperties)}>
      {/* ──── PAGE 1: Cover Letter ──── */}
      <Page n={1} total={totalPages} kicker="QUOTATION / COVER LETTER" title="Commercial Quotation" subtitle={service.toUpperCase()}>
        <div className="q-supporting">{service.toUpperCase()}</div>
        <div className="q-meta">
          <div><label>REFERENCE</label><strong>{quotation.quotationReference}</strong></div>
          <div><label>DATE</label><strong>{quotation.quotationDate}</strong></div>
          <div><label>VALIDITY</label><strong>{quotation.validity}</strong></div>
        </div>
        <div className="q-duo">
          <div>
            <label>PREPARED FOR</label>
            <strong>{clientLines.map((line) => <span key={line.key}>{line.value}</span>)}</strong>
          </div>
          <div>
            <label>PREPARED BY</label>
            <strong>
              SAINI TUBEWELL BORING SERVICE
              <span>Rajesh Saini · Managing Director</span>
              <span>9812003001 / 7988024114</span>
              <span>stbs2025@gmail.com</span>
              {quotation.gstEnabled && businessInfo.gstin && <span>GSTIN: {businessInfo.gstin}</span>}
            </strong>
          </div>
        </div>
        <Section title="Subject"><p className="q-subject">{subject}</p></Section>
        <div className="q-letter">
          <p>Dear Sir,</p>
          <p>We are pleased to have the opportunity to serve you and thank you for inviting us to submit our quotation for the above-mentioned work.</p>
          <p>The following annexures are attached for your reference.</p>
          <ul>
            <li>Annexure-I · Company Profile</li>
            <li>Annexure-II · Terms and Conditions</li>
            <li>Annexure-III · Price Offer for Subject Job</li>
          </ul>
          <p>We trust that the above proposal meets your requirements. We thank you for the opportunity and assure you of our best services at all times.</p>
          <p className="closing">Yours Truly,<br /><b>(For SAINI TUBEWELL BORING SERVICE)</b></p>
          <p className="signature">Rajesh Saini<br /><span>Managing Director</span></p>
        </div>
      </Page>

      {/* ──── PAGE 2: Company Profile ──── */}
      <Page n={2} total={totalPages} kicker="ANNEXURE I" title="Company Profile">
        <Section title="About Us"><p>{fixed.about}</p></Section>
        <div className="profile-grid">
          <Section title="Mission"><p>{fixed.mission}</p></Section>
          <Section title="Vision"><p>{fixed.vision}</p></Section>
        </div>
        <Section title="Core Capabilities / Distinctive Qualities">
          <ul className="capabilities">{fixed.capabilities.map((x: string, i: number) => <li key={`capability-${i}`}>{x}</li>)}</ul>
        </Section>
        <Section title="Our Esteemed Clients">
          {clientLogos.length > 0 && (
            <div className="client-logos">
              {clientLogos.map((logo) => (
                <div className="client-logo" key={logo.name}>
                  <img src={logo.logoUrl} alt={logo.altText} />
                </div>
              ))}
            </div>
          )}
          <div className="clients">{clientNames.map((x: string, i: number) => <span key={`client-${i}`}>{x}</span>)}</div>
        </Section>
      </Page>

      {/* ──── PAGE 3: Terms & Conditions ──── */}
      <Page n={3} total={totalPages} kicker="ANNEXURE II" title="Terms &amp; Conditions">
        <div className="terms">
          {terms.map(([t, d]: readonly string[], i: number) => (
            <article key={`term-${i}-${t}`}>
              <b>{String(i + 1).padStart(2, "0")}</b>
              <div><h3>{t}</h3><p>{d}</p></div>
            </article>
          ))}
        </div>
        <div className="glance">
          <div className="glance-head"><span>AT A GLANCE</span><small>STBS / FIELD RECORD</small></div>
          <div className="glance-grid">
            <div><b>34+</b><span>Years Experience</span></div>
            <div><b>500+</b><span>Projects Delivered</span></div>
            <div><b>100%</b><span>ISI Certified</span></div>
            <div><b>24/7</b><span>Site Support</span></div>
          </div>
        </div>
      </Page>

      {/* ──── PAGE 4+: Price Offer (flows onto as many pages as the items need) ──── */}
      {pricePages.pages.map((rows, pi) => {
        const isFirst = pi === 0;
        const isLast = pi === pricePages.pages.length - 1;
        return (
          <Page key={`price-${pi}`} n={FIXED_PAGES + 1 + pi} total={totalPages} pricePage kicker="ANNEXURE III" title={isFirst ? "Price Offer" : "Price Offer (Continued)"}>
            <div className="q-supporting">{service}</div>
            <div className="price-intro">{isFirst ? `Commercial offer for the subject job · Reference ${quotation.quotationReference}` : `Continued from page ${pad2(FIXED_PAGES + pi)} · Reference ${quotation.quotationReference}`}</div>
            <table>
              <thead>
                <tr>
                  <th>SR. NO.</th>
                  <th>DESCRIPTION</th>
                  <th>UNIT</th>
                  <th>QTY</th>
                  <th>RATE</th>
                  <th>AMOUNT</th>
                </tr>
              </thead>
              <tbody>
                {rows.length ? (
                  rows.map((item, n) => (
                    <tr key={item.id}>
                      <td>{pad2(pricePages.starts[pi] + n + 1)}</td>
                      <td>{item.description}</td>
                      <td>{item.unit}</td>
                      <td>{item.quantity}</td>
                      <td>{formatINR(item.rate)}</td>
                      <td>{formatINR(calcAmount(item.quantity, item.rate))}</td>
                    </tr>
                  ))
                ) : (
                  isEditorPreview && isFirst ? (
                    <tr className="no-items-row">
                      <td colSpan={6} style={{ textAlign: "center", color: "#aaa", fontStyle: "italic", padding: "20px 7px" }}>
                        No items added
                      </td>
                    </tr>
                  ) : null
                )}
              </tbody>
              {hasItems && isLast && (
                <tfoot>
                  {(showDiscount || quotation.gstEnabled) && (
                    <tr className="q-sub"><td colSpan={5}>SUBTOTAL</td><td>{formatINR(totals.subtotal)}</td></tr>
                  )}
                  {showDiscount && (
                    <tr className="q-sub"><td colSpan={5}>{quotation.discountType === "PERCENT" ? `DISCOUNT (${Number(quotation.discountValue)}%)` : "DISCOUNT"}</td><td>−{formatINR(totals.discount)}</td></tr>
                  )}
                  {showDiscount && quotation.gstEnabled && (
                    <tr className="q-sub"><td colSpan={5}>TAXABLE VALUE</td><td>{formatINR(totals.taxable)}</td></tr>
                  )}
                  {quotation.gstEnabled && quotation.gstMode === "IGST" && (
                    <tr className="q-sub"><td colSpan={5}>{`IGST @ ${gstRate}%`}</td><td>{formatINR(totals.igst)}</td></tr>
                  )}
                  {quotation.gstEnabled && quotation.gstMode !== "IGST" && (
                    <>
                      <tr className="q-sub"><td colSpan={5}>{`CGST @ ${gstRate / 2}%`}</td><td>{formatINR(totals.cgst)}</td></tr>
                      <tr className="q-sub"><td colSpan={5}>{`SGST @ ${gstRate / 2}%`}</td><td>{formatINR(totals.sgst)}</td></tr>
                    </>
                  )}
                  <tr>
                    <td colSpan={5}>FINAL TOTAL</td>
                    <td>{formatINR(totals.grandTotal)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
            {hasItems && isLast && <p className="q-words">{amountInWords(totals.grandTotal)}</p>}
          </Page>
        );
      })}
    </div>
  );
}
