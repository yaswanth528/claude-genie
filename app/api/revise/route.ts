import { NextResponse } from "next/server";
import { reviseSite } from "@/lib/ai";
import { cleanContent } from "@/lib/draft";
import { findPicture } from "@/lib/images";
import { limit } from "@/lib/ratelimit";
import { LAYOUTS, THEME_IDS, type Product, type Revision, type SiteContent } from "@/lib/schema";

export const maxDuration = 60;

// "Not happy? Say what to change." Takes the website as it is now (a draft on the review
// screen, or the editor's copy of a live site) plus the owner's words, and returns the
// changed website. Nothing is saved here: the owner sees it, then saves or publishes.
export async function POST(req: Request) {
  const stop = await limit(req, "voiceEdit");
  if (stop) return stop;
  const body = (await req.json().catch(() => ({}))) as { content?: unknown; request?: string };
  const request = body.request?.trim() ?? "";
  if (request.length < 3) return NextResponse.json({ error: "Say what you'd like to change." }, { status: 400 });
  if (request.length > 2000) return NextResponse.json({ error: "That's a lot at once. Say one or two changes at a time." }, { status: 400 });
  const { content: site } = cleanContent(body.content);
  if (!site.items.length) return NextResponse.json({ error: "There's no website to change yet." }, { status: 400 });

  try {
    const rev = await reviseSite(site, request);
    const next = await apply(site, rev);
    // Same checks as saving: whatever the model returned, the result is a valid website.
    const { content, errors } = cleanContent(next);
    return NextResponse.json({ content, summary: rev.summary.slice(0, 6), question: rev.question, errors });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Couldn't work out that change. Try saying it another way." }, { status: 502 });
  }
}

async function apply(site: SiteContent, r: Revision): Promise<SiteContent> {
  const next: SiteContent = { ...site, theme: { ...site.theme } };
  const text = (v: string | undefined, max: number) => (v === undefined ? undefined : v.trim().slice(0, max));
  if (r.businessName?.trim()) next.businessName = text(r.businessName, 80)!;
  if (r.headline?.trim()) next.headline = text(r.headline, 120)!;
  if (r.subheadline?.trim()) next.subheadline = text(r.subheadline, 300)!;
  if (r.about !== undefined) next.about = r.about?.trim() ? r.about.trim().slice(0, 1200) : null;
  if (r.highlights) next.highlights = r.highlights.map((h) => h.trim().slice(0, 80)).filter(Boolean).slice(0, 3);
  if (r.themeId && THEME_IDS.includes(r.themeId)) next.theme.id = r.themeId;
  if (r.accent !== undefined && [0, 1, 2].includes(r.accent)) next.theme.accent = r.accent;
  if (r.heroStyle) next.theme.heroStyle = r.heroStyle;
  if (r.layout && LAYOUTS.includes(r.layout)) next.theme.layout = r.layout;
  for (const k of ["area", "address", "hours"] as const) if (r[k] !== undefined) next[k] = r[k]?.trim() || null;
  if (r.festival) next.festival = r.festival.id ? { id: r.festival.id, message: r.festival.message?.trim() || null } : null;

  // Products: updates use the indexes of the current list, so apply them before adds/removals.
  const items: (Product & { newPhoto?: string })[] = site.items.map((it) => ({ ...it }));
  const removed = new Set<number>();
  for (const op of r.items ?? []) {
    const target = op.index !== null && op.index >= 0 && op.index < items.length ? items[op.index] : null;
    if (op.op === "remove" && target) removed.add(op.index!);
    if (op.op === "update" && target) Object.assign(target, fields(op));
    if (op.op === "add" && op.name?.trim())
      items.push({ name: "", price: null, unit: null, lowConfidence: false, description: "", image: null, inStock: true, ...fields(op) });
  }
  const kept = items.filter((_, i) => !removed.has(i));

  // New photos the owner asked for, searched in parallel.
  const used = new Set<string>([site.hero?.url, ...site.items.map((i) => i.image?.url)].filter((u): u is string => !!u));
  await Promise.all([
    r.newHeroPhoto
      ? findPicture({ prompt: `${r.newHeroPhoto}, wide inviting photo, India`, query: r.newHeroPhoto, aspect: "16:9", alt: site.category, used }).then((m) => {
          if (m) next.hero = m;
        })
      : null,
    ...kept
      .filter((it) => it.newPhoto)
      .slice(0, 6)
      .map((it) =>
        findPicture({ prompt: `${it.newPhoto}, product photo, clean background`, query: it.newPhoto!, aspect: "1:1", alt: it.name, name: it.name, used }).then((m) => {
          if (m) it.image = m;
        }),
      ),
  ]);
  next.items = kept.map(({ newPhoto: _n, ...it }) => it);
  return next;
}

type ItemOp = NonNullable<Revision["items"]>[number];
function fields(op: ItemOp): Partial<Product> & { newPhoto?: string } {
  const f: Partial<Product> & { newPhoto?: string } = {};
  if (op.name?.trim()) f.name = op.name.trim();
  if (op.price !== undefined) f.price = op.price;
  if (op.price !== undefined && op.price !== null) f.lowConfidence = false;
  if (op.unit !== undefined) f.unit = op.unit?.trim() || null;
  if (op.description !== undefined) f.description = op.description.trim();
  if (op.category !== undefined) f.category = op.category?.trim() || null;
  if (op.badge !== undefined) f.badge = op.badge;
  if (op.inStock !== undefined) f.inStock = op.inStock;
  if (op.askPrice !== undefined) {
    f.askPrice = op.askPrice;
    if (op.askPrice) f.price = null;
  }
  if (op.newPhoto?.trim()) f.newPhoto = op.newPhoto.trim();
  return f;
}
