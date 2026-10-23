// Demo website for the home page: shows what SiteGenie makes. Deliberately named "Your shop"
// (no invented business names); photos are Unsplash stock, credited on the demo site.
import type { SiteContent } from "./schema";

const U = (id: string) => `https://images.unsplash.com/${id}?w=700&q=70&auto=format&fm=jpg`;
const photo = (id: string, alt: string) => ({ url: U(id), kind: "image" as const, generated: true, alt, credit: "Photo: Unsplash" });
const item = (name: string, price: number, extra: Partial<SiteContent["items"][number]> = {}) => ({
  name,
  price,
  unit: null,
  lowConfidence: false,
  description: "",
  image: null,
  category: null,
  optionName: null,
  options: [],
  inStock: true,
  ...extra,
});

export const DEMO: SiteContent & { whatsapp: string } = {
  businessName: "Your shop",
  category: "Sarees & kurtis",
  language: "English",
  siteType: "static",
  theme: { id: "boutique", accent: 0, heroStyle: "split", layout: "grid" },
  headline: "Silks for every celebration",
  subheadline: "Mysore silk and cotton sarees, and kurtis for every day.",
  about: null,
  highlights: [],
  area: "Bengaluru",
  address: null,
  hours: "10 am - 9 pm",
  hero: null,
  gallery: [],
  whatsapp: "919999999999",
  upiId: null,
  delivery: { areas: "Bengaluru", charge: 40, freeAbove: 1500, minOrder: null },
  items: [
    item("Mysore silk saree", 4500, { category: "Sarees", badge: "bestseller", image: photo("photo-1610030469983-98e550d6193c", "Silk saree") }),
    item("Cotton saree", 1200, { category: "Sarees", image: photo("photo-1583391733956-3750e0ff4e8b", "Cotton saree") }),
    item("Printed kurti", 899, { category: "Kurtis", badge: "new", image: photo("photo-1617627143750-d86bc21e42bb", "Printed kurti") }),
    item("Cotton kurti", 799, { category: "Kurtis", optionName: "Size", options: ["S", "M", "L", "XL"] }),
  ],
};
