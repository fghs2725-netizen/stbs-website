"use client";

import Image from "next/image";
import { PageHero } from "@/components/page-hero";
import { Reveal } from "@/components/reveal";
import { gallery as galleryItems } from "@/lib/company";
import { useState } from "react";

const categories = ["All", "Machines", "Workers", "Drilling", "Installation", "Completed Projects", "Clients"] as const;

export function GalleryClient() {
  const [activeCategory, setActiveCategory] = useState<(typeof categories)[number]>("All");

  const filteredItems = activeCategory === "All"
    ? galleryItems
    : galleryItems.filter(item => item.category === activeCategory);

  return (
    <>
      <PageHero
        eyebrow="Our work"
        title="Proof in practice."
        text="Every image captures real projects, real equipment, and real results across Haryana and NCR."
      />

      <section className="bg-black px-5 py-24 lg:px-8 lg:py-32">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all
                  ${activeCategory === category
                    ? "bg-signal text-black"
                    : "border border-white/20 text-white/60 hover:border-signal/50 hover:text-white"
                  }`}
              >
                {category}
              </button>
            ))}
          </div>

          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gridAutoRows: "260px" }}>
            {filteredItems.map((item, i) => (
              <Reveal key={`${item.label}-${i}`} delay={i * 0.03}>
                <figure className="group relative overflow-hidden">
                  <Image
                    src={item.src}
                    alt={item.alt}
                    fill
                    className="object-cover grayscale transition duration-700 group-hover:scale-105 group-hover:grayscale-0"
                    sizes="(max-width:768px) 100vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
                  <figcaption className="absolute bottom-4 left-4 font-display text-xl uppercase text-white transition group-hover:text-signal">
                    {item.label}
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>

          <p className="mx-auto mt-10 max-w-7xl text-xs text-white/35">
            Verified project imagery from our field operations since 1992.
          </p>
        </div>
      </section>
    </>
  );
}