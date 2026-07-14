import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clock, Mail, MapPin, Phone } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { Reveal } from "@/components/reveal";
import { Button } from "@/components/ui/button";
import { company } from "@/lib/company";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact Saini Tubewell Boring Service to discuss borewell and tubewell requirements. Call, email, or request a quote.",
};

export default function Contact() {
  return (
    <>
      <PageHero
        eyebrow="Contact"
        title="Start with the requirement."
        text="Tell us what service you need and where the project is located. We will use that information to guide the next conversation."
      />

      <section className="bg-neutral-100 px-5 py-24 text-black lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-2">
          <Reveal>
            <p className="text-xs font-extrabold uppercase tracking-[.22em]">Project enquiries</p>
            <h2 className="mt-5 font-display text-5xl font-bold uppercase leading-none">A clear brief gets work moving.</h2>
            <p className="mt-7 max-w-xl leading-8 text-black/55">
              Call or email our team directly, or use the quote request to send the service, location and project details in one place.
            </p>
            <Button asChild variant="dark" size="lg" className="mt-8">
              <Link href="/quote">Request a quote <ArrowRight size={17} /></Link>
            </Button>

            <div className="mt-12 space-y-6 border-t border-black/10 pt-10">
              <div className="flex items-start gap-4">
                <Clock className="mt-1 text-black/40" size={22} />
                <div>
                  <h3 className="font-display text-lg font-bold uppercase">Working hours</h3>
                  <p className="mt-1 text-sm leading-6 text-black/55">
                    Monday – Saturday: 8:00 AM – 7:00 PM<br />
                    Sunday: Emergency support only
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <MapPin className="mt-1 text-black/40" size={22} />
                <div>
                  <h3 className="font-display text-lg font-bold uppercase">Service areas</h3>
                  <p className="mt-1 text-sm leading-6 text-black/55">Sonipat, Panipat, Kundli, Rohtak & across Haryana and Delhi NCR</p>
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal delay={.1} className="grid gap-px bg-black/10 sm:grid-cols-2">
            <a href={`tel:+91${company.phones[0]}`} className="group flex flex-col bg-white p-8 transition hover:bg-signal" aria-label={`Call ${company.phones[0]}`}>
              <Phone className="transition group-hover:text-black" />
              <h3 className="mt-8 font-display text-2xl uppercase">Call us</h3>
              <p className="mt-3 text-sm text-black/60 transition group-hover:text-black/80">+91 {company.phones[0]}<br />+91 {company.phones[1]}</p>
            </a>
            <a href={`mailto:${company.email}`} className="group flex flex-col bg-white p-8 transition hover:bg-signal" aria-label={`Email ${company.email}`}>
              <Mail className="transition group-hover:text-black" />
              <h3 className="mt-8 font-display text-2xl uppercase">Email us</h3>
              <p className="mt-3 break-all text-sm text-black/60 transition group-hover:text-black/80">{company.email}</p>
            </a>
            <div className="flex flex-col bg-white p-8 sm:col-span-2">
              <span className="font-display text-2xl uppercase">{company.managingDirector}</span>
              <p className="mt-1 text-sm text-black/50">Managing Director</p>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="bg-black px-5 py-16 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <Reveal>
            <p className="mb-6 text-xs font-bold uppercase tracking-[.24em] text-signal">Find us</p>
            <div className="overflow-hidden border border-white/10">
              <iframe
                title="Saini Tubewell Boring Service location"
                src="https://www.google.com/maps?q=Sonipat,Haryana&output=embed"
                className="h-[400px] w-full grayscale"
                loading="lazy"
              />
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
