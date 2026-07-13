"use client";
import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight, Check, HardHat, MapPinned, Ruler, Sparkles } from "lucide-react";
import { motion, useInView, useMotionValue, useSpring, useTransform } from "framer-motion";
import { CheckCircle, ClockCountdown, Crosshair, ShieldCheck as PhosphorShield } from "@phosphor-icons/react";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/reveal";
import { company, gallery, services } from "@/lib/company";

const stats = [
  { value: 1992, suffix: "", label: "Established" },
  { value: 34, suffix: "+", label: "Years of experience" },
  { value: 4, suffix: "", label: "Core services" },
  { value: 100, suffix: "%", label: "Site commitment" },
];

const workSteps = [
  { title: "Site reading", text: "We study access, use case, ground conditions and expected water requirements before execution.", icon: MapPinned },
  { title: "Depth planning", text: "The work plan is matched to the site, material needs and practical drilling constraints.", icon: Ruler },
  { title: "Disciplined drilling", text: "Execution stays focused on coordination, equipment handling and field accountability.", icon: HardHat },
  { title: "Handover support", text: "We help close the project with clear communication and dependable after-service support.", icon: Check },
];

const heroLines = ["Go deeper.", "Build stronger."];

function AnimatedStat({ value, suffix, label, delay = 0 }: { value: number; suffix: string; label: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const count = useMotionValue(0);
  const spring = useSpring(count, { stiffness: 70, damping: 18 });
  const rounded = useTransform(spring, latest => `${Math.round(latest)}${suffix}`);

  useEffect(() => {
    if (inView) {
      const timer = window.setTimeout(() => count.set(value), delay * 1000);
      return () => window.clearTimeout(timer);
    }
  }, [count, delay, inView, value]);

  return (
    <div ref={ref} className="border-b border-black/15 p-6 last:border-r-0 sm:p-8 lg:border-b-0 lg:border-r">
      <motion.p className="font-display text-4xl font-bold sm:text-5xl">{rounded}</motion.p>
      <p className="mt-1 text-[10px] font-extrabold uppercase tracking-[.16em] opacity-60">{label}</p>
    </div>
  );
}

export function HomePage() {
  return (
    <>
      <section className="noise relative flex min-h-screen items-end overflow-hidden bg-black pt-28">
        <motion.div initial={{ scale: 1.08, opacity: .65 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }} className="absolute inset-0">
          <Image src="https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&w=2200&q=90" alt="Heavy drilling machinery at an industrial site" fill priority className="object-cover opacity-[.42]" sizes="100vw" />
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-black/10" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/20" />
        <motion.div initial={{ height: 0 }} animate={{ height: "56vh" }} transition={{ duration: 1.2, delay: .35, ease: [0.22, 1, 0.36, 1] }} className="absolute bottom-0 left-[9vw] hidden w-px bg-gradient-to-b from-transparent via-signal/70 to-transparent lg:block" />
        <motion.div initial={{ scale: .8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: .9, delay: .55 }} className="absolute bottom-20 left-[calc(9vw-5rem)] hidden h-40 w-40 rounded-full border border-signal/20 lg:block" />

        <div className="relative z-10 mx-auto w-full max-w-7xl px-5 pb-16 lg:px-8 lg:pb-24">
          <motion.div initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: .7 }} className="mb-7 flex items-center gap-3 text-xs font-bold uppercase tracking-[.25em] text-signal">
            <span className="h-px w-10 bg-signal" />
            Built on experience since 1992
          </motion.div>
          <h1 className="max-w-5xl font-display text-[16vw] font-bold uppercase leading-[.82] text-white sm:text-7xl lg:text-[8.4rem]">
            {heroLines.map((line, index) => (
              <motion.span key={line} initial={{ opacity: 0, y: 42 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .85, delay: .1 + index * .12, ease: [0.22, 1, 0.36, 1] }} className={`block ${index === 1 ? "text-signal" : ""}`}>
                {line}
              </motion.span>
            ))}
          </h1>
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .8, delay: .45 }} className="mt-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <p className="max-w-xl text-base leading-7 text-white/65 md:text-lg">{company.description}</p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg"><Link href="/quote">Request a quote <ArrowRight size={17} /></Link></Button>
              <Button asChild size="lg" variant="outline"><Link href="/services">Explore services</Link></Button>
            </div>
          </motion.div>
        </div>
        <motion.div animate={{ y: [0, 10, 0] }} transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }} className="absolute bottom-7 right-7 hidden text-signal lg:block">
          <ArrowDown />
        </motion.div>
      </section>

      <section className="bg-signal text-black">
        <div className="mx-auto grid max-w-7xl grid-cols-2 lg:grid-cols-4">
          {stats.map((s, i) => <AnimatedStat key={s.label} {...s} delay={i * .08} />)}
        </div>
      </section>

      <section className="bg-[#0b0b0b] px-5 py-24 lg:px-8 lg:py-32">
        <div className="mx-auto max-w-7xl">
          <Reveal>
            <div className="mb-14 flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <div>
                <p className="mb-4 text-xs font-bold uppercase tracking-[.24em] text-signal">What we do</p>
                <h2 className="font-display text-5xl font-bold uppercase leading-none sm:text-7xl">Complete water<br /><span className="outline-text">infrastructure</span></h2>
              </div>
              <p className="max-w-md text-sm leading-7 text-white/50">From the first site assessment to final construction and supply, every service is delivered with field discipline and practical expertise.</p>
            </div>
          </Reveal>
          <div className="grid border-l border-t border-white/10 md:grid-cols-2">
            {services.map((s, i) => (
              <Reveal key={s.title} delay={i * .08}>
                <motion.div whileHover={{ y: -8 }} transition={{ duration: .35, ease: [0.22, 1, 0.36, 1] }}>
                  <Link href="/services" className="group relative block min-h-72 overflow-hidden border-b border-r border-white/10 p-8 transition duration-500 hover:bg-signal lg:p-10">
                    <span className="absolute left-0 top-0 h-1 w-0 bg-signal transition-all duration-500 group-hover:w-full group-hover:bg-black" />
                    <div className="flex items-start justify-between">
                      <s.icon className="size-10 text-signal transition duration-500 group-hover:translate-x-1 group-hover:text-black" strokeWidth={1.5} />
                      <span className="font-display text-5xl text-white/10 transition group-hover:text-black/15">0{i + 1}</span>
                    </div>
                    <h3 className="mt-12 font-display text-3xl font-semibold uppercase group-hover:text-black">{s.title}</h3>
                    <p className="mt-4 max-w-md text-sm leading-7 text-white/45 group-hover:text-black/65">{s.text}</p>
                  </Link>
                </motion.div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="overflow-hidden bg-neutral-100 text-black">
        <div className="mx-auto grid max-w-7xl lg:grid-cols-2">
          <div className="group relative min-h-[520px] overflow-hidden">
            <Image src="/Site_pic_2.jpeg" alt="Experienced field professionals coordinating work" fill className="object-cover grayscale transition duration-700 group-hover:scale-105 group-hover:grayscale-0" sizes="(max-width:1024px) 100vw,50vw" />
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/65 to-transparent" />
            <motion.div whileHover={{ scale: 1.04 }} className="absolute bottom-0 right-0 bg-signal p-7">
              <HardHat size={38} />
              <p className="mt-3 font-display text-2xl font-bold uppercase">Field-first<br />expertise</p>
            </motion.div>
          </div>
          <Reveal className="p-8 sm:p-14 lg:p-20">
            <p className="mb-4 text-xs font-extrabold uppercase tracking-[.24em]">Why Saini Tubewell</p>
            <h2 className="font-display text-5xl font-bold uppercase leading-[.95] sm:text-6xl">Experience beneath every project.</h2>
            <p className="mt-7 leading-8 text-black/60">Since 1992, we have focused on the fundamentals that make water infrastructure dependable: careful planning, suitable materials, disciplined execution and accountability at the site.</p>
            <div className="mt-10 grid gap-5 sm:grid-cols-2">
              {[[Crosshair, "Site-specific planning"], [PhosphorShield, "Quality-led execution"], [ClockCountdown, "Responsive coordination"], [CheckCircle, "End-to-end support"]].map(([Icon, label]) => {
                const I = Icon as typeof Crosshair;
                return <div key={label as string} className="flex items-center gap-3 border-t border-black/15 pt-4"><I className="text-black" size={21} weight="bold" /><span className="text-sm font-bold">{label as string}</span></div>;
              })}
            </div>
            <Button asChild variant="dark" className="mt-10"><Link href="/about">Our company <ArrowRight size={16} /></Link></Button>
          </Reveal>
        </div>
      </section>

      <section className="bg-black px-5 py-24 lg:px-8 lg:py-32">
        <div className="mx-auto max-w-7xl">
          <Reveal>
            <div className="mb-14 flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <div>
                <p className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[.24em] text-signal"><Sparkles size={15} /> How we work</p>
                <h2 className="font-display text-5xl font-bold uppercase leading-none sm:text-7xl">Planned from<br /><span className="outline-text">ground level</span></h2>
              </div>
              <p className="max-w-md text-sm leading-7 text-white/50">The premium feel comes from clarity: every project moves through a practical sequence with the same attention to site realities.</p>
            </div>
          </Reveal>
          <div className="relative grid gap-5 lg:grid-cols-4">
            <div className="absolute left-0 top-10 hidden h-px w-full bg-white/10 lg:block" />
            {workSteps.map((step, i) => (
              <Reveal key={step.title} delay={i * .08}>
                <div className="relative h-full border border-white/10 bg-white/[.025] p-7 transition duration-500 hover:border-signal/50 hover:bg-white/[.045]">
                  <div className="mb-12 grid size-14 place-items-center bg-signal text-black"><step.icon size={24} /></div>
                  <p className="font-display text-sm font-bold uppercase tracking-[.24em] text-white/35">Step 0{i + 1}</p>
                  <h3 className="mt-3 font-display text-3xl font-semibold uppercase">{step.title}</h3>
                  <p className="mt-4 text-sm leading-7 text-white/[.48]">{step.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-black px-5 pb-24 lg:px-8 lg:pb-32">
        <div className="mx-auto max-w-7xl">
          <Reveal>
            <div className="mb-12 flex items-end justify-between">
              <div>
                <p className="mb-4 text-xs font-bold uppercase tracking-[.24em] text-signal">From the field</p>
                <h2 className="font-display text-5xl font-bold uppercase sm:text-7xl">Work in motion</h2>
              </div>
              <Link href="/gallery" className="hidden items-center gap-2 text-xs font-bold uppercase tracking-widest text-signal md:flex">View gallery <ArrowRight size={16} /></Link>
            </div>
          </Reveal>
          <div className="grid gap-4 md:grid-cols-2">
            {gallery.map((item, i) => (
              <Reveal key={item.label} delay={i * .08} className={i === 0 ? "md:row-span-2" : ""}>
                <motion.div whileHover={{ y: -6 }} className={`group relative overflow-hidden ${i === 0 ? "h-full min-h-[520px]" : "h-72"}`}>
                  <Image src={item.src} alt={item.alt} fill className="object-cover grayscale transition duration-700 group-hover:scale-105 group-hover:grayscale-0" sizes="(max-width:768px) 100vw,50vw" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
                  <p className="absolute bottom-5 left-5 font-display text-2xl uppercase transition duration-500 group-hover:translate-y-[-6px]">{item.label}</p>
                </motion.div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-signal px-5 py-20 text-black lg:px-8">
        <motion.div animate={{ x: [0, -24, 0] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }} className="absolute -right-10 top-1/2 -translate-y-1/2 font-display text-[16rem] font-bold text-black/[.06]">1992</motion.div>
        <Reveal className="relative mx-auto flex max-w-7xl flex-col justify-between gap-8 md:flex-row md:items-center">
          <h2 className="max-w-3xl font-display text-5xl font-bold uppercase leading-none sm:text-7xl">Let's get your project moving.</h2>
          <Button asChild variant="dark" size="lg"><Link href="/quote">Request quote <ArrowRight size={17} /></Link></Button>
        </Reveal>
      </section>
    </>
  );
}
