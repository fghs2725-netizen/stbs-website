# STBS image prompts

Photo-realistic prompts for generating site imagery. Use your own tool (Midjourney, Flux,
Firefly, Nano Banana, etc.). Every prompt is the **style anchor** + one **scene line**.

If the tool supports reference images, upload `public/site_pic.jpeg` and `public/Site_pic_2.jpeg`
as style references so the new images match the two real photos already on the site.

---

## Style anchor (paste before every scene line)

```
Candid documentary photo, same look as the reference images: north Indian construction site,
red-brown soil, grey precast concrete, Indian workers in yellow hard hats and orange or lime
hi-vis vests, worn work gloves, dusty faded clothing, overcast natural daylight, muted
true-to-life colours, slight film grain, no HDR, no glow, imperfect unposed framing, irregular
real-world textures (mixed-size gravel, uneven concrete, scuffed tools). Shot on Canon EOS R6,
35mm f/4. No text, no logos, no watermarks.
```

## Negative prompt (use on every image)

```
illustration, 3d render, cgi, cinematic lighting, teal and orange grade, glossy, plastic skin,
oversharpened, HDR, oversaturated, perfect symmetry, uniform identical gravel or bricks,
stock-photo smiling pose, text, watermark, logo, deformed hands, extra fingers, warped machinery
```

---

## 1. Service page banners — 16:9, generate at 2400 x 1350

| # | File name | Scene line |
|---|---|---|
| 1 | `borewell-drilling.jpg` | Truck-mounted borewell drilling rig at work on a bare plot, two workers handling a drill rod, muddy water channel in the foreground, drill rods stacked on the ground. |
| 2 | `tubewell-construction.jpg` | Crew lowering a long slotted casing pipe into a fresh tubewell with a tripod and chain pulley, gravel bags beside the bore. |
| 3 | `borewell-material-supply.jpg` | Open yard beside a small godown with stacked PVC and MS casing pipes, cable drums and cartons of submersible pump motors on pallets, no brand names. |
| 4 | `hydrogeological-survey.jpg` | Surveyor setting up a resistivity meter with electrode stakes and cable spools on dry farmland, clipboard in hand, a farmer watching from a distance. |
| 5 | `pump-installation.jpg` | Two technicians lowering a submersible pump on a rising main with a rope into an open borewell, electrical panel and cable on the ground. |

> Rainwater harvesting already has a real photo (`site_pic.jpeg` — the recharge pit). Skip it
> unless you want an alternative.

## 2. Process steps — 4:3, generate at 1600 x 1200

| # | File name | Scene line |
|---|---|---|
| 6 | `step-site-survey.jpg` | Two people walking an empty plot, one holding a folded site plan, a wooden peg marking the chosen drilling spot in the foreground. |
| 7 | `step-drilling.jpg` | Close-medium shot of a drill bit and rod string entering the ground, muddy cuttings pooled around the collar, a gloved hand steadying the rod. |
| 8 | `step-casing.jpg` | Two workers fitting a threaded casing joint over an open borewell with a wrench, slotted screen pipe on trestles nearby. |
| 9 | `step-development.jpg` | Old borewell being air-flushed by a compressor, muddy water jetting from the casing mouth, a worker in rubber boots standing back. |
| 10 | `step-pump.jpg` | Worker connecting piping and an electrical panel at a finished borewell head, cable clips and pressure gauge visible. |
| 11 | `step-testing.jpg` | Worker measuring flow at a fresh borewell outlet with a bucket and phone stopwatch, clear water gushing from the pipe. |
| 12 | `step-handover.jpg` | Owner in a plain shirt shaking hands with a crew member beside a finished capped borewell and small pump-house, tools loaded on a pickup behind. |

## 3. Gallery — 3:2, generate at 2400 x 1600

| # | File name | Scene line |
|---|---|---|
| 13 | `gallery-drill-bit.jpg` | Worn tungsten-carbide drill bit on muddy ground, chipped teeth, wet clay stuck to it. |
| 14 | `gallery-rods.jpg` | Drill rods being threaded at the rig, grease on the threads, chain wrench turning. |
| 15 | `gallery-cuttings.jpg` | Soil cuttings laid in small heaps by depth on a plastic sheet, brown, grey and yellow layers, a hand pointing to one. |
| 16 | `gallery-water.jpg` | Clear water flowing strongly from a fresh borewell pipe into a channel on farmland, sunlit ripples. |
| 17 | `gallery-rig-wide.jpg` | Wide shot of a rig and crew at golden hour across a wheat field. |
| 18 | `gallery-rings.jpg` | Precast concrete rings stacked beside an excavated trench, an excavator idling in the background. |
| 19 | `gallery-crew.jpg` | Crew taking a chai break on an upturned crate beside the rig, helmets on the ground. |
| 20 | `gallery-recharge-pit.jpg` | Overhead view of a finished recharge pit cover flush with a paved driveway, drain channel leading to it. |

## 4. Optional

| # | File name | Ratio | Scene line |
|---|---|---|---|
| 21 | `about-office.jpg` | 3:2 | Small site office desk with rolled drawings, a laptop, a yellow helmet and a mug, warm window light. |

---

## Rules while generating

- **Crew shots from behind or at a distance only.** Faces differ between images and will not
  read as the same team.
- **Never recreate the founder.** The real portrait stays (`public/founder/rajesh-saini.jpeg`).
- **No signage.** If a generated machine carries a name, regenerate — a wrong company name on a
  rig is worse than no name.
- Zoom in on hands, tool threads and wheels before accepting an image; those fail most often.

## After generating

Save as JPG at roughly 2400px wide and hand the files over. They then get converted to WebP,
compressed, renamed to the table above, given alt text, and wired into the pages.

**These are illustrative images, not project records.** Do not caption them as specific STBS
jobs. Real project proof belongs in Projects and Gallery, from real photos.
