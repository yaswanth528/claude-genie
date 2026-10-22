// Pictures for slots the owner didn't fill, in order: a Gemini illustration (when the key
// allows image generation), a free Pixabay photo (PIXABAY_API_KEY), a Pexels photo
// (PEXELS_API_KEY). With none available the site uses its photo-free design.
import { generateImage } from "./ai";
import { saveMedia } from "./media";
import type { Media } from "./schema";

// Free-tier Gemini keys allow zero image generations. After a quota error, skip Gemini
// for a while instead of failing on every picture.
let geminiImagesOffUntil = 0;

async function fromGemini(prompt: string, aspect: "16:9" | "1:1", alt: string): Promise<Media | null> {
  if (process.env.GEMINI_IMAGES === "off" || Date.now() < geminiImagesOffUntil) return null;
  const result = await generateImage(prompt, aspect);
  if (result === "quota") {
    geminiImagesOffUntil = Date.now() + 30 * 60 * 1000;
    return null;
  }
  if (!result) return null;
  return { url: await saveMedia(result, "image/jpeg", "generated"), kind: "image", generated: true, alt, credit: null };
}

type PexelsPhoto = { alt: string; photographer: string; src: { large: string; large2x: string; landscape: string } };

async function fromPexels(query: string, aspect: "16:9" | "1:1", alt: string): Promise<Media | null> {
  const key = process.env.PEXELS_API_KEY;
  if (!key || !query.trim()) return null;
  try {
    const url = `https://api.pexels.com/v1/search?${new URLSearchParams({
      query: query.slice(0, 80),
      per_page: "1",
      orientation: aspect === "16:9" ? "landscape" : "square",
    })}`;
    const res = await fetch(url, { headers: { Authorization: key } });
    if (!res.ok) {
      console.error("Pexels search failed:", res.status);
      return null;
    }
    const photo = ((await res.json()) as { photos?: PexelsPhoto[] }).photos?.[0];
    if (!photo) return null;
    return {
      url: aspect === "16:9" ? photo.src.landscape : photo.src.large,
      kind: "image",
      generated: true,
      alt: photo.alt || alt,
      credit: `Photo: ${photo.photographer} / Pexels`,
    };
  } catch (err) {
    console.error("Pexels search failed:", (err as Error).message);
    return null;
  }
}

type PixabayHit = { largeImageURL: string; tags: string; user: string };

// Pixabay: free key, commercial use allowed, no credit required. Their terms ask apps to
// store the image rather than hotlink it, so it's copied into our media storage.
async function fromPixabay(query: string, aspect: "16:9" | "1:1", alt: string): Promise<Media | null> {
  const key = process.env.PIXABAY_API_KEY;
  if (!key || !query.trim()) return null;
  try {
    const url = `https://pixabay.com/api/?${new URLSearchParams({
      key,
      q: query.slice(0, 90),
      image_type: "photo",
      orientation: aspect === "16:9" ? "horizontal" : "all",
      safesearch: "true",
      per_page: "3",
    })}`;
    const res = await fetch(url);
    if (!res.ok) {
      console.error("Pixabay search failed:", res.status);
      return null;
    }
    const hit = ((await res.json()) as { hits?: PixabayHit[] }).hits?.[0];
    if (!hit) return null;
    const img = await fetch(hit.largeImageURL);
    if (!img.ok) return null;
    const saved = await saveMedia(Buffer.from(await img.arrayBuffer()), "image/jpeg", "generated");
    return { url: saved, kind: "image", generated: true, alt, credit: `Photo: ${hit.user} / Pixabay` };
  } catch (err) {
    console.error("Pixabay failed:", (err as Error).message);
    return null;
  }
}

export async function findPicture(opts: { prompt: string; query: string; aspect: "16:9" | "1:1"; alt: string }): Promise<Media | null> {
  return (
    (await fromGemini(opts.prompt, opts.aspect, opts.alt)) ??
    (await fromPixabay(opts.query, opts.aspect, opts.alt)) ??
    (await fromPexels(opts.query, opts.aspect, opts.alt))
  );
}
