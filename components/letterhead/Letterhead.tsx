/**
 * The STBS A4 letterhead (the owner chose the "Classic" look, 2026-11-04): wordmark and name on the
 * left, contacts on the right, a gold-over-black rule, and a foot naming the services.
 *
 * One component draws it for every letter: the blank letterpad, letters written in the admin and the
 * bank-details letter. Every fact comes from lib/company.ts, so the paper cannot drift from the site.
 */
import type { ReactNode } from "react";
import { businessInfo, company } from "@/lib/company";
import { formatIndianPhone } from "@/lib/phone";

/**
 * The name as printed on the letterpad heading. The owner asked for the "Tyubwel" spelling on the
 * letterpad only (2026-11-04); everything else, including the signature line and GST documents, keeps
 * the registered name `company.name`.
 */
export const LETTERHEAD_NAME = "Saini Tyubwel Boring Service";
export const LETTERHEAD_SERVICES = ["Borewell Drilling", "Rainwater Harvesting", "Tubewell Construction", "Borewell Material Supply"];
export const LETTERHEAD_SITE = "www.stbs.in";
export const letterheadPhones = () => company.phones.map((p) => formatIndianPhone(p));
export const letterheadAddress = () => `${businessInfo.registeredOffice}, Haryana ${businessInfo.documentPinCode}`;

export const LETTERHEAD_CSS = `
.lh-page { width: 210mm; height: 297mm; background: #fff; position: relative; overflow: hidden; display: flex; flex-direction: column;
  font-family: Inter, Arial, sans-serif; color: #1d1f21; font-size: 10.5pt; line-height: 1.55; break-after: page; page-break-after: always; }
.lh-page:last-child { break-after: auto; page-break-after: auto; }
.lh-head { padding: 14mm 20mm 0; display: flex; justify-content: space-between; align-items: flex-end; gap: 12mm; }
.lh-mark img { height: 17mm; width: auto; display: block; }
.lh-name { margin: 2.5mm 0 0; font: 700 12.5pt Inter, Arial, sans-serif; letter-spacing: .02em; color: #131819; }
.lh-tag { margin: .5mm 0 0; font-size: 8.5pt; letter-spacing: .14em; text-transform: uppercase; color: #A87828; font-weight: 600; }
.lh-contact { text-align: right; font-size: 8.5pt; line-height: 1.6; color: #4a5056; }
.lh-contact b { color: #131819; font-weight: 600; }
.lh-rule { margin: 5mm 20mm 0; height: 0; border-top: 1.4pt solid #A87828; }
.lh-rule::after { content: ""; display: block; margin-top: 1.2pt; border-top: .5pt solid #131819; }
.lh-cont { margin: 12mm 20mm 0; padding-bottom: 2.5mm; display: flex; justify-content: space-between; align-items: baseline;
  font-size: 8.5pt; color: #6b7177; border-bottom: .5pt solid #c9ced2; }
.lh-cont b { color: #131819; letter-spacing: .03em; }
.lh-body { flex: 1; padding: 8mm 20mm 0; min-height: 0; }
.lh-foot { margin: 0 20mm; padding: 3mm 0 9mm; border-top: .5pt solid #c9ced2; display: flex; justify-content: space-between;
  gap: 8mm; font-size: 7.8pt; color: #6b7177; }
`;

/** One A4 sheet. The first page carries the full masthead; later pages a slim line. The foot is on every page. */
export function LetterheadPage({ first = true, children, pageLabel }: { first?: boolean; children?: ReactNode; pageLabel?: string }) {
  return (
    <section className="lh-page">
      {first ? (
        <>
          <header className="lh-head">
            <div className="lh-mark">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/stbs-logo-dark.png" alt="STBS" />
              <p className="lh-name">{LETTERHEAD_NAME}</p>
              <p className="lh-tag">{company.tagline}</p>
            </div>
            <div className="lh-contact">
              <div><b>{letterheadPhones().join("  ·  ")}</b></div>
              <div>{company.email} · {LETTERHEAD_SITE}</div>
              <div>{letterheadAddress()}</div>
              {businessInfo.gstin && <div>GSTIN {businessInfo.gstin}</div>}
            </div>
          </header>
          <div className="lh-rule" />
        </>
      ) : (
        <div className="lh-cont"><b>{LETTERHEAD_NAME}</b><span>{pageLabel}</span></div>
      )}
      <div className="lh-body">{children}</div>
      <footer className="lh-foot">
        <span>{LETTERHEAD_SERVICES.join(" · ")}</span>
        <span>Since {company.established}</span>
      </footer>
    </section>
  );
}
