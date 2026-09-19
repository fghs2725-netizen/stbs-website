"use client";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Award, MapPin, Wrench, Leaf } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/reveal";
import { company, services, whyChoose, processSteps } from "@/lib/company";
import { CaseStudiesSection, HeroSection, SectorsSection, ServicesSection, StatsSection } from "@/components/public/sections";

function WhyChooseCard({ item, i }: { item: typeof whyChoose[0]; i: number }) {
  return (
    <motion.div
      key={item.title}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
      className="h-full border border-white/10 bg-white/5 p-5 sm:p-8 transition-all hover:border-signal/30 hover:bg-white/8"
    >
      <p className="font-display text-xl sm:text-2xl font-bold uppercase leading-tight text-signal">{item.title}</p>
      <p className="mt-2.5 sm:mt-3 text-sm leading-relaxed sm:leading-7 text-white/65">{item.text}</p>
    </motion.div>
  );
}

function ProcessCardGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-8 lg:gap-12 mt-8 sm:mt-16">
      {processSteps.map((step, i) => (
        <motion.div
          key={step.title}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col group relative"
        >
          <div className="font-display text-5xl sm:text-5xl lg:text-[7rem] xl:text-[8rem] font-bold leading-none select-none outline-text opacity-40 transition-all duration-300 group-hover:opacity-90 group-hover:text-signal/10 group-hover:-translate-y-1">
            {step.step}
          </div>
          <div className="w-8 sm:w-10 h-[2px] bg-signal mt-2 mb-3 sm:mb-4 transition-all duration-300 group-hover:w-20" />
          <h3 className="font-display text-lg sm:text-xl font-bold uppercase tracking-wider text-white">
            {step.title}
          </h3>
          <p className="mt-2 sm:mt-3 text-sm leading-relaxed sm:leading-[1.7] text-white/55">
            {step.text}
          </p>
        </motion.div>
      ))}
    </div>
  );
}

const heroFeatures = [
  { icon: Award, label: "Years of Experience", value: "34+" },
  { icon: CheckCircle2, label: "Projects Completed", value: "1200+" },
  { icon: MapPin, label: "Service Area", value: "Haryana & NCR" },
  { icon: Wrench, label: "Modern Fleet", value: "Advanced Equipment" },
  { icon: Leaf, label: "Sustainable Solutions", value: "For a Better Tomorrow" },
];

export function HomePage() {
  return (
    <>
      {/* Hero — same component the CMS renders, with its defaults */}
      <HeroSection content={{}} />

      {/* Stats: same component the CMS renders, with its defaults */}
      <StatsSection content={{}} />

      {/* Sectors: same component the CMS renders, with its defaults */}
      <SectorsSection content={{}} />

      {/* Why Choose */}
      <section className="water-surface-dark px-4 py-12 sm:px-5 sm:py-20 lg:px-8 lg:py-28">
        <div className="mx-auto max-w-7xl">
          <Reveal>
            <div className="mb-8 sm:mb-12 flex flex-col gap-4 sm:gap-6 md:flex-row md:items-end">
              <div>
                <p className="mb-3 sm:mb-4 text-xs font-bold uppercase tracking-[.24em] text-signal">Why choose us</p>
                <h2 className="font-display text-3xl sm:text-5xl lg:text-6xl font-bold uppercase leading-none">
                  Proven expertise.<br />Trusted results.
                </h2>
              </div>
              <p className="max-w-md text-sm leading-relaxed sm:leading-7 text-white/50">
                34 years of field experience delivering water infrastructure solutions built to last.
              </p>
            </div>
          </Reveal>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 sm:gap-5 lg:mt-16">
            {whyChoose.map((item, i) => (
              <WhyChooseCard key={item.title} item={item} i={i} />
            ))}
          </div>
        </div>
      </section>

      {/* Process Timeline */}
      <section className="water-surface-dark px-4 py-12 sm:px-5 sm:py-20 lg:px-8 lg:py-28">
        <div className="mx-auto w-full max-w-[88rem]">
          <Reveal>
            <div className="mb-8 sm:mb-12 flex flex-col gap-4 sm:gap-6 md:flex-row md:items-end">
              <div>
                <p className="mb-3 sm:mb-4 text-xs font-bold uppercase tracking-[.24em] text-signal">Our process</p>
                <h2 className="font-display text-3xl sm:text-5xl lg:text-6xl font-bold uppercase leading-none">
                  Planned from<br />ground level
                </h2>
              </div>
              <p className="max-w-md text-sm leading-relaxed sm:leading-7 text-white/50">
                Every project follows a clear sequence with attention to site realities and practical execution.
              </p>
            </div>
          </Reveal>
          <ProcessCardGrid />
        </div>
      </section>

      {/* Services: same component the CMS renders, with its defaults */}
      <ServicesSection content={{}} data={{}} />

      {/* Projects: same component the CMS renders, with its defaults */}
      <CaseStudiesSection content={{}} />

      {/* CTA */}
      <section className="relative overflow-hidden bg-signal px-4 py-12 sm:px-5 sm:py-16 text-black lg:px-8">
        <motion.div
          animate={{ x: [0, -24, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="pointer-events-none absolute -right-10 top-1/2 -translate-y-1/2 font-display text-[7rem] sm:text-[16rem] font-bold text-black/5 select-none"
        >
          1992
        </motion.div>
        <Reveal className="relative mx-auto flex max-w-7xl flex-col justify-between gap-6 sm:gap-8 md:flex-row md:items-center">
          <h2 className="max-w-3xl font-display text-3xl sm:text-5xl lg:text-6xl font-bold uppercase leading-tight sm:leading-none">
            Let us get your project moving.
          </h2>
          <Button asChild variant="dark" size="lg">
            <Link href="/quote">Request a proposal <ArrowRight size={17} /></Link>
          </Button>
        </Reveal>
      </section>
    </>
  );
}
