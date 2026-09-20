import Image from "next/image";

/**
 * Editorial photo: one crop ratio (4:3), natural colour (no tint or filter), 4px radius, hairline border,
 * and the 1.02 hover scale. No overlays or offset badges.
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
        className={`object-cover ${position === "top" ? "object-top" : "object-center"}`}
      />
    </div>
  );
}
