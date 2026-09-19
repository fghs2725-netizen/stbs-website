import Link from "next/link";
import { PageHero } from "@/components/page-hero";

/**
 * Honest empty state, shown only when no gallery photo is published anywhere. It says what is
 * true for a visitor (photos are on their way) and points at the projects page that already has
 * real content, rather than exposing admin instructions.
 */
export function GalleryClient() {
  return (
    <>
      <PageHero eyebrow="Our work" title="Project photographs are being prepared." text="Photos from our field operations will be published here. Meanwhile, the projects page describes recent work in detail." />
      <section className="theme-public section-y">
        <div className="container-x">
          <Link href="/projects" className="btn btn-primary w-full sm:w-auto">See selected projects</Link>
        </div>
      </section>
    </>
  );
}
