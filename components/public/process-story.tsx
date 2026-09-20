"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

export type StoryStep = { step: string; title: string; text: string; image: string; imageAlt: string };

/**
 * Scroll-driven process story.
 *  - Desktop: one large photo stays pinned while the five steps scroll past; the photo crossfades
 *    to whichever step is at the middle of the screen and that step comes into focus.
 *  - Phones and tablets: a swipeable row of rounded photo cards with the step written on the photo.
 * Steps stay in the DOM in order either way, so the content reads correctly without JavaScript.
 */
export function ProcessStory({ eyebrow, heading, steps }: { eyebrow: string; heading: string; steps: StoryStep[] }) {
  const [active, setActive] = useState(0);
  const refs = useRef<Array<HTMLLIElement | null>>([]);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(Number((entry.target as HTMLElement).dataset.index));
        }
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <section className="band-deep section-y overflow-x-clip">
      <div className="container-x">
        <p className="t-eyebrow">{eyebrow}</p>
        <h2 className="t-h2 mt-u2 text-block">{heading}</h2>
      </div>

      {/* Desktop: pinned photo + scrolling steps */}
      <div className="container-x mt-u8 hidden lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-u8">
        <div className="relative">
          <div className="sticky top-[96px] aspect-[4/5] max-h-[calc(100svh-140px)] w-full overflow-hidden rounded-[32px] bg-white/5 shadow-[0_40px_90px_-30px_rgba(0,0,0,.8)]">
            {steps.map((s, i) => (
              <Image
                key={s.step}
                src={s.image}
                alt={s.imageAlt}
                fill
                sizes="(min-width:1280px) 600px, 50vw"
                className={`object-cover transition-[opacity,transform] duration-[1100ms] ease-[cubic-bezier(0.28,0.11,0.32,1)] motion-reduce:transition-none ${i === active ? "scale-100 opacity-100" : "scale-[1.08] opacity-0"}`}
                priority={i === 0}
              />
            ))}
            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute inset-x-u3 bottom-u3 flex items-center justify-between">
              <span className="glass inline-flex items-center gap-u1 rounded-full border border-white/15 px-u2 py-[8px] text-[0.9375rem] font-medium text-white">
                <span className="tabular-nums text-white/60">{steps[active]?.step}</span>
                {steps[active]?.title}
              </span>
              <span className="flex gap-[6px]" aria-hidden>
                {steps.map((s, i) => (
                  <span key={s.step} className={`h-[6px] rounded-full bg-white transition-all duration-500 ${i === active ? "w-6 opacity-100" : "w-[6px] opacity-35"}`} />
                ))}
              </span>
            </div>
          </div>
        </div>

        <ol>
          {steps.map((s, i) => (
            <li
              key={s.step}
              data-index={i}
              ref={(el) => { refs.current[i] = el; }}
              className={`flex min-h-[78svh] flex-col justify-center transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.28,0.11,0.32,1)] motion-reduce:transition-none ${i === active ? "translate-x-0 opacity-100" : "translate-x-3 opacity-25"}`}
            >
              <span className="t-stat text-white/25">{s.step}</span>
              <h3 className="t-h2 mt-u2">{s.title}</h3>
              <p className="t-body mt-u3 max-w-[30rem] text-white/70">{s.text}</p>
            </li>
          ))}
        </ol>
      </div>

      {/* Phones and tablets: swipeable photo cards, step written on the photo */}
      <ol className="mt-u6 flex snap-x snap-mandatory gap-u2 overflow-x-auto px-[var(--gutter)] pb-u3 [-ms-overflow-style:none] [scrollbar-width:none] lg:hidden [&::-webkit-scrollbar]:hidden">
        {steps.map((s) => (
          <li key={s.step} className="relative aspect-[3/4] w-[80vw] max-w-[380px] shrink-0 snap-center overflow-hidden rounded-[28px] bg-white/5 sm:w-[46vw]">
            <Image src={s.image} alt={s.imageAlt} fill sizes="(max-width:640px) 80vw, 46vw" className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
            <span className="glass absolute left-u2 top-u2 rounded-full border border-white/15 px-[12px] py-[5px] text-[0.8125rem] font-semibold tabular-nums text-white">{s.step}</span>
            <div className="absolute inset-x-u2 bottom-u2 text-white">
              <h3 className="text-[1.75rem] font-semibold leading-[1.1] tracking-[-0.03em]">{s.title}</h3>
              <p className="mt-u1 text-[0.9375rem] leading-[1.45] text-white/75">{s.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
