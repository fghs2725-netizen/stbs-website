import Image from "next/image";
import { Accent } from "@/components/public/accent";

/**
 * Interior page header: eyebrow, H1, one intro paragraph. Default is the flat alternate band.
 * With `image` it becomes a photo hero: full-bleed photograph under an ink scrim, light type.
 * `*word*` in the title renders as the serif italic accent. The CMS `page_hero` section
 * renders the same classes (see PageHeroSection).
 */
export function PageHero({ eyebrow, title, text, image, imageAlt }: { eyebrow: string; title: string; text?: string; image?: string; imageAlt?: string }) {
  if (image) {
    return (
      <section className="theme-public band-deep relative isolate flex min-h-[min(78svh,720px)] items-end overflow-hidden">
        <Image src={image} alt={imageAlt ?? ""} fill priority sizes="100vw" className="-z-20 object-cover" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#131819] via-[#131819]/70 to-[#131819]/25" />
        <div className="container-x pb-[clamp(48px,7vw,96px)] pt-[clamp(120px,16vw,200px)]">
          {eyebrow && <p className="t-eyebrow !text-stbs-bronze-light">{eyebrow}</p>}
          <h1 className="t-h2 mt-u3 max-w-[900px] !text-white"><Accent text={title} className="t-serif !text-stbs-bronze-light" /></h1>
          {text && <p className="t-body mt-u3 max-w-[40rem] text-white/80">{text}</p>}
        </div>
      </section>
    );
  }
  return (
    <section className="theme-public band-alt page-head">
      <div className="container-x">
        {eyebrow && <p className="t-eyebrow">{eyebrow}</p>}
        <h1 className="t-h2 mt-u3 text-block"><Accent text={title} /></h1>
        {text && <p className="t-body measure mt-u4 text-stbs-muted">{text}</p>}
      </div>
    </section>
  );
}
