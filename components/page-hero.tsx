import { Reveal } from "@/components/reveal";
export function PageHero({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return (
    <section className="relative overflow-hidden bg-water-dark bg-industrial-grid bg-[size:42px_42px] px-5 pb-16 pt-32 sm:pb-20 sm:pt-40 lg:px-8 lg:pb-28">
      <div className="absolute inset-0 bg-gradient-to-br from-[#083344]/90 via-[#0e7490]/85 to-[#0f172a]/90" />
      <div className="absolute left-0 top-20 h-1 w-1/3 bg-water-accent" />
      <Reveal className="relative mx-auto max-w-7xl">
        <p className="mb-5 text-xs font-bold uppercase tracking-[.24em] text-water-accent">{eyebrow}</p>
        {/* Responsive heading: text-4xl on 320-375px, text-5xl on sm, text-7xl on lg */}
        <h1 className="max-w-5xl font-display text-[clamp(2rem,8vw,5rem)] font-bold uppercase leading-[.9] text-white lg:text-8xl">
          {title}
        </h1>
        <p className="mt-6 max-w-2xl text-sm leading-7 text-white/85 sm:text-base sm:leading-8">{text}</p>
      </Reveal>
    </section>
  );
}
