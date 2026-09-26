import type { ReactNode } from "react";
import { company } from "@/lib/company";

/**
 * The A4 frame shared by the worker statement and the workers summary: the STBS letterhead band, the
 * title, the body, and a "generated on" line (a statement can change after it is shared, so every
 * copy says when it was made). Rows break across pages; the table header repeats on each page.
 */
export const STATEMENT_CSS = `
  @page { size: A4; margin: 14mm 12mm 14mm; }
  html, body { background: #fff; }
  #worker-pdf-document { font-family: Inter, Arial, sans-serif; color: #1d1d1f; font-size: 10.5pt; line-height: 1.4; }
  .ws-head { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 12px 16px; background: #0B1F33; color: #fff; border-radius: 6px; }
  .ws-head img { height: 34px; width: auto; }
  .ws-brand { font-weight: 700; font-size: 12.5pt; letter-spacing: .02em; }
  .ws-contact { font-size: 8.5pt; opacity: .85; text-align: right; }
  .ws-rule { height: 3px; background: #c9a227; margin: 6px 0 16px; border-radius: 2px; }
  .ws-title { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; margin-bottom: 12px; }
  .ws-title h1 { font-size: 16pt; margin: 0; }
  .ws-title p { margin: 2px 0 0; color: #6e6e73; font-size: 9.5pt; }
  .ws-box { border: 1px solid #d9d9de; border-radius: 6px; padding: 8px 12px; text-align: right; min-width: 150px; }
  .ws-box b { display: block; font-size: 13pt; }
  .ws-box span { color: #6e6e73; font-size: 8.5pt; }
  .ws-to-pay b { color: #9a6200; } .ws-advance b { color: #0066cc; }
  table.ws { width: 100%; border-collapse: collapse; margin-top: 6px; }
  table.ws thead { display: table-header-group; }
  table.ws th { text-align: left; font-size: 8.5pt; text-transform: uppercase; letter-spacing: .04em; color: #6e6e73; border-bottom: 1.5px solid #1d1d1f; padding: 6px 6px; }
  table.ws td { padding: 6px; border-bottom: 1px solid #ececf0; vertical-align: top; }
  table.ws tr { break-inside: avoid; }
  table.ws .num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  table.ws .muted { color: #6e6e73; font-size: 8.5pt; }
  table.ws tr.ws-strong td { font-weight: 700; border-top: 1.5px solid #1d1d1f; border-bottom: none; }
  table.ws tr.ws-carry td { background: #f5f5f7; }
  .ws-work { color: #1d8a4e; }
  .ws-section { margin-top: 18px; font-size: 11pt; font-weight: 700; }
  .ws-foot { margin-top: 18px; color: #8e8e93; font-size: 8pt; display: flex; justify-content: space-between; }
`;

export function StatementFrame({ title, subtitle, aside, children }: { title: string; subtitle: string; aside?: ReactNode; children: ReactNode }) {
  const generated = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });
  return (
    <div id="worker-pdf-document" data-pdf-ready="true">
      <style dangerouslySetInnerHTML={{ __html: STATEMENT_CSS }} />
      <div className="ws-head">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/stbs-logo-only.png" alt="" />
          <span className="ws-brand">{company.name.toUpperCase()}</span>
        </div>
        <div className="ws-contact">{company.phones.join(" · ")}<br />www.stbs.in</div>
      </div>
      <div className="ws-rule" />
      <div className="ws-title">
        <div><h1>{title}</h1><p>{subtitle}</p></div>
        {aside}
      </div>
      {children}
      <div className="ws-foot"><span>Generated {generated}</span><span>{company.name}</span></div>
    </div>
  );
}
