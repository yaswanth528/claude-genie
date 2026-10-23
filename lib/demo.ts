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

// Two more looks for the home page's row of phones: an online store and a menu board.
export const DEMO_STORE: SiteContent & { whatsapp: string } = {
  ...DEMO,
  category: "Snacks & bakery",
  siteType: "dynamic",
  theme: { id: "kitchen", accent: 0, heroStyle: "split", layout: "grid" },
  headline: "Fresh snacks, made every morning",
  subheadline: "Samosas, pav bhaji and cakes. Order online, we deliver nearby.",
  hours: "8 am - 10 pm",
  items: [
    item("Samosa (2 pcs)", 40, { category: "Snacks", badge: "bestseller", image: photo("photo-1601050690597-df0568f70950", "Samosa") }),
    item("Pav bhaji", 120, { category: "Snacks", image: photo("photo-1606491956689-2ea866880c84", "Pav bhaji") }),
    item("Strawberry cake", 650, { category: "Cakes", badge: "new", image: photo("photo-1589119908995-c6837fa14848", "Strawberry cake") }),
    item("Plum cake", 450, { category: "Cakes" }),
  ],
};

export const DEMO_MENU: SiteContent & { whatsapp: string } = {
  ...DEMO,
  category: "Sweets & namkeen",
  theme: { id: "kitchen", accent: 2, heroStyle: "split", layout: "menu" },
  headline: "Sweets for every occasion",
  subheadline: "Made fresh in small batches. Order a box on WhatsApp.",
  hours: "9 am - 9 pm",
  items: [
    item("Mysore pak", 400, { unit: "per kg", category: "Sweets", badge: "bestseller" }),
    item("Kaju katli", 900, { unit: "per kg", category: "Sweets" }),
    item("Badam halwa", 600, { unit: "per kg", category: "Sweets" }),
    item("Mixture", 240, { unit: "per kg", category: "Namkeen" }),
    item("Khara boondi", 220, { unit: "per kg", category: "Namkeen", badge: "new" }),
  ],
};
