import { LETTERHEAD_CSS, LetterheadPage } from "./Letterhead";
import { letterPages, type LetterDetails } from "@/lib/letter";
import { company } from "@/lib/company";

const PRINT = `*{box-sizing:border-box}html,body{margin:0;padding:0;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}@page{size:A4 portrait;margin:0}`;
const LETTER_CSS = `
.lt-meta { display: flex; justify-content: space-between; margin: 0 0 6mm; font-size: 10pt; color: #2b333b; }
.lt-to { margin: 0 0 4mm; white-space: pre-line; }
.lt-attn { margin: -2mm 0 4mm; }
.lt-subject { margin: 0 0 4mm; font-weight: 700; color: #131819; }
.lt-p { margin: 0 0 3.2mm; white-space: pre-line; text-align: justify; }
.lt-sign { margin-top: 8mm; break-inside: avoid; }
.lt-sign p { margin: 0; }
.lt-sign img { height: 16mm; width: auto; display: block; margin: 2mm 0 1mm; mix-blend-mode: multiply; }
.lt-sign .lt-space { height: 16mm; }
`;

const showDate = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
};

/** A letter, or with `letter` null the blank letterpad. The root carries data-pdf-ready for the renderer. */
export function LetterDocument({ letter }: { letter: LetterDetails | null }) {
  const pages = letter ? letterPages(letter) : [[]];
  return (
    <main id="letter-document" data-pdf-ready="true">
      <style dangerouslySetInnerHTML={{ __html: PRINT + LETTERHEAD_CSS + LETTER_CSS }} />
      {pages.map((paras, i) => {
        const first = i === 0;
        const last = i === pages.length - 1;
        return (
          <LetterheadPage key={i} first={first} pageLabel={letter ? `${letter.reference || ""} · Page ${i + 1} of ${pages.length}` : undefined}>
            {letter && first && (
              <>
                <div className="lt-meta"><span>{letter.reference ? `Ref: ${letter.reference}` : ""}</span><span>Date: {showDate(letter.date)}</span></div>
                <p className="lt-to">To,{"\n"}{letter.to}</p>
                {letter.attention && <p className="lt-attn">Kind attention: {letter.attention}</p>}
                <p className="lt-subject">Subject: {letter.subject}</p>
                {letter.salutation && <p className="lt-p">{letter.salutation}</p>}
              </>
            )}
            {paras.map((p, n) => <p key={n} className="lt-p">{p}</p>)}
            {letter && last && (
              <div className="lt-sign">
                <p>{letter.closing}</p>
                <p><b>For {company.name}</b></p>
                {letter.withSignature
                  ? /* eslint-disable-next-line @next/next/no-img-element */ <img src="/invoice/signature.png" alt="Signature" />
                  : <div className="lt-space" />}
                <p><b>{letter.signatory}</b></p>
                {letter.designation && <p>{letter.designation}</p>}
              </div>
            )}
          </LetterheadPage>
        );
      })}
    </main>
  );
}
