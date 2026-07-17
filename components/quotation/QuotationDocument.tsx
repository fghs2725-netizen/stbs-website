"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { quotation as fixed } from "./quotation-data";
import { serviceLabel, type QuotationState, getValidItems, calcAmount, calcTotal, formatINR } from "./quotation-model";
import "./quotation.css";
import "./quotation-refinement.css";

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
function Page({ n, kicker, title, subtitle, children, onOverflow }: {
  n: number; kicker: string; title: string; subtitle?: string; children: React.ReactNode;
  onOverflow?: (page: number, isOverflow: boolean) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [over, setOver] = useState(false);

  useEffect(() => {
    const check = () => {
      const isOver = !!ref.current && ref.current.scrollHeight > ref.current.clientHeight + 1;
      setOver(isOver);
      onOverflow?.(n, isOver);
    };
    check();
    const r = new ResizeObserver(check);
    if (ref.current) r.observe(ref.current);
    return () => r.disconnect();
  }, [n, onOverflow]);

  return (
    <section ref={ref} className="q-page">
      <img className="q-banner" src="/quotation/banner/stbs-premium-banner.png" alt="Saini Tubewell Boring Service" />
      <SidePanel />
      <Watermark />
      <div className="q-main">
        <div className="q-kicker">{kicker} <span>/{String(n).padStart(2, "0")}</span></div>
        {subtitle && <div className="q-service-heading">{subtitle}</div>}
        <h1>{title}</h1>
        {children}
      </div>
      {over && <div className="q-overflow">PAGE {n} OVERFLOW DETECTED</div>}
      <footer>
        <span>SAINI TUBEWELL BORING SERVICE</span>
        <span>{String(n).padStart(2, "0")} / 04</span>
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
export function QuotationDocument({ quotation, isEditorPreview = false, onPage4Overflow }: {
  quotation: QuotationState;
  /** When true, shows dev-only hints like "No items added". Must be false for PDF. */
  isEditorPreview?: boolean;
  /** Reports whether Page 4 content overflows */
  onPage4Overflow?: (isOverflow: boolean) => void;
}) {
  const service = serviceLabel(quotation);
  const validItems = getValidItems(quotation.items);
  const hasItems = validItems.length > 0;
  const total = calcTotal(validItems);

  // Build client lines for display
  const clientLines = [
    { key: "companyName", value: quotation.client.companyName },
    { key: "contactPerson", value: quotation.client.contactPerson },
    { key: "addressLine1", value: quotation.client.addressLine1 },
    { key: "addressLine2", value: quotation.client.addressLine2 },
    { key: "location", value: [quotation.client.city, quotation.client.state, quotation.client.pinCode].filter(Boolean).join(" – ") },
    { key: "phone", value: quotation.client.phone },
    { key: "email", value: quotation.client.email },
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

  const handleOverflow = useCallback((page: number, isOver: boolean) => {
    if (page === 4) onPage4Overflow?.(isOver);
  }, [onPage4Overflow]);

  return (
    <div className="q-document">
      {/* ──── PAGE 1: Cover Letter ──── */}
      <Page n={1} kicker="QUOTATION / COVER LETTER" title="Commercial Quotation" subtitle={service.toUpperCase()} onOverflow={handleOverflow}>
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
      <Page n={2} kicker="ANNEXURE I" title="Company Profile" onOverflow={handleOverflow}>
        <Section title="About Us"><p>{fixed.about}</p></Section>
        <div className="profile-grid">
          <Section title="Mission"><p>{fixed.mission}</p></Section>
          <Section title="Vision"><p>{fixed.vision}</p></Section>
        </div>
        <Section title="Core Capabilities / Distinctive Qualities">
          <ul className="capabilities">{fixed.capabilities.map((x: string, i: number) => <li key={`capability-${i}`}>{x}</li>)}</ul>
        </Section>
        <Section title="Our Esteemed Clients">
          <div className="clients">{fixed.clients.map((x: string, i: number) => <span key={`client-${i}`}>{x}</span>)}</div>
        </Section>
      </Page>

      {/* ──── PAGE 3: Terms & Conditions ──── */}
      <Page n={3} kicker="ANNEXURE II" title="Terms &amp; Conditions" onOverflow={handleOverflow}>
        <div className="terms">
          {fixed.terms.map(([t, d]: readonly string[], i: number) => (
            <article key={`term-${i}-${t}`}>
              <b>{String(i + 1).padStart(2, "0")}</b>
              <div><h3>{t}</h3><p>{d}</p></div>
            </article>
          ))}
        </div>
        <div className="glance">
          <div className="glance-head"><span>AT A GLANCE</span><small>STBS / FIELD RECORD</small></div>
          <div className="glance-grid">
            <div><b>30+</b><span>Years Experience</span></div>
            <div><b>500+</b><span>Projects Delivered</span></div>
            <div><b>100%</b><span>ISI Certified</span></div>
            <div><b>24/7</b><span>Site Support</span></div>
          </div>
        </div>
      </Page>

      {/* ──── PAGE 4: Price Offer ──── */}
      <Page n={4} kicker="ANNEXURE III" title="Price Offer" onOverflow={handleOverflow}>
        <div className="q-supporting">{service}</div>
        <div className="price-intro">Commercial offer for the subject job · Reference {quotation.quotationReference}</div>
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
            {hasItems ? (
              validItems.map((item, n) => (
                <tr key={item.id}>
                  <td>{String(n + 1).padStart(2, "0")}</td>
                  <td>{item.description}</td>
                  <td>{item.unit}</td>
                  <td>{item.quantity}</td>
                  <td>{formatINR(item.rate)}</td>
                  <td>{formatINR(calcAmount(item.quantity, item.rate))}</td>
                </tr>
              ))
            ) : (
              isEditorPreview ? (
                <tr className="no-items-row">
                  <td colSpan={6} style={{ textAlign: "center", color: "#aaa", fontStyle: "italic", padding: "20px 7px" }}>
                    No items added
                  </td>
                </tr>
              ) : null
            )}
          </tbody>
          {hasItems && (
            <tfoot>
              <tr>
                <td colSpan={5}>FINAL TOTAL</td>
                <td>{formatINR(total)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </Page>
    </div>
  );
}
