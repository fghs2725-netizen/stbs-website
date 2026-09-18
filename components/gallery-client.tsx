"use client";

import { PageHero } from "@/components/page-hero";

export function GalleryClient() {
  return (
    <>
      <PageHero
        eyebrow="Our work"
        title="Proof in practice."
        text="Project photos from our field operations will appear here as they are published."
      />

      <section className="bg-black px-5 py-24 lg:px-8 lg:py-32">
        <div className="mx-auto max-w-7xl text-center">
          <p className="font-display text-3xl font-bold uppercase text-white/60 sm:text-4xl lg:text-6xl">
            Gallery coming soon
          </p>
          <p className="mx-auto mt-6 max-w-xl text-sm leading-7 text-white/45">
            No project photographs have been published yet. Images uploaded through the website admin
            will be shown here once they are approved and published.
          </p>
        </div>
      </section>
    </>
  );
}