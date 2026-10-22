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
