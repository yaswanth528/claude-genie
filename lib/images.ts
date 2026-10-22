// Pictures for slots the owner didn't fill. Sources, in order: a Gemini illustration (only
// with GEMINI_IMAGES=on — free-tier keys can't generate images), Unsplash
// (UNSPLASH_ACCESS_KEY), Pixabay (PIXABAY_API_KEY), Pexels (PEXELS_API_KEY). With none
// available the site uses its photo-free design.
//
// Matching is deterministic (no AI calls, so it stays fast on a free Gemini key): each
// source returns several candidates and we keep the one whose description/tags best
// match the product, skipping photos already used elsewhere on the same site.
import { generateImage } from "./ai";
import { saveMedia } from "./media";
import type { Media } from "./schema";

type Aspect = "16:9" | "1:1";
type Candidate = { id: string; text: string; use: () => Promise<Media | null> };
type Opts = { prompt: string; query: string; aspect: Aspect; alt: string; name?: string; used?: Set<string> };

let geminiImagesOffUntil = 0;

async function fromGemini(o: Opts): Promise<Media | null> {
  if (process.env.GEMINI_IMAGES !== "on" || Date.now() < geminiImagesOffUntil) return null;
  const result = await generateImage(o.prompt, o.aspect);
  if (result === "quota") {
    geminiImagesOffUntil = Date.now() + 30 * 60 * 1000;
    return null;
  }
  if (!result) return null;
  return { url: await saveMedia(result, "image/jpeg", "generated"), kind: "image", generated: true, alt: o.alt, credit: null };
}

const words = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .map((w) => w.replace(/(es|s)$/, "")); // tomatoes ~ tomato, kurtis ~ kurti

// How well a photo's text matches what we're looking for. Product-name words count double.
function score(candidate: string, o: Opts): number {
  const have = new Set(words(candidate));
  const want = words(o.query);
  const name = words(o.name ?? "");
  return want.filter((w) => have.has(w)).length + 2 * name.filter((w) => have.has(w)).length;
}

async function pick(cands: Candidate[], o: Opts): Promise<Media | null> {
  const fresh = cands.filter((c) => !o.used?.has(c.id));
  if (!fresh.length) return null;
  // Highest score wins; ties keep the source's own ranking.
  const best = fresh.map((c, i) => ({ c, s: score(c.text, o), i })).sort((a, b) => b.s - a.s || a.i - b.i)[0].c;
  o.used?.add(best.id);
  return best.use();
}

type UnsplashPhoto = {
  id: string;
  alt_description: string | null;
  description: string | null;
  tags?: { title: string }[];
  urls: { regular: string };
  user: { name: string };
  links: { download_location: string };
};

// Unsplash API rules: hotlink from images.unsplash.com, credit the photographer, and ping
// download_location when a photo is used.
async function fromUnsplash(o: Opts): Promise<Media | null> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key || !o.query.trim()) return null;
  const headers = { Authorization: `Client-ID ${key}`, "Accept-Version": "v1" };
  try {
    const res = await fetch(
      `https://api.unsplash.com/search/photos?${new URLSearchParams({
        query: o.query.slice(0, 80),
        per_page: "8",
        orientation: o.aspect === "16:9" ? "landscape" : "squarish",
        content_filter: "high",
      })}`,
      { headers },
    );
    if (!res.ok) {
      console.error("Unsplash search failed:", res.status);
      return null;
    }
    const photos = ((await res.json()) as { results?: UnsplashPhoto[] }).results ?? [];
    return pick(
      photos.map((p) => ({
        id: `unsplash:${p.id}`,
        text: [p.alt_description, p.description, ...(p.tags ?? []).map((t) => t.title)].filter(Boolean).join(" "),
        use: async () => {
          fetch(p.links.download_location, { headers }).catch(() => {}); // required "download" event
          const url = `${p.urls.regular}${p.urls.regular.includes("?") ? "&" : "?"}w=${o.aspect === "16:9" ? 1600 : 900}`;
          return { url, kind: "image" as const, generated: true, alt: o.alt, credit: `Photo: ${p.user.name} / Unsplash` };
        },
      })),
      o,
    );
  } catch (err) {
    console.error("Unsplash failed:", (err as Error).message);
    return null;
  }
}

type PixabayHit = { id: number; largeImageURL: string; tags: string; user: string };

// Pixabay: free key, commercial use allowed. Their terms ask apps to store the image
// rather than hotlink it, so the chosen one is copied into our media storage.
async function fromPixabay(o: Opts): Promise<Media | null> {
  const key = process.env.PIXABAY_API_KEY;
  if (!key || !o.query.trim()) return null;
  try {
    const res = await fetch(
      `https://pixabay.com/api/?${new URLSearchParams({
        key,
        q: o.query.slice(0, 90),
        image_type: "photo",
        orientation: o.aspect === "16:9" ? "horizontal" : "all",
        safesearch: "true",
        per_page: "8",
      })}`,
    );
    if (!res.ok) {
      console.error("Pixabay search failed:", res.status);
      return null;
    }
    const hits = ((await res.json()) as { hits?: PixabayHit[] }).hits ?? [];
    return pick(
      hits.map((h) => ({
        id: `pixabay:${h.id}`,
        text: h.tags,
        use: async () => {
          const img = await fetch(h.largeImageURL);
          if (!img.ok) return null;
          const url = await saveMedia(Buffer.from(await img.arrayBuffer()), "image/jpeg", "generated");
          return { url, kind: "image" as const, generated: true, alt: o.alt, credit: `Photo: ${h.user} / Pixabay` };
        },
      })),
      o,
    );
  } catch (err) {
    console.error("Pixabay failed:", (err as Error).message);
    return null;
  }
}

type PexelsPhoto = { id: number; alt: string; photographer: string; src: { large: string; landscape: string } };

async function fromPexels(o: Opts): Promise<Media | null> {
  const key = process.env.PEXELS_API_KEY;
  if (!key || !o.query.trim()) return null;
  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?${new URLSearchParams({
        query: o.query.slice(0, 80),
        per_page: "8",
        orientation: o.aspect === "16:9" ? "landscape" : "square",
      })}`,
      { headers: { Authorization: key } },
    );
    if (!res.ok) {
      console.error("Pexels search failed:", res.status);
      return null;
    }
    const photos = ((await res.json()) as { photos?: PexelsPhoto[] }).photos ?? [];
    return pick(
      photos.map((p) => ({
        id: `pexels:${p.id}`,
        text: p.alt,
        use: async () => ({
          url: o.aspect === "16:9" ? p.src.landscape : p.src.large,
          kind: "image" as const,
          generated: true,
          alt: o.alt,
          credit: `Photo: ${p.photographer} / Pexels`,
        }),
      })),
      o,
    );
  } catch (err) {
    console.error("Pexels failed:", (err as Error).message);
    return null;
  }
}

export async function findPicture(o: Opts): Promise<Media | null> {
  return (await fromGemini(o)) ?? (await fromUnsplash(o)) ?? (await fromPixabay(o)) ?? (await fromPexels(o));
}
