"use client";
import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/reveal";
import { company, gallery, services, trustItems, whyChoose, testimonials, processSteps } from "@/lib/company";

function WhyChooseCard({ item, i }: { item: typeof whyChoose[0]; i: number }) {
  return (
    <motion.div
      key={item.title}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
      className="h-full border border-white/10 bg-white/5 p-7 transition-all hover:border-signal/30 hover:bg-white/8 sm:p-8"
    >
      <p className="font-display text-2xl font-bold uppercase leading-tight text-signal">{item.title}</p>
      <p className="mt-3 text-sm leading-7 text-white/65">{item.text}</p>
    </motion.div>
  );
}

function TestimonialCard({ item }: { item: typeof testimonials[0] }) {
  return (
    <div className="flex flex-col gap-6 border border-white/10 bg-white/5 p-8">
      <div className="flex items-center gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <span key={i} className={`text-sm ${i < item.rating ? "text-signal" : "text-white/20"}`}>★</span>
        ))}
      </div>
      <blockquote className="text-base leading-7 text-white/80">
        &quot;{item.quote}&quot;
      </blockquote>
      <div className="mt-auto">
        <p className="font-bold text-white">{item.name}</p>
        <p className="text-xs uppercase tracking-wider text-white/50">{item.location} • {item.project}</p>
      </div>
    </div>
  );
}

function ProcessCardGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12 mt-16">
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
          <div className="font-display text-8xl lg:text-[7rem] xl:text-[8rem] font-bold leading-none select-none outline-text opacity-40 transition-all duration-300 group-hover:opacity-90 group-hover:text-signal/10 group-hover:-translate-y-1">
            {step.step}
          </div>

          {/* Divider Line */}
          <div className="w-10 h-[2px] bg-signal mt-2 mb-4 transition-all duration-300 group-hover:w-20" />

          {/* Step Title */}
          <h3 className="font-display text-xl font-bold uppercase tracking-wider text-white">
            {step.title}
          </h3>

          {/* Step Description */}
          <p className="mt-3 text-sm leading-[1.7] text-white/55">
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
      <section className="relative flex min-h-[80vh] items-center overflow-hidden bg-black pt-24 lg:min-h-[85vh]">
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
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/40" />

        <div className="relative z-10 mx-auto w-full max-w-7xl px-5 pb-16 pt-24 lg:px-8 lg:pb-24">
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: .7, delay: .1 }}
            className="mb-8 flex items-center gap-3 text-xs font-bold uppercase tracking-[.25em] text-signal"
          >
            <span className="h-px w-12 bg-signal" />
            Trusted since 1992
          </motion.p>
          <h1 className="max-w-4xl font-display text-6xl font-bold uppercase leading-[.85] text-white sm:text-7xl lg:text-[7.5rem]">
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
            className="mt-8 max-w-xl text-base leading-8 text-white/70 lg:text-lg"
          >
            {company.tagline}
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: .8, delay: .65 }}
            className="mt-12 flex flex-col gap-4 sm:flex-row sm:items-center"
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
      <section className="bg-black px-5 py-16 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-center font-display text-5xl font-semibold uppercase tracking-[.24em] text-white/40 sm:text-6xl lg:text-7xl">
            Why choose STBS
          </h2>
          <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:mt-16">
            {whyChoose.map((item, i) => (
              <WhyChooseCard key={item.title} item={item} i={i} />
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-signal text-black">
        <div className="mx-auto grid max-w-7xl grid-cols-2 lg:grid-cols-4">
          {trustItems.map((s) => (
            <div key={s.label} className="border-b border-black/15 p-6 last:border-r-0 sm:p-8 lg:border-b-0 lg:border-r">
              <p className="font-display text-4xl font-bold sm:text-5xl">{s.value}</p>
              <p className="mt-1 text-[10px] font-extrabold uppercase tracking-[.16em] opacity-60">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Process Timeline */}
      <section className="bg-black px-5 py-24 lg:px-8 lg:py-32">
        <div className="mx-auto w-full max-w-[88rem]">
          <Reveal>
            <div className="mb-16 flex flex-col gap-6 md:flex-row md:items-end">
              <div>
                <p className="mb-4 text-xs font-bold uppercase tracking-[.24em] text-signal">Our process</p>
                <h2 className="font-display text-5xl font-bold uppercase leading-none sm:text-7xl">
                  Planned from<br />ground level
                </h2>
              </div>
              <p className="max-w-md text-sm leading-7 text-white/50">
                Every project follows a clear sequence with attention to site realities and practical execution.
              </p>
            </div>
          </Reveal>

          <ProcessCardGrid />
        </div>
      </section>

      {/* Services */}
      <section className="bg-[#0b0b0b] px-5 py-24 lg:px-8 lg:py-32">
        <div className="mx-auto max-w-7xl">
          <Reveal>
            <div className="mb-16 flex flex-col gap-6 md:flex-row md:items-end">
              <div>
                <p className="mb-4 text-xs font-bold uppercase tracking-[.24em] text-signal">What we do</p>
                <h2 className="font-display text-5xl font-bold uppercase leading-none sm:text-7xl">
                  Complete water<br /><span className="text-signal">infrastructure</span>
                </h2>
              </div>
              <p className="max-w-md text-sm leading-7 text-white/50">
                From the first site assessment to final construction and supply, every service is delivered with field discipline and practical expertise.
              </p>
            </div>
          </Reveal>

          <div className="grid gap-6 md:grid-cols-2">
            {services.map((s, i) => (
              <Reveal key={s.title} delay={i * 0.08}>
                <Link href="/services" className="group flex flex-col gap-6 border border-white/10 bg-white/5 p-8 transition-all hover:border-signal/30 hover:bg-white/8">
                  <div className="flex items-start justify-between">
                    <div className="grid size-14 place-items-center bg-signal/10 text-signal transition group-hover:bg-signal group-hover:text-black">
                      <s.icon size={24} />
                    </div>
                    <span className="font-display text-6xl text-white/5">0{i + 1}</span>
                  </div>
                  <h3 className="font-display text-3xl font-semibold uppercase">{s.title}</h3>
                  <p className="text-sm leading-7 text-white/60">{s.text}</p>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-black px-5 py-24 lg:px-8 lg:py-32">
        <div className="mx-auto max-w-7xl">
          <Reveal>
            <div className="mb-16 flex flex-col gap-6 md:flex-row md:items-end">
              <div>
                <p className="mb-4 text-xs font-bold uppercase tracking-[.24em] text-signal">Client voices</p>
                <h2 className="font-display text-5xl font-bold uppercase leading-none sm:text-7xl">
                  What they say
                </h2>
              </div>
              <p className="max-w-md text-sm leading-7 text-white/50">
                Project feedback gathered from work across Haryana and NCR.
              </p>
            </div>
          </Reveal>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((t) => (
              <Reveal key={t.name}>
                <TestimonialCard item={t} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Gallery Preview */}
      <section className="bg-black px-5 pb-24 lg:px-8 lg:pb-32">
        <div className="mx-auto max-w-7xl">
          <Reveal>
            <div className="mb-12 flex items-end justify-between">
              <div>
                <p className="mb-4 text-xs font-bold uppercase tracking-[.24em] text-signal">From the field</p>
                <h2 className="font-display text-5xl font-bold uppercase sm:text-7xl">
                  Work in motion
                </h2>
              </div>
              <Link href="/gallery" className="hidden items-center gap-2 text-xs font-bold uppercase tracking-widest text-signal md:flex">
                View gallery <ArrowRight size={16} />
              </Link>
            </div>
          </Reveal>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" style={{ gridAutoRows: "240px" }}>
            {gallery.slice(0, 6).map((item, i) => (
              <Reveal key={item.label} delay={i * 0.05}>
                <Link href="/gallery" className="group relative overflow-hidden">
                  <Image
                    src={item.src}
                    alt={item.alt}
                    fill
                    className="object-cover grayscale transition duration-700 group-hover:scale-105 group-hover:grayscale-0"
                    sizes="(max-width:768px) 100vw,33vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
                  <p className="absolute bottom-4 left-4 font-display text-xl uppercase text-white transition group-hover:text-signal">
                    {item.label}
                  </p>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-signal px-5 py-20 text-black lg:px-8">
        <motion.div
          animate={{ x: [0, -24, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -right-10 top-1/2 -translate-y-1/2 font-display text-[16rem] font-bold text-black/5"
        >
          1992
        </motion.div>
        <Reveal className="relative mx-auto flex max-w-7xl flex-col justify-between gap-8 md:flex-row md:items-center">
          <h2 className="max-w-3xl font-display text-5xl font-bold uppercase leading-none sm:text-7xl">
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
