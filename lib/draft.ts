// Checks and cleans a website draft coming from the browser before it is saved.
import { normaliseWhatsapp, validateItems } from "./catalogue";
import { THEME_IDS, type Draft, type Media, type Product, type SiteContent } from "./schema";

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const optStr = (v: unknown, max: number) => str(v, max) || null;

export const isMediaUrl = (url: unknown): url is string =>
  typeof url === "string" &&
  (/^\/api\/media\/[a-z0-9-]+\.[a-z0-9]{2,5}$/.test(url) ||
    /^https:\/\/[a-z0-9.-]+\.public\.blob\.vercel-storage\.com\/[\w./-]+$/.test(url) ||
    /^https:\/\/images\.pexels\.com\/photos\/[\w./?=&%-]+$/.test(url));

function media(v: unknown): Media | null {
  const m = v as Media;
  if (!m || !isMediaUrl(m.url) || (m.kind !== "image" && m.kind !== "video")) return null;
  return { url: m.url, kind: m.kind, generated: Boolean(m.generated), alt: str(m.alt, 120), credit: optStr(m.credit, 120) };
}

function product(v: unknown): Product {
  const p = v as Product;
  const price = typeof p?.price === "number" && Number.isFinite(p.price) ? Math.round(p.price * 100) / 100 : null;
  const image = media(p?.image);
  return {
    name: str(p?.name, 80),
    price,
    unit: optStr(p?.unit, 30),
    lowConfidence: false,
    description: str(p?.description, 200),
    image: image?.kind === "image" ? image : null,
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
  };
  const errors = validateItems(items);
  if (!content.businessName) errors.unshift("Add your business name.");
  if (!content.headline) content.headline = content.businessName;
  return { content, errors };
}

export function cleanDraft(input: unknown): { content: SiteContent; whatsapp: string | null; errors: string[] } {
  const { content, errors } = cleanContent(input);
  const whatsapp = normaliseWhatsapp(str((input as Draft)?.whatsapp, 20));
  if (!whatsapp) errors.unshift("Add a valid WhatsApp number.");
  return { content, whatsapp, errors };
}
