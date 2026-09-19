import { CaseStudiesSection, CtaSection, HeroSection, SectorsSection, ServicesSection, StatsSection } from "@/components/public/sections";

/**
 * Static fallback for the homepage, shown only when no published CMS "home" page exists.
 * It is the same seven sections the CMS renders, each with its built-in defaults, in the
 * order the brief specifies: hero, stats, sectors, services, projects, closing CTA.
 * (The navbar and footer come from the shared frame.)
 */
export function HomePage() {
  return (
    <>
      <HeroSection content={{}} />
      <StatsSection content={{}} />
      <SectorsSection content={{}} />
      <ServicesSection content={{}} data={{}} />
      <CaseStudiesSection content={{}} />
      <CtaSection content={{}} />
    </>
  );
}
