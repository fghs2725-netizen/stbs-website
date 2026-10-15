"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export interface SequenceItem {
  slug: string;
  href: string;
  title: string;
  summary: string;
  /** Serif italic second line, e.g. "150–300 mm bores." */
  accent: string;
  image: { src: string; alt: string };
}

/**
 * The five services as one sticky story, in the order a real job runs. Desktop: the text panel
 * and photo stay pinned while scrolling advances the step. Phones and reduced-motion users get a
 * plain stack of cards, with no pinning and no cross-fade.
 */
export function ServicesSequence({ eyebrow, heading, items }: { eyebrow: string; heading: string; items: SequenceItem[] }) {
  const [active, setActive] = useState(0);
  const steps = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.i));
        }
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    steps.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [items.length]);

  const cur = items[active] ?? items[0];

  return (
    <section className="theme-public band-alt">
      <div className="container-x pt-[clamp(72px,10vw,140px)]">
        <p className="t-eyebrow">{eyebrow}</p>
        <h2 className="t-h2 mt-u2 text-block">{heading}</h2>
      </div>

      {/* Desktop: pinned stage */}
      <div className="container-x hidden lg:block">
        <div className="relative mt-u6 grid grid-cols-[1fr_1.15fr] gap-u8" style={{ height: `calc(${items.length} * 62svh + 40svh)` }}>
          <div>
          <div className="sticky top-[96px] flex h-[calc(100svh-120px)] max-h-[760px] flex-col justify-center">
            <p className="font-brand text-[clamp(5rem,9vw,9rem)] font-semibold leading-none tracking-[-0.03em] text-stbs-brand-mid/25" aria-hidden>
              {String(active + 1).padStart(2, "0")}
            </p>
            <div key={cur.slug} className="animate-[fadeSlideUp_.7s_cubic-bezier(0.28,0.11,0.32,1)_both] motion-reduce:animate-none">
              <h3 className="t-h2 mt-u2 !text-[clamp(2.25rem,4vw,3.5rem)]">{cur.title}</h3>
              <p className="t-serif mt-u1 text-[clamp(1.5rem,2.4vw,2.25rem)] leading-tight">{cur.accent}</p>
              <p className="t-body mt-u3 max-w-[30rem] text-stbs-muted">{cur.summary}</p>
              <Link href={cur.href} className="btn btn-primary mt-u4 self-start">Explore {cur.title}</Link>
            </div>
            <ol className="mt-u6 flex gap-2" aria-hidden>
              {items.map((it, i) => (
                <li key={it.slug} className={`h-[3px] flex-1 rounded-full transition-colors duration-500 ${i <= active ? "bg-stbs-brand-mid" : "bg-stbs-ink/15"}`} />
              ))}
            </ol>
          </div>
          </div>

          <div>
            <div className="sticky top-[96px] h-[calc(100svh-120px)] max-h-[760px] overflow-hidden rounded-[18px] bg-stbs-ink shadow-[0_40px_90px_-50px_rgba(19,24,25,.7)]">
              {items.map((it, i) => (
                <Image
                  key={it.slug}
                  src={it.image.src}
                  alt={i === active ? it.image.alt : ""}
                  aria-hidden={i !== active}
                  fill
                  sizes="(min-width:1024px) 50vw, 100vw"
                  className={`object-cover transition-opacity duration-700 ease-[cubic-bezier(0.28,0.11,0.32,1)] motion-reduce:transition-none ${i === active ? "opacity-100" : "opacity-0"}`}
                  priority={i === 0}
                />
              ))}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
            </div>
          </div>
          {/* Scroll runway: one step per service drives `active`. */}
          <ul className="pointer-events-none absolute inset-x-0 top-0 flex flex-col" style={{ height: `calc(${items.length} * 62svh)` }} aria-hidden>
            {items.map((it, i) => (
              <li key={it.slug} ref={(el) => { steps.current[i] = el; }} data-i={i} className="flex-1" />
            ))}
          </ul>
        </div>
      </div>

      {/* Mobile / tablet: stacked cards */}
      <ul className="container-x mt-u6 grid gap-u3 pb-[clamp(72px,10vw,140px)] md:grid-cols-2 lg:hidden">
        {items.map((it, i) => (
          <li key={it.slug}>
            <Link href={it.href} className="group block overflow-hidden rounded-[18px] bg-[var(--card)] shadow-[0_1px_0_rgba(19,24,25,.06)]">
              <div className="relative aspect-[4/3] overflow-hidden">
                <Image src={it.image.src} alt={it.image.alt} fill sizes="(max-width:768px) 100vw, 50vw" className="object-cover transition-transform duration-700 group-hover:scale-105 motion-reduce:transition-none" />
                <span className="absolute left-u2 top-u2 rounded-full bg-stbs-ink/70 px-3 py-1 text-[.75rem] font-bold tracking-[.14em] text-white backdrop-blur">{String(i + 1).padStart(2, "0")}</span>
              </div>
              <div className="p-u3">
                <h3 className="t-h3">{it.title}</h3>
                <p className="t-serif mt-1 text-[1.25rem]">{it.accent}</p>
                <p className="mt-u1 text-[.9375rem] leading-[1.5] text-stbs-muted">{it.summary}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
