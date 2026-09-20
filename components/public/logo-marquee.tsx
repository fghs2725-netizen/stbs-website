import Image from "next/image";

export type MarqueeLogo = { id: string; name: string; logoUrl: string; altText?: string | null };

/**
 * Continuous logo rail. The list is rendered twice and translated by exactly half its
 * width, so the loop is seamless. Pure CSS: no JS, no layout thrash. It pauses on hover
 * and holds still entirely under prefers-reduced-motion (the second copy is hidden from
 * assistive tech so names are not announced twice).
 */
export function LogoMarquee({ logos }: { logos: MarqueeLogo[] }) {
  if (logos.length === 0) return null;
  const run = (hidden: boolean) => (
    <ul className="marquee-run" aria-hidden={hidden || undefined}>
      {logos.map((c) => (
        <li key={`${c.id}-${hidden ? "b" : "a"}`} className="shrink-0">
          <span className="flex h-20 w-[180px] items-center justify-center rounded-[18px] bg-stbs-surface px-u3 transition-transform duration-500 ease-[cubic-bezier(0.28,0.11,0.32,1)] hover:scale-105 md:w-[220px]">
            <Image
              src={c.logoUrl}
              alt={c.altText || `${c.name} logo`}
              width={200}
              height={72}
              quality={95}
              sizes="220px"
              className="h-12 w-auto max-w-full object-contain"
            />
          </span>
        </li>
      ))}
    </ul>
  );
  return (
    <div className="marquee" role="list" aria-label="Client logos">
      {run(false)}
      {run(true)}
    </div>
  );
}
