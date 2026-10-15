/**
 * Scenes of the STBS Brand Film 2026, rendered as short silent clips in /public/film
 * (`<id>-h.mp4` 1600×900 for wide screens, `<id>-v.mp4` 720×1280 for phones, each with a
 * matching `.jpg` poster of its final frame). `alt` describes what the scene shows, including
 * its on-screen words, for people who cannot see it.
 */
export const FILM_SCENES = {
  hook: { label: "STBS brand film: opening", alt: "A gold drill line descends and ripples resolve into the STBS logo, with the words Drilling deep. Building trust." },
  context: { label: "Why test before drilling", alt: "The camera moves down a cross-section of the ground. Water hides deep. Drill blind, lose metres. A dry bore fails, then survey arcs find a water-bearing zone. Know the ground before you drill." },
  intro5: { label: "Five services", alt: "Five gold markers on a line: water testing, drilling, tubewell, materials, recharge. Five services. One accountable team." },
  testing: { label: "Water testing to 800 metres", alt: "A field survey with electrodes, then a strata column scanned down to 800 metres. 800 m. Surveyed before we drill." },
  drilling: { label: "Borewell drilling", alt: "A rotary rig drilling at night with water spray; bore rings grow from 150 to 300 millimetres around a tricone bit. Own rigs. 150–300 mm bores." },
  tubewell: { label: "Tubewell construction", alt: "An animated cutaway builds casing, gravel pack, pump and panel, then water flows out. Casing. Gravel. Pump. Panel." },
  materials: { label: "Borewell material supply", alt: "A stainless-steel submersible pump with a gold light trail, then pipes, cables, panels and fittings with brand names. Pumps to pipes. From leading brands." },
  rain: { label: "Rainwater harvesting", alt: "Rain falls over a recharge system and flows down into the aquifer as the water table rises. Return rain to the ground." },
  map: { label: "Service area", alt: "A map of the region with the Yamuna and light beams on Sonipat, Kundli, Panipat, Rohtak, Delhi and Gurugram. Rooted in Sonipat. Working across the region." },
  timeline: { label: "Since 1992", alt: "A timeline unfolds through 1992, 2022 and 2026." },
  projects: { label: "Recent projects", alt: "Three project cards: BigBasket distribution centre in Kundli, Ashoka University North Campus, and an industrial unit at HSIIDC Barhi." },
  clients: { label: "Clients", alt: "Eight client logos flip into a grid, including Amul, BigBasket, voestalpine, LT Foods, Ashoka University and O.P. Jindal Global University. Trusted by names you already know." },
} as const;

export type FilmSceneId = keyof typeof FILM_SCENES;
