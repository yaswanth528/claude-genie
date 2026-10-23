import { NextResponse } from "next/server";
import { reviseSite } from "@/lib/ai";
import { formatPrice } from "@/lib/catalogue";
import { cleanContent } from "@/lib/draft";
import { findPicture } from "@/lib/images";
import { limit } from "@/lib/ratelimit";
import { FESTIVALS, LAYOUTS, THEME_IDS, type Product, type Revision, type SiteContent } from "@/lib/schema";
import { THEMES } from "@/lib/themes";

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
    // Same checks as saving: whatever the model returned, the result is a valid website.
    const { content, errors } = cleanContent(await apply(site, rev));
    // The summary is worked out from what really changed, not from what the model says it did.
    const summary = describe(site, content);
    return NextResponse.json({ content, summary, question: rev.question, errors });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Couldn't work out that change. Try saying it another way." }, { status: 502 });
  }
}

// null = leave as it is; "" = clear (for optional texts).
const txt = (v: string | null, max: number) => (v === null ? undefined : v.trim().slice(0, max));
const opt = (v: string | null, max: number) => (v === null ? undefined : v.trim().slice(0, max) || null);

async function apply(site: SiteContent, r: Revision): Promise<SiteContent> {
  const next: SiteContent = { ...site, theme: { ...site.theme } };
  const set = <K extends keyof SiteContent>(k: K, v: SiteContent[K] | undefined) => {
    if (v !== undefined) next[k] = v;
  };
  if (txt(r.businessName, 80)) set("businessName", txt(r.businessName, 80));
  if (txt(r.headline, 120)) set("headline", txt(r.headline, 120));
  if (txt(r.subheadline, 300)) set("subheadline", txt(r.subheadline, 300));
  set("about", opt(r.about, 1200));
  if (r.highlights) next.highlights = r.highlights.map((h) => h.trim().slice(0, 80)).filter(Boolean).slice(0, 3);
  if (r.themeId && THEME_IDS.includes(r.themeId)) next.theme.id = r.themeId;
  if (r.accent !== null && [0, 1, 2].includes(r.accent)) next.theme.accent = r.accent;
  if (r.heroStyle) next.theme.heroStyle = r.heroStyle;
  if (r.layout && LAYOUTS.includes(r.layout)) next.theme.layout = r.layout;
  set("area", opt(r.area, 80));
  set("address", opt(r.address, 300));
  set("hours", opt(r.hours, 120));
  if (r.festival === "none") next.festival = null;
  else if (r.festival && FESTIVALS.includes(r.festival)) next.festival = { id: r.festival, message: opt(r.festivalMessage, 100) ?? site.festival?.message ?? null };
  else if (r.festivalMessage !== null && next.festival) next.festival = { ...next.festival, message: opt(r.festivalMessage, 100) ?? null };

  // Products: updates use the indexes of the current list, so apply them before adds/removals.
  const items: (Product & { newPhoto?: string })[] = site.items.map((it) => ({ ...it }));
  const removed = new Set<number>();
  for (const op of r.items) {
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
    r.newHeroPhoto?.trim()
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

type ItemOp = Revision["items"][number];
function fields(op: ItemOp): Partial<Product> & { newPhoto?: string } {
  const f: Partial<Product> & { newPhoto?: string } = {};
  if (op.name?.trim()) f.name = op.name.trim().slice(0, 80);
  if (op.price !== null && op.price >= 0) Object.assign(f, { price: op.price, lowConfidence: false, askPrice: false });
  if (op.unit !== null) f.unit = op.unit.trim().slice(0, 30) || null;
  if (op.description !== null) f.description = op.description.trim().slice(0, 200);
  if (op.category !== null) f.category = op.category.trim().slice(0, 40) || null;
  if (op.badge !== null) f.badge = op.badge === "none" ? null : op.badge;
  if (op.inStock !== null) f.inStock = op.inStock;
  if (op.askPrice !== null) {
    f.askPrice = op.askPrice;
    if (op.askPrice) f.price = null;
  }
  if (op.newPhoto?.trim()) f.newPhoto = op.newPhoto.trim();
  return f;
}

// Plain lines for the owner: what is different now.
function describe(a: SiteContent, b: SiteContent): string[] {
  const out: string[] = [];
  if (a.businessName !== b.businessName) out.push(`Business name: ${b.businessName}`);
  if (a.headline !== b.headline) out.push(`New headline: “${b.headline}”`);
  if (a.subheadline !== b.subheadline) out.push("New line under the headline");
  if (a.about !== b.about) out.push(b.about ? (a.about ? "Rewrote the About section" : "Added an About section") : "Removed the About section");
  if (JSON.stringify(a.highlights) !== JSON.stringify(b.highlights)) out.push("Updated the highlights");
  if (a.theme.id !== b.theme.id) out.push(`New look: ${THEMES[b.theme.id].label}`);
  else if (a.theme.accent !== b.theme.accent) out.push(`New colours: ${THEMES[b.theme.id].palettes[b.theme.accent]?.name ?? "updated"}`);
  if (a.theme.heroStyle !== b.theme.heroStyle) out.push(b.theme.heroStyle === "full" ? "Banner: big photo" : "Banner: side by side");
  if ((a.theme.layout ?? "grid") !== (b.theme.layout ?? "grid")) out.push(`Products shown as: ${b.theme.layout}`);
  if (a.hero?.url !== b.hero?.url) out.push("New banner photo");
  for (const k of ["area", "address", "hours"] as const) if (a[k] !== b[k]) out.push(b[k] ? `${k[0].toUpperCase()}${k.slice(1)}: ${b[k]}` : `Removed the ${k}`);
  if (JSON.stringify(a.festival ?? null) !== JSON.stringify(b.festival ?? null)) out.push(b.festival ? "Festival banner updated" : "Removed the festival banner");

  const before = new Map(a.items.map((i) => [i.name.toLowerCase(), i]));
  const after = new Set(b.items.map((i) => i.name.toLowerCase()));
  a.items.forEach((x, i) => {
    const y = b.items[i];
    if (!after.has(x.name.toLowerCase()) && !(y && b.items.length === a.items.length)) out.push(`Removed ${x.name}`);
  });
  b.items.forEach((y, i) => {
    const x = before.get(y.name.toLowerCase()) ?? (b.items.length === a.items.length ? a.items[i] : undefined);
    if (!x) return out.push(`Added ${y.name}${y.askPrice ? " (price on request)" : y.price !== null ? ` at ${formatPrice(y.price)}` : ""}`);
    const c: string[] = [];
    if (x.name !== y.name) c.push(`renamed from ${x.name}`);
    if (!!x.askPrice !== !!y.askPrice) c.push(y.askPrice ? "price on request" : `price ${formatPrice(y.price)}`);
    else if (x.price !== y.price) c.push(`price ${formatPrice(y.price)}`);
    if (x.description !== y.description) c.push("new description");
    if ((x.badge ?? null) !== (y.badge ?? null)) c.push(y.badge ? `tagged ${y.badge}` : "tag removed");
    if ((x.inStock !== false) !== (y.inStock !== false)) c.push(y.inStock === false ? "out of stock" : "back in stock");
    if ((x.category ?? null) !== (y.category ?? null)) c.push(y.category ? `category ${y.category}` : "no category");
    if (x.image?.url !== y.image?.url) c.push("new photo");
    if (c.length) out.push(`${y.name}: ${c.join(", ")}`);
  });
  return out.slice(0, 12);
}
