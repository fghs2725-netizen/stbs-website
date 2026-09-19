import Image from "next/image";

/**
 * SVG duotone filters, rendered ONCE per page (WebsiteFrame). Both map luminance to the brand palette:
 *  - stbs-duotone:        --brand-deep -> cool light steel; the hero, under a flat scrim.
 *  - stbs-duotone-photo:  --brand-deep -> near-white; editorial photos on light pages.
 * Every photo on the site uses one of these, so the whole site shares one colour grade.
 */
export function DuotoneDefs() {
  return (
    <svg aria-hidden="true" focusable="false" width="0" height="0" className="absolute">
      <defs>
        <filter id="stbs-duotone" colorInterpolationFilters="sRGB">
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncR type="table" tableValues="0.043 0.47" />
            <feFuncG type="table" tableValues="0.122 0.59" />
            <feFuncB type="table" tableValues="0.2 0.69" />
          </feComponentTransfer>
        </filter>
        <filter id="stbs-duotone-photo" colorInterpolationFilters="sRGB">
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncR type="table" tableValues="0.043 0.96" />
            <feFuncG type="table" tableValues="0.122 0.97" />
            <feFuncB type="table" tableValues="0.2 0.97" />
          </feComponentTransfer>
        </filter>
      </defs>
    </svg>
  );
}

/**
 * Editorial photo: one crop ratio (4:3), one colour grade (duotone), 4px radius, hairline border,
 * and the 1.02 hover scale. No overlays or offset badges.
 * `data-keep-filter` opts out of the global mobile "img { filter: none }" reset.
 */
export function PagePhoto({ src, alt, sizes, priority, position = "center" }: { src: string; alt: string; sizes: string; priority?: boolean; position?: "center" | "top" }) {
  return (
    <div className="img-zoom relative w-full border border-stbs-hairline" style={{ aspectRatio: "4 / 3" }}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        data-keep-filter=""
        className={`object-cover ${position === "top" ? "object-top" : "object-center"}`}
        style={{ filter: "url(#stbs-duotone-photo)" }}
      />
    </div>
  );
}
