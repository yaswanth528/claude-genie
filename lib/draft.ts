// Checks and cleans a website draft coming from the browser before it is saved.
import { normaliseWhatsapp, validateItems } from "./catalogue";
import { THEME_IDS, TranslationSchema, type Delivery, type Draft, type Media, type Product, type SiteContent, type Translation } from "./schema";

// UPI IDs look like name@bank (e.g. lakshmi.silks@okaxis).
export const UPI_RE = /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z][a-zA-Z0-9.-]{1,64}$/;

// A Google Maps / reviews link, as copied from the Maps app ("Share") or Google Business.
export const REVIEWS_RE = /^https:\/\/(maps\.app\.goo\.gl|goo\.gl|g\.page|g\.co|search\.google\.com|(www\.|maps\.)?google\.[a-z.]{2,8})\/[^\s<>"']{0,500}$/;

const rupees = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.min(Math.round(v), 1_000_000) : null);

function delivery(v: unknown): Delivery | null {
  const d = v as Delivery;
  if (!d || typeof d !== "object") return null;
  const out: Delivery = { areas: optStr(d.areas, 200), charge: rupees(d.charge), freeAbove: rupees(d.freeAbove), minOrder: rupees(d.minOrder) };
  return out.areas || out.charge || out.freeAbove || out.minOrder ? out : null;
}

function translation(v: unknown): Translation | null {
  const t = v as Translation;
  if (!t || typeof t.language !== "string" || typeof t.label !== "string") return null;
  const parsed = TranslationSchema.safeParse(t);
  if (!parsed.success) return null;
  const clip = (x: string | null, n: number) => (x === null ? null : x.slice(0, n));
  const d = parsed.data;
  return {
    language: t.language.slice(0, 30),
    label: t.label.slice(0, 30),
    businessName: d.businessName.slice(0, 80),
    category: d.category.slice(0, 80),
    headline: d.headline.slice(0, 160),
    subheadline: d.subheadline.slice(0, 400),
    about: clip(d.about, 1600),
    highlights: d.highlights.slice(0, 3).map((h) => h.slice(0, 120)),
    area: clip(d.area, 120),
    hours: clip(d.hours, 160),
    items: d.items.slice(0, 60).map((i) => ({ name: i.name.slice(0, 120), description: i.description.slice(0, 300), optionName: clip(i.optionName, 40), options: i.options.slice(0, 12).map((o) => o.slice(0, 40)) })),
    categories: d.categories.slice(0, 30).map((c) => ({ from: c.from.slice(0, 40), to: c.to.slice(0, 60) })),
    ui: Object.fromEntries(Object.entries(d.ui).slice(0, 60).map(([k, v]) => [k.slice(0, 30), v.slice(0, 120)])),
  };
}

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const optStr = (v: unknown, max: number) => str(v, max) || null;

export const isMediaUrl = (url: unknown): url is string =>
  typeof url === "string" &&
  (/^\/api\/media\/[a-z0-9-]+\.[a-z0-9]{2,5}$/.test(url) ||
    /^https:\/\/[a-z0-9.-]+\.public\.blob\.vercel-storage\.com\/[\w./-]+$/.test(url) ||
    /^https:\/\/images\.pexels\.com\/photos\/[\w./?=&%-]+$/.test(url) ||
    /^https:\/\/images\.unsplash\.com\/[\w./?=&%-]+$/.test(url));

function media(v: unknown): Media | null {
  const m = v as Media;
  if (!m || !isMediaUrl(m.url) || (m.kind !== "image" && m.kind !== "video")) return null;
  return { url: m.url, kind: m.kind, generated: Boolean(m.generated), alt: str(m.alt, 120), credit: optStr(m.credit, 120) };
}

function product(v: unknown): Product {
  const p = v as Product;
  const price = typeof p?.price === "number" && Number.isFinite(p.price) ? Math.round(p.price * 100) / 100 : null;
  const image = media(p?.image);
  const options = Array.isArray(p?.options) ? [...new Set(p.options.map((o) => str(o, 30)).filter(Boolean))].slice(0, 12) : [];
  return {
    name: str(p?.name, 80),
    price,
    unit: optStr(p?.unit, 30),
    lowConfidence: false,
    description: str(p?.description, 200),
    image: image?.kind === "image" ? image : null,
    category: optStr(p?.category, 40),
    optionName: options.length ? optStr(p?.optionName, 30) ?? "Option" : null,
    options,
    inStock: p?.inStock !== false,
  };
}

export function cleanContent(input: unknown): { content: SiteContent; errors: string[] } {
  const d = (input ?? {}) as Partial<Draft>;
  const items = Array.isArray(d.items) ? d.items.slice(0, 60).map(product) : [];
  const themeId = THEME_IDS.includes(d.theme?.id as never) ? d.theme!.id : "bazaar";
  const content: SiteContent = {
    businessName: str(d.businessName, 80),
    category: str(d.category, 80),
    language: str(d.language, 40),
    siteType: d.siteType === "dynamic" ? "dynamic" : "static",
    theme: {
      id: themeId,
      accent: [0, 1, 2].includes(d.theme?.accent as number) ? d.theme!.accent : 0,
      heroStyle: d.theme?.heroStyle === "split" ? "split" : "full",
    },
    headline: str(d.headline, 120),
    subheadline: str(d.subheadline, 300),
    about: optStr(d.about, 1200),
    highlights: Array.isArray(d.highlights) ? d.highlights.map((h) => str(h, 80)).filter(Boolean).slice(0, 3) : [],
    area: optStr(d.area, 80),
    address: optStr(d.address, 300),
    hours: optStr(d.hours, 120),
    hero: media(d.hero),
    gallery: Array.isArray(d.gallery) ? d.gallery.map(media).filter((m): m is Media => m !== null).slice(0, 24) : [],
    items,
    translation: translation(d.translation),
    upiId: typeof d.upiId === "string" && UPI_RE.test(d.upiId.trim()) ? d.upiId.trim() : null,
    delivery: delivery(d.delivery),
    reviewsUrl: typeof d.reviewsUrl === "string" && REVIEWS_RE.test(d.reviewsUrl.trim()) ? d.reviewsUrl.trim() : null,
  };
  const errors = validateItems(items);
  if (typeof d.upiId === "string" && d.upiId.trim() && !content.upiId) errors.push("The UPI ID doesn't look right. It should look like name@bank.");
  if (typeof d.reviewsUrl === "string" && d.reviewsUrl.trim() && !content.reviewsUrl)
    errors.push("The Google reviews link doesn't look right. In Google Maps, open your shop, tap Share and copy the link.");
  if (!content.businessName) errors.unshift("Add your business name.");
  if (!content.headline) content.headline = content.businessName;
  return { content, errors };
}

export function cleanDraft(input: unknown): { content: SiteContent; whatsapp: string | null; ownerEmail: string | null; errors: string[] } {
  const { content, errors } = cleanContent(input);
  const whatsapp = normaliseWhatsapp(str((input as Draft)?.whatsapp, 20));
  if (!whatsapp) errors.unshift("Add a valid WhatsApp number.");
  const email = str((input as { ownerEmail?: string })?.ownerEmail, 120).toLowerCase();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("That email address doesn't look right.");
  return { content, whatsapp, ownerEmail: email || null, errors };
}
