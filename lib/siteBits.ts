// Small pieces shared by SiteView (app) and the standalone page, so both render the same.
import type { UiText } from "./i18n";
import type { Badge, FestivalId, Media } from "./schema";

export const FEST_ICON: Record<FestivalId, string> = {
  diwali: "🪔",
  navratri: "🪷",
  ganesh: "🌺",
  holi: "🎨",
  eid: "🌙",
  christmas: "🎄",
  pongal: "🌾",
  onam: "🌼",
  ugadi: "🌿",
  newyear: "✨",
};

export const festGreeting = (id: FestivalId, u: UiText) => u[`fest_${id}` as keyof UiText];

export const badgeLabel = (b: Badge, u: UiText) => (b === "bestseller" ? u.bestseller : b === "new" ? u.newTag : u.offer);

// The owner's own photos are shown whole (on a blurred backdrop); stock photos fill the box.
export const isFramed = (m: Media | null | undefined) => !!m && m.kind === "image" && !m.generated;

// Search shows once a shop has this many products.
export const SEARCH_MIN = 8;

// CSS value for the blurred backdrop. Media URLs are checked on save (lib/draft.ts → isMediaUrl).
export const cssUrl = (url: string) => `url("${url.replace(/["\\\n]/g, "")}")`;

// ---------- Showcase (static) vs store (dynamic) ----------

type Shop = {
  siteType: "static" | "dynamic";
  hero: Media | null;
  items: { name: string; image: Media | null; category?: string | null }[];
  delivery?: { areas: string | null; charge: number | null; freeAbove: number | null; minOrder: number | null } | null;
  upiId?: string | null;
};

const rupee = (n: number) => `₹${n.toLocaleString("en-IN")}`;

// The thin bar above a store's header: real delivery facts, or how ordering works.
export function storeBar(s: Shop, u: UiText): string {
  const d = s.delivery;
  const parts = [d?.areas ? `${u.perkDelivery} ${d.areas}` : null, d?.freeAbove ? `${u.freeAbove} ${rupee(d.freeAbove)}` : null].filter(Boolean);
  return parts.length ? parts.join(" · ") : u.storeBar;
}

// Store perks under the hero buttons. Only things the website really does or the owner set.
export function storePerks(s: Shop, u: UiText): { icon: string; text: string }[] {
  return [
    { icon: "🛒", text: u.perkOnline },
    s.delivery?.areas ? { icon: "🚚", text: `${u.perkDelivery} ${s.delivery.areas}` } : null,
    { icon: "📲", text: u.perkTrack },
    s.upiId ? { icon: "₹", text: u.perkUpi } : null,
  ].filter((p): p is { icon: string; text: string } => !!p);
}

// Every product is "Price on request" (manufacturers, custom work): customers ask, not add.
export const quoteOnly = (items: { askPrice?: boolean }[]) => items.length > 0 && items.every((i) => i.askPrice);

export function howSteps(dynamic: boolean, u: UiText, quote = false): { title: string; heading: string; body: string }[] {
  const k = quote ? "howQuote" : dynamic ? "howStore" : "howShow";
  return [1, 2, 3].map((n) => ({
    title: u[k as keyof UiText],
    heading: u[`${k}${n}` as keyof UiText],
    body: u[`${k}${n}b` as keyof UiText],
  }));
}

// No banner photo: show the shop's own product photos instead (owner's photos first).
export function heroMosaic(s: Shop): Media[] {
  if (s.hero) return [];
  const imgs = s.items.map((i) => i.image).filter((m): m is Media => !!m && m.kind === "image");
  const ordered = [...imgs.filter((m) => !m.generated), ...imgs.filter((m) => m.generated)];
  return ordered.length >= 2 ? ordered.slice(0, 3) : [];
}

export const askText = (name: string, price: string | null) => `Hi, I'm interested in ${name}${price ? ` (${price})` : ""}. Is it available?`;

// Facts beside the About text when there's no photo: only what the website already knows.
export function aboutFacts(
  L: { area: string | null; hours: string | null; items: { categoryLabel: string | null }[] },
  count: number,
  categoryCount: number,
  u: UiText,
): [string, string][] {
  const range = [...new Set(L.items.map((i) => i.categoryLabel).filter((c): c is string => !!c))].join(", ");
  return [
    L.area ? [u.area, L.area] : null,
    L.hours ? [u.hours, L.hours] : null,
    categoryCount > 1 && range ? [u.factRange, range] : null,
  ].filter((f): f is [string, string] => !!f);
}
