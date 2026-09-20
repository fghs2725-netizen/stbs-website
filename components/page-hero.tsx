/**
 * Interior page header: eyebrow, H1, one intro paragraph, on the alternate neutral band with
 * a hairline underneath. Flat: no gradient, image or motion. The H1 uses the H2 type scale
 * (28 -> 44px); the 40 -> 76px H1 is reserved for the homepage hero.
 * The CMS `page_hero` section renders the same classes (see PageHeroSection).
 */
export function PageHero({ eyebrow, title, text }: { eyebrow: string; title: string; text?: string }) {
  return (
    <section className="theme-public band-alt page-head">
      <div className="container-x">
        {eyebrow && <p className="t-eyebrow">{eyebrow}</p>}
        <h1 className="t-h2 mt-u3 text-block">{title}</h1>
        {text && <p className="t-body measure mt-u4 text-stbs-muted">{text}</p>}
      </div>
    </section>
  );
}
