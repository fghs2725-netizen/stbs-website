import type { Metadata } from "next";
import Image from "next/image";
import { Award, Compass, ShieldCheck } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { Reveal } from "@/components/reveal";
import { company, foundingYear, founderName, founderTitle, founderBio } from "@/lib/company";

export const metadata: Metadata = {
  title: "About",
  description: "Learn about Saini Tubewell Boring Service, providing professional water infrastructure services since 1992.",
};

export default function About() {
  return (
    <>
      <PageHero
        eyebrow="Our company"
        title="Built from the ground down."
        text="Saini Tubewell Boring Service was established in 1992 and has grown as a trusted provider of borewell, material supply and rainwater harvesting services."
      />

      <section className="bg-neutral-100 px-5 py-24 text-black lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-2 lg:items-center">
          <Reveal>
            <p className="text-xs font-extrabold uppercase tracking-[.2em]">More than three decades in the field</p>
            <h2 className="mt-5 font-display text-5xl font-bold uppercase leading-none sm:text-6xl">Know the ground.<br />Respect the work.</h2>
            <p className="mt-7 leading-8 text-black/60">
              Our experience spans rainwater harvesting, borewells from 100 mm to 400 mm, quality borewell material supply and complete tubewell construction.
            </p>
            <p className="mt-4 leading-8 text-black/60">
              We focus on quality materials at reasonable rates, timely work and follow-up support to ensure supplied equipment runs efficiently and is serviced on time.
            </p>
          </Reveal>
          <Reveal className="group relative h-[500px]" delay={.15}>
            <Image
              src="/site_pic.jpeg"
              alt="Industrial engineer at work"
              fill
              className="object-cover grayscale transition duration-700 group-hover:grayscale-0 group-hover:scale-105"
              sizes="(max-width:1024px) 100vw,50vw"
            />
            <div className="absolute -bottom-5 -left-5 bg-signal p-7">
              <span className="font-display text-5xl font-bold">{foundingYear}</span>
              <p className="text-xs font-bold uppercase tracking-widest">Established</p>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="bg-signal px-5 py-20 text-black lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-12 md:grid-cols-2">
          <Reveal>
            <p className="text-xs font-extrabold uppercase tracking-[.2em]">Our mission</p>
            <h2 className="mt-5 font-display text-4xl font-bold uppercase">Quality that endures.</h2>
            <p className="mt-5 leading-8 text-black/65">{company.mission}</p>
          </Reveal>
          <Reveal delay={.1}>
            <p className="text-xs font-extrabold uppercase tracking-[.2em]">Our vision</p>
            <h2 className="mt-5 font-display text-4xl font-bold uppercase">A safer community.</h2>
            <p className="mt-5 leading-8 text-black/65">{company.vision}</p>
          </Reveal>
        </div>
      </section>

      <section className="bg-black px-5 py-24 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-px bg-white/10 md:grid-cols-3">
          {[
            [Compass, "Practical planning", "Solutions shaped around real conditions, requirements and long-term use."],
            [ShieldCheck, "Responsible execution", "Quality materials, reasonable rates and careful site coordination."],
            [Award, "Experience-led service", "On-time work backed by follow-up support for supplied equipment."],
          ].map(([Icon, t, d]) => {
            const I = Icon as typeof Compass;
            return (
              <Reveal key={t as string} className="h-full bg-black p-9">
                <I className="text-signal" size={36} />
                <h3 className="mt-12 font-display text-3xl uppercase">{t as string}</h3>
                <p className="mt-4 text-sm leading-7 text-white/45">{d as string}</p>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* Meet the Founder */}
      <section className="bg-neutral-100 px-5 py-24 text-black lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-2 lg:items-center">
          <Reveal className="relative h-[500px] group">
            <Image
              src="/founder/rajesh-saini.jpeg"
              alt={founderName}
              fill
              className="origin-center scale-[1.15] object-contain p-8"
              sizes="(max-width:1024px) 100vw,50vw"
              priority
            />
            <div className="absolute bottom-0 left-0 flex h-1/4 w-1/4 flex-col justify-end bg-signal p-5">
              <span className="font-display text-3xl font-bold leading-none sm:text-4xl">{foundingYear}</span>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-widest">Since</p>
            </div>
          </Reveal>
          <Reveal delay={.1}>
            <p className="text-xs font-extrabold uppercase tracking-[.2em] text-signal">Leadership</p>
            <h2 className="mt-5 font-display text-5xl font-bold uppercase leading-none sm:text-6xl">Meet the founder.</h2>
            <p className="mt-7 leading-8 text-black/60">{founderBio}</p>
            <div className="mt-8 flex items-center gap-4">
              <div className="h-1 w-20 bg-signal" />
              <p className="text-sm font-bold uppercase tracking-wide text-black/60">{founderTitle}</p>
            </div>
            <p className="mt-4 text-lg font-bold text-black">{founderName}</p>
          </Reveal>
        </div>
      </section>
    </>
  );
}