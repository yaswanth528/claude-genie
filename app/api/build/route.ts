import { NextResponse } from "next/server";
import { generateImage, planSite, type UploadedMedia } from "@/lib/ai";
import { saveMedia } from "@/lib/media";
import { THEME_IDS, type Draft, type Media } from "@/lib/schema";

export const maxDuration = 120; // planning + parallel image generation

const MAX_UPLOADS = 12;
const MAX_GENERATED = 8; // hero + up to 7 product pictures

function validMedia(m: unknown): m is UploadedMedia {
  const x = m as UploadedMedia;
  return (
    typeof x?.url === "string" &&
    (x.url.startsWith("/api/media/") || /^https:\/\/[a-z0-9.-]+\.public\.blob\.vercel-storage\.com\//.test(x.url)) &&
    (x.kind === "image" || x.kind === "video") &&
    typeof x.name === "string"
  );
}

// Turn what the owner said (plus any uploads) into a full website draft for review.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { transcript?: string; media?: unknown[]; generateImages?: boolean };
  const transcript = body.transcript?.trim() ?? "";
  if (transcript.length < 5) return NextResponse.json({ error: "Say or type a bit more about your business." }, { status: 400 });
  if (transcript.length > 6000) return NextResponse.json({ error: "That's too long. About 20–60 seconds is enough." }, { status: 400 });
  const uploads = (body.media ?? []).filter(validMedia).slice(0, MAX_UPLOADS).map((m) => ({ ...m, name: m.name.slice(0, 80) }));
  const allowGenerated = body.generateImages !== false;

  try {
    const plan = await planSite(transcript, uploads);

    // Map the model's photo choices onto real uploads, using each upload at most once.
    const used = new Set<number>();
    const take = (i: number | null): Media | null => {
      if (i === null || !Number.isInteger(i) || i < 0 || i >= uploads.length || used.has(i)) return null;
      used.add(i);
      const u = uploads[i];
      return { url: u.url, kind: u.kind, generated: false, alt: u.name };
    };

    const hero = take(plan.heroMediaIndex);
    const gallery: Media[] = [];
    // Keep a unit only if its words were actually spoken (the model sometimes adds "per piece").
    const spoken = transcript.toLowerCase();
    const unitSaid = (unit: string | null) =>
      unit && unit.toLowerCase().replace(/\bper\b/g, "").split(/\W+/).filter(Boolean).some((w) => spoken.includes(w)) ? unit : null;
    const items = plan.items.map(({ mediaIndex, imagePrompt, ...it }) => {
      it.unit = unitSaid(it.unit);
      const m = take(mediaIndex);
      // A video matched to a product is better shown in the gallery.
      if (m?.kind === "video") gallery.push(m);
      return { ...it, image: m?.kind === "image" ? { ...m, alt: it.name } : null, imagePrompt };
    });
    plan.galleryMediaIndexes.map(take).forEach((m) => m && gallery.push(m));
    uploads.forEach((u, i) => {
      if (!used.has(i)) gallery.push({ url: u.url, kind: u.kind, generated: false, alt: u.name });
    });

    // Fill empty slots with AI illustrations, in parallel.
    const jobs: Promise<void>[] = [];
    let heroMedia = hero;
    if (allowGenerated && !heroMedia) {
      jobs.push(
        generateImage(plan.heroImagePrompt, "16:9").then(async (bytes) => {
          if (bytes) heroMedia = { url: await saveMedia(bytes, "image/jpeg", "generated"), kind: "image", generated: true, alt: plan.category };
        }),
      );
    }
    if (allowGenerated) {
      items
        .filter((it) => !it.image)
        .slice(0, MAX_GENERATED - (heroMedia ? 0 : 1))
        .forEach((it) =>
          jobs.push(
            generateImage(it.imagePrompt, "1:1").then(async (bytes) => {
              if (bytes) it.image = { url: await saveMedia(bytes, "image/jpeg", "generated"), kind: "image", generated: true, alt: it.name };
            }),
          ),
        );
    }
    await Promise.all(jobs);

    const draft: Draft = {
      businessName: plan.businessName ?? "",
      category: plan.category,
      language: plan.language,
      siteType: "static",
      theme: {
        id: THEME_IDS.includes(plan.themeId) ? plan.themeId : "bazaar",
        accent: [0, 1, 2].includes(plan.accent) ? plan.accent : 0,
        heroStyle: plan.heroStyle,
      },
      headline: plan.headline,
      subheadline: plan.subheadline,
      about: plan.about,
      highlights: plan.highlights.slice(0, 3),
      area: plan.area,
      address: plan.address,
      hours: plan.hours,
      hero: heroMedia,
      gallery,
      items: items.map(({ imagePrompt: _p, ...it }) => it),
      whatsapp: "",
    };
    return NextResponse.json(draft);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: (err as Error).message || "Couldn't build the website" }, { status: 502 });
  }
}
