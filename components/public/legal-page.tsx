import { PageHero } from "@/components/page-hero";

export interface LegalSection {
  heading: string;
  paras?: string[];
  items?: string[];
}

/** Shared layout for the Privacy and Terms pages: header, a draft notice, then numbered sections. */
export function LegalPage({ eyebrow, title, intro, updated, sections }: { eyebrow: string; title: string; intro: string; updated: string; sections: LegalSection[] }) {
  return (
    <>
      <PageHero eyebrow={eyebrow} title={title} text={intro} />
      <section className="theme-public section-y">
        <div className="container-x">
          <div className="tile max-w-[880px] p-u3" role="note">
            <p className="font-medium text-stbs-ink">Draft for review.</p>
            <p className="t-body mt-u1">This is a plain-language placeholder, not legal advice. Items in [square brackets] still need the owner&apos;s decision, and a legal adviser should review it before it is relied on. Last updated {updated}.</p>
          </div>
          <div className="mt-u6 max-w-[880px]">
            {sections.map((s, i) => (
              <section key={s.heading} className="rule py-u4">
                <h2 className="t-h3">{i + 1}. {s.heading}</h2>
                {s.paras?.map((p) => (
                  <p key={p} className="t-body measure mt-u2">{p}</p>
                ))}
                {s.items && (
                  <ul className="t-body measure mt-u2 list-disc space-y-u1 pl-u3 marker:text-stbs-muted">
                    {s.items.map((it) => (
                      <li key={it}>{it}</li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
