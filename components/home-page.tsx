"use client";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Award, MapPin, Wrench, Leaf } from "lucide-react";
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
      {/* Hero */}
      <section className="relative flex min-h-[85vh] items-end overflow-hidden bg-[#07131f] pt-20 sm:pt-24 lg:min-h-[90vh]">
        {/* Hero Image */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0"
        >
          <Image
            src="/stbs-drilling-rig-real.png"
            alt="STBS drilling rig on industrial construction site"
            fill
            priority
            className="object-cover object-[65%_center] sm:object-[70%_center] lg:object-right"
            sizes="100vw"
          />
        </motion.div>

        {/* Dark gradient overlay - stronger on left for text legibility */}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(7,19,31,0.95)_0%,rgba(7,19,31,0.85)_35%,rgba(7,19,31,0.4)_60%,rgba(7,19,31,0.2)_100%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(7,19,31,0.6)_0%,transparent_40%,transparent_70%,rgba(7,19,31,0.9)_100%)]" />

        {/* Content */}
        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-20 pt-16 sm:px-5 sm:pb-24 sm:pt-20 lg:px-8 lg:pb-28">
          {/* Logo + Tagline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="mb-8 sm:mb-10"
          >
            <Link href="/" data-editor-safe className="inline-block transition-opacity hover:opacity-90">
              <Image
                src="/stbs-logo-only.png"
                alt="STBS logo"
                width={120}
                height={60}
                className="h-12 w-auto sm:h-14"
                priority
              />
            </Link>
            <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.2em] text-signal sm:text-xs">
              Groundwater Solutions For A Stronger Tomorrow
            </p>
          </motion.div>

          {/* Main Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, delay: 0.2 }}
            className="max-w-4xl font-display text-[clamp(2.5rem,8vw,5rem)] font-bold uppercase leading-[0.9] text-white sm:text-[clamp(3.5rem,9vw,6rem)] lg:text-[clamp(4rem,10vw,7rem)]"
          >
            <span className="block">Reliable Water.</span>{" "}
            <span className="block text-signal">Stronger Foundations.</span>
          </motion.h1>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mt-5 max-w-xl text-sm leading-relaxed text-white/80 sm:mt-6 sm:text-base sm:leading-relaxed"
          >
            Professional borewell drilling, tubewell construction and water infrastructure solutions across Haryana and NCR.
          </motion.p>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="mt-6 sm:mt-8"
          >
            <Button asChild size="lg" className="h-12 rounded-lg bg-signal px-6 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-signal/90 sm:h-14 sm:px-8 sm:text-sm">
              <Link href="/quote">
                Request A Quote <ArrowRight size={18} className="ml-2" />
              </Link>
            </Button>
          </motion.div>

          {/* Feature Strip */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.7 }}
            className="mt-12 grid grid-cols-2 gap-3 sm:mt-16 sm:gap-4 lg:grid-cols-5 lg:gap-6"
          >
            {heroFeatures.map((feature, i) => (
              <div
                key={feature.label}
                className="flex flex-col items-start gap-2 border-l-2 border-signal/40 bg-black/30 p-3 backdrop-blur-sm sm:p-4"
              >
                <feature.icon size={20} className="text-signal sm:size-6" />
                <div>
                  <p className="font-display text-lg font-bold text-white sm:text-xl lg:text-2xl">
                    {feature.value}
                  </p>
                  <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-white/60 sm:text-[10px]">
                    {feature.label}
                  </p>
                </div>
              </div>
            ))}
          </motion.div>
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

      {/* Services */}
      <section className="water-surface-dark px-4 py-12 sm:px-5 sm:py-20 lg:px-8 lg:py-28">
        <div className="mx-auto max-w-7xl">
          <Reveal>
            <div className="mb-8 sm:mb-12 flex flex-col gap-4 sm:gap-6 md:flex-row md:items-end">
              <div>
                <p className="mb-3 sm:mb-4 text-xs font-bold uppercase tracking-[.24em] text-signal">What we do</p>
                <h2 className="font-display text-3xl sm:text-5xl lg:text-6xl font-bold uppercase leading-none">
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
            <Link href="/quote">Request quote <ArrowRight size={17} /></Link>
          </Button>
        </Reveal>
      </section>
    </>
  );
}
