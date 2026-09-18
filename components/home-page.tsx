"use client";
import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/reveal";
import { company, services, trustItems, whyChoose, processSteps } from "@/lib/company";

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
          {/* Giant Outlined Step Number */}
          <div className="font-display text-5xl sm:text-5xl lg:text-[7rem] xl:text-[8rem] font-bold leading-none select-none outline-text opacity-40 transition-all duration-300 group-hover:opacity-90 group-hover:text-signal/10 group-hover:-translate-y-1">
            {step.step}
          </div>

          {/* Divider Line */}
          <div className="w-8 sm:w-10 h-[2px] bg-signal mt-2 mb-3 sm:mb-4 transition-all duration-300 group-hover:w-20" />

          {/* Step Title */}
          <h3 className="font-display text-lg sm:text-xl font-bold uppercase tracking-wider text-white">
            {step.title}
          </h3>

          {/* Step Description */}
          <p className="mt-2 sm:mt-3 text-sm leading-relaxed sm:leading-[1.7] text-white/55">
            {step.text}
          </p>
        </motion.div>
      ))}
    </div>
  );
}

const heroLines = ["Go deeper.", "Build stronger."];

export function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="water-hero relative flex min-h-[75vh] items-center overflow-hidden pt-20 sm:pt-24 lg:min-h-[85vh]">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0"
        >
          <Image
            src="/hero-industrial-cross-section.png"
            alt="Industrial site with a borewell cross-section showing groundwater layers"
            fill
            priority
            className="object-cover object-center opacity-[.58]"
            sizes="100vw"
          />
        </motion.div>
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(7,19,31,.3),rgba(7,19,31,.18)_42%,rgba(7,19,31,.92))]" />
        <div className="pointer-events-none absolute -right-24 top-24 h-72 w-[58rem] rotate-[-10deg] rounded-[50%] border border-cyan-200/15" />

        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-12 pt-20 sm:px-5 sm:pb-16 sm:pt-24 lg:px-8 lg:pb-24">
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: .7, delay: .1 }}
            className="mb-6 sm:mb-8 flex items-center gap-3 text-xs font-bold uppercase tracking-[.25em] text-signal"
          >
            <span className="h-px w-8 sm:w-12 bg-signal" />
            Trusted since 1992
          </motion.p>
          <h1 className="max-w-4xl font-display text-4xl font-bold uppercase leading-[.9] text-white sm:text-7xl lg:text-[7.5rem]">
            {heroLines.map((line, index) => (
              <motion.span
                key={line}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: .85, delay: .2 + index * .1, ease: [0.22, 1, 0.36, 1] }}
                className={`block ${index === 1 ? "text-signal" : ""}`}
              >
                {line}
              </motion.span>
            ))}
          </h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: .8, delay: .5 }}
            className="mt-6 sm:mt-8 max-w-xl text-sm leading-relaxed text-white/70 sm:text-base sm:leading-8 lg:text-lg"
          >
            {company.tagline}
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: .8, delay: .65 }}
            className="mt-8 sm:mt-12 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4"
          >
            <Button asChild size="lg"><Link href="/quote">Request a quote <ArrowRight size={17} /></Link></Button>
            <Button asChild size="lg" variant="outline"><Link href={`tel:+91${company.phones[0]}`}>Call now</Link></Button>
          </motion.div>
        </div>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-8 right-8 hidden text-signal/70 lg:block"
        >
          <ArrowDown />
        </motion.div>
      </section>

      {/* Trust Section */}
      <section className="bg-black px-4 py-12 sm:px-5 sm:py-16 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-center font-display text-3xl sm:text-4xl lg:text-7xl font-semibold uppercase tracking-[.2em] sm:tracking-[.24em] text-white/40">
            Why choose STBS
          </h2>
          <div className="mt-8 sm:mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 sm:gap-5 lg:mt-16">
            {whyChoose.map((item, i) => (
              <WhyChooseCard key={item.title} item={item} i={i} />
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="water-surface-dark waterline text-white">
        <div className="mx-auto grid max-w-7xl grid-cols-2 lg:grid-cols-4">
          {trustItems.map((s) => (
            <div key={s.label} className="border-b border-black/15 p-4 sm:p-8 last:border-r-0 lg:border-b-0 lg:border-r">
              <p className="font-display text-3xl font-bold sm:text-4xl lg:text-5xl">{s.value}</p>
              <p className="mt-1 text-[10px] font-extrabold uppercase tracking-[.16em] opacity-60">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Process Timeline */}
      <section className="water-surface-dark px-4 py-12 sm:px-5 sm:py-24 lg:px-8 lg:py-32">
        <div className="mx-auto w-full max-w-[88rem]">
          <Reveal>
            <div className="mb-10 sm:mb-16 flex flex-col gap-4 sm:gap-6 md:flex-row md:items-end">
              <div>
                <p className="mb-3 sm:mb-4 text-xs font-bold uppercase tracking-[.24em] text-signal">Our process</p>
                <h2 className="font-display text-3xl sm:text-5xl lg:text-7xl font-bold uppercase leading-none">
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

      {/* Services */}
      <section className="water-surface-dark px-4 py-12 sm:px-5 sm:py-24 lg:px-8 lg:py-32">
        <div className="mx-auto max-w-7xl">
          <Reveal>
            <div className="mb-10 sm:mb-16 flex flex-col gap-4 sm:gap-6 md:flex-row md:items-end">
              <div>
                <p className="mb-3 sm:mb-4 text-xs font-bold uppercase tracking-[.24em] text-signal">What we do</p>
                <h2 className="font-display text-3xl sm:text-5xl lg:text-7xl font-bold uppercase leading-none">
                  Complete water<br /><span className="text-signal">infrastructure</span>
                </h2>
              </div>
              <p className="max-w-md text-sm leading-relaxed sm:leading-7 text-white/50">
                From the first site assessment to final construction and supply, every service is delivered with field discipline and practical expertise.
              </p>
            </div>
          </Reveal>

          <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
            {services.map((s, i) => (
              <Reveal key={s.title} delay={i * 0.08}>
                <Link href={["/borewell-drilling", "/rainwater-harvesting", "/borewell-material-supply", "/tubewell-construction"][i]} className="water-card group flex flex-col gap-5 sm:gap-6 p-5 sm:p-8 transition-all hover:-translate-y-1 hover:border-signal/60">
                  <div className="flex items-start justify-between">
                    <div className="grid size-12 sm:size-14 place-items-center bg-signal/10 text-signal transition group-hover:bg-signal group-hover:text-black">
                      <s.icon size={22} />
                    </div>
                    <span className="font-display text-4xl lg:text-6xl text-white/5">0{i + 1}</span>
                  </div>
                  <h3 className="font-display text-2xl sm:text-3xl font-semibold uppercase">{s.title}</h3>
                  <p className="text-sm leading-relaxed sm:leading-7 text-white/60">{s.text}</p>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-signal px-4 py-12 sm:px-5 sm:py-20 text-black lg:px-8">
        <motion.div
          animate={{ x: [0, -24, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="pointer-events-none absolute -right-10 top-1/2 -translate-y-1/2 font-display text-[7rem] sm:text-[16rem] font-bold text-black/5 select-none"
        >
          1992
        </motion.div>
        <Reveal className="relative mx-auto flex max-w-7xl flex-col justify-between gap-6 sm:gap-8 md:flex-row md:items-center">
          <h2 className="max-w-3xl font-display text-3xl sm:text-5xl lg:text-7xl font-bold uppercase leading-tight sm:leading-none">
            Let us get your project moving.
          </h2>
          <Button asChild variant="dark" size="lg">
            <Link href="/quote">Request quote <ArrowRight size={17} /></Link>
          </Button>
        </Reveal>
      </section>
    </>
  );
}
