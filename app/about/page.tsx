import type { Metadata } from "next";
import Image from "next/image";
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
        <div className="mx-auto max-w-7xl">
          <Reveal>
            <p className="mb-4 text-xs font-bold uppercase tracking-[.24em] text-signal">Why STBS</p>
            <h2 className="font-display text-5xl font-bold uppercase leading-none sm:text-6xl">
              What sets us apart
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-px bg-white/10 md:grid-cols-3">
            {[
              ["34+ Years", "Field experience", "Decades of hands-on expertise in water infrastructure."],
              ["1200+ Projects", "Completed work", "Proven track record across residential and industrial sites."],
              ["100% Focus", "Quality commitment", "Attention to detail from survey through installation."],
            ].map(([title, subtitle, desc]) => (
              <Reveal key={title as string} className="bg-black p-9">
                <p className="font-display text-3xl font-bold text-signal">{title as string}</p>
                <h3 className="mt-3 font-display text-xl uppercase text-white">{subtitle as string}</h3>
                <p className="mt-4 text-sm leading-7 text-white/45">{desc as string}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Founder Section */}
      <section className="bg-steel px-5 py-24 text-white lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-14 lg:grid-cols-[1.2fr_1.8fr] lg:items-center">
            <Reveal className="group relative h-[480px]">
              <Image
                src="/founder/rajesh-saini.jpeg"
                alt={founderName}
                fill
                className="object-cover grayscale transition duration-700 group-hover:grayscale-0 group-hover:scale-105"
                sizes="(max-width:1024px) 100vw, 40vw"
              />
              <div className="absolute -bottom-5 -right-5 bg-signal p-6 text-black">
                <p className="font-display text-xl font-bold uppercase tracking-wider">{founderName}</p>
                <p className="text-xs font-bold uppercase tracking-widest opacity-75">{founderTitle}</p>
              </div>
            </Reveal>
            <Reveal delay={0.15}>
              <p className="text-xs font-bold uppercase tracking-[.25em] text-signal">Leadership</p>
              <h2 className="mt-5 font-display text-5xl font-bold uppercase leading-none sm:text-6xl">
                Field-First<br />Leadership
              </h2>
              <p className="mt-7 text-lg leading-8 text-white/70">
                {founderBio}
              </p>
              <p className="mt-4 leading-8 text-white/55">
                Rajesh Saini established Saini Tubewell Boring Service in {foundingYear} with a commitment to providing Haryana and Delhi NCR with dependable water access solutions. Under his guidance, the company has completed over 1,200 projects while maintaining rigorous quality standards and pricing integrity.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Experience & Culture */}
      <section className="bg-neutral-100 px-5 py-24 text-black lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-16 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <h2 className="font-display text-5xl font-bold uppercase leading-none sm:text-6xl">
                Three decades<br />of expertise.
              </h2>
              <div className="mt-12 space-y-8">
                <div>
                  <h3 className="mb-4 font-display text-2xl font-bold uppercase">Our Story</h3>
                  <p className="leading-8 text-black/60">
                    Saini Tubewell Boring Service was founded in 1992 with a simple mission: to provide dependable water infrastructure across Haryana. Starting as a one-man operation, we've grown to a professional team trusted by businesses and communities alike.
                  </p>
                </div>
                <div>
                  <h3 className="mb-4 font-display text-2xl font-bold uppercase">Our Experience</h3>
                  <p className="leading-8 text-black/60">
                    From rainwater harvesting systems to deep borewell drilling, we've completed over 1200 projects. Our experience spans 100mm to 400mm borewells, complete tubewell construction, and modern recharge systems built for challenging local conditions.
                  </p>
                </div>
                <div>
                  <h3 className="mb-4 font-display text-2xl font-bold uppercase">Our Values</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-4">
                      <div className="size-1 bg-black/20" />
                      <p className="text-sm font-medium">Quality materials at competitive rates</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="size-1 bg-black/20" />
                      <p className="text-sm font-medium">Follow-up support and maintenance</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="size-1 bg-black/20" />
                      <p className="text-sm font-medium">Site discipline and professional coordination</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative h-full min-h-[400px] lg:min-h-[500px]">
              <div className="group relative h-full">
                <Image
                  src="/Site_pic_2.jpeg"
                  alt="Professional drilling team at work"
                  fill
                  className="object-cover grayscale transition duration-700 group-hover:grayscale-0 group-hover:scale-105"
                  sizes="(max-width:1024px) 100vw,40vw"
                />
                <div className="absolute -bottom-8 -left-8 bg-signal p-8">
                  <span className="font-display text-6xl font-bold">{foundingYear}</span>
                  <p className="text-sm font-bold uppercase tracking-wider">Established</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}