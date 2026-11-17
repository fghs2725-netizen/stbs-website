/*
 * The picture behind a story, made by OpenAI's image API when the owner has no photo of their own.
 * The key lives in OPENAI_API_KEY on the server and never reaches the browser.
 */
import { CUSTOM_OCCASION, OCCASIONS } from "./occasions";

/** What the picture should show, per occasion. Scenes, never words: the story adds the greeting. */
const SCENES: Record<string, string> = {
  "new-year": "a night sky full of golden fireworks over a calm Indian city skyline, warm lights reflected in water",
  lohri: "a glowing Lohri bonfire at dusk in a Punjab village courtyard, people in festive dress dancing around it, sugarcane and popcorn nearby",
  "republic-day": "the Indian tricolour flag waving in bright morning light with India Gate behind it and soft saffron, white and green smoke trails in the sky",
  "basant-panchami": "bright yellow mustard fields in bloom under a clear spring sky, yellow marigolds and kites in the air",
  "maha-shivratri": "a serene Shivling with bilva leaves, flowers and lit diyas in a temple at dawn, Himalayan peaks glowing behind",
  eid: "a crescent moon and a star over the domes and minarets of a mosque at twilight, glowing lanterns in the foreground",
  holi: "clouds of bright pink, yellow, blue and green gulal bursting in the air over brass plates of colour powder, joyful raised hands",
  "world-water-day": "clear water pouring from a tubewell pipe into cupped hands in a green field at sunrise, droplets catching the light",
  baisakhi: "golden ripe wheat fields at harvest under a bright sky, a dhol and sickles resting by the field, farmers celebrating in the distance",
  "earth-day": "two hands holding a young green sapling in rich soil, lush fields and a clear river behind in soft morning light",
  "labour-day": "construction and drilling site workers in helmets seen from behind at sunrise, tools and a drilling rig in warm light",
  "environment-day": "a green landscape with trees, a clean pond and rainwater falling gently, sunlight breaking through the clouds",
  "independence-day": "the Indian tricolour flag flying high over the Red Fort at sunrise, pigeons taking flight, saffron and green light in the sky",
  "raksha-bandhan": "a decorated puja thali with a rakhi, roli, rice, sweets and a lit diya on silk cloth, marigold flowers around",
  janmashtami: "a peacock feather and a flute resting beside a decorated clay pot of butter, a small swing with flowers, soft temple lamps glowing",
  "ganesh-chaturthi": "a beautifully decorated Lord Ganesha idol with marigold garlands, modak sweets and glowing lamps in a festive pandal",
  "teachers-day": "an open book, a brass lamp and a stack of books on a wooden desk in warm light, a blackboard softly out of focus behind",
  "engineers-day": "engineering drawings, a yellow safety helmet, a compass and measuring tools on a table, a construction site in soft light behind",
  "vishwakarma-puja": "Lord Vishwakarma seated with his tools and a swan, surrounded by marigolds, lit lamps, wrenches, gears and a yellow safety helmet",
  "gandhi-jayanti": "a spinning wheel (charkha), round spectacles and a white khadi cloth in soft morning light, a simple ashram veranda behind",
  dussehra: "Lord Rama drawing his bow towards a towering burning effigy of ten-headed Ravana at sunset, a festive crowd and fairground below",
  "karwa-chauth": "a full moon seen through a decorated sieve beside a puja thali with a lit diya, sindoor and bangles, on a terrace at night",
  diwali: "rows of glowing clay diyas, marigold garlands and a colourful rangoli in a courtyard at night, soft fireworks in the distant sky",
  "haryana-day": "green and golden farm fields of Haryana at sunrise, a farmer with a tractor in the distance and a tubewell watering the crop",
  "guru-nanak-jayanti": "the Golden Temple glowing at night with its reflection in the sarovar, rows of lit diyas along the water's edge",
  "childrens-day": "happy Indian school children playing in a sunny green field with kites and colourful balloons, seen from a little distance",
  "kisan-diwas": "an Indian farmer standing proudly in a lush green field at sunrise as water flows from a tubewell into the crop rows",
  christmas: "a decorated Christmas tree with warm lights, stars and gifts beside a window with soft snowfall outside",
};

const clean = (s: string) => s.replace(/\s+/g, " ").trim().slice(0, 200);

/**
 * The prompt for an occasion's picture. `hint` is the owner's own words for what to show; for the
 * custom occasion it is the only description there is.
 */
export function artworkPrompt(occasionId: string, hint = ""): string | null {
  const occasion = occasionId === CUSTOM_OCCASION.id ? CUSTOM_OCCASION : OCCASIONS.find((o) => o.id === occasionId);
  if (!occasion) return null;
  const wish = clean(hint);
  const scene = occasion === CUSTOM_OCCASION ? wish : [SCENES[occasion.id], wish].filter(Boolean).join(". Also: ");
  if (!scene) return null;
  const subject = occasion === CUSTOM_OCCASION ? "an Indian greeting poster" : `an Indian greeting poster for ${occasion.name}`;
  return [
    `Premium, respectful artwork for ${subject}.`,
    `Scene: ${scene}.`,
    "Style: cinematic, richly detailed, warm golden light, the look of a high-end festival poster. Vertical portrait composition.",
    "Keep the top third calm and uncluttered, such as open sky or a soft background, and place the main subject in the middle and lower part of the frame.",
    "Absolutely no text, letters, numbers, logos, watermarks, borders or frames anywhere in the image.",
  ].join(" ");
}

export class ArtworkError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

type FetchLike = (url: string, init: { method: string; headers: Record<string, string>; body: string; signal?: AbortSignal }) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

export const DEFAULT_IMAGE_MODEL = "gpt-image-2.5-flare";

/** Asks OpenAI for one portrait picture and returns it as JPEG bytes. */
export async function generateArtwork(prompt: string, options: { apiKey: string; model?: string; fetch?: FetchLike; signal?: AbortSignal }): Promise<Uint8Array> {
  const call = options.fetch ?? (fetch as unknown as FetchLike);
  let response: Awaited<ReturnType<FetchLike>>;
  try {
    response = await call("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${options.apiKey}` },
      body: JSON.stringify({ model: options.model || DEFAULT_IMAGE_MODEL, prompt, n: 1, size: "1024x1536", quality: "medium", output_format: "jpeg", output_compression: 90 }),
      signal: options.signal,
    });
  } catch {
    throw new ArtworkError("The picture service could not be reached. Please try again.", 502);
  }
  const body = (await response.json().catch(() => null)) as { data?: { b64_json?: string }[]; error?: { message?: string; code?: string } } | null;
  if (!response.ok) {
    const reason = body?.error?.message ?? "";
    if (response.status === 401) throw new ArtworkError("The OpenAI key was not accepted. Check OPENAI_API_KEY in Vercel.", 502);
    if (response.status === 429) throw new ArtworkError("OpenAI is refusing requests right now: the account is out of credit or over its limit.", 502);
    if (response.status === 400 && /safety|moderation|policy/i.test(reason)) throw new ArtworkError("OpenAI declined to draw that. Try different words.", 422);
    throw new ArtworkError(`OpenAI could not make the picture${reason ? `: ${reason.slice(0, 160)}` : "."}`, 502);
  }
  const b64 = body?.data?.[0]?.b64_json;
  if (!b64) throw new ArtworkError("OpenAI answered without a picture. Please try again.", 502);
  return Uint8Array.from(Buffer.from(b64, "base64"));
}
