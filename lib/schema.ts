import { z } from "zod";

export const THEME_IDS = ["boutique", "kitchen", "fresh", "studio", "craft", "bazaar"] as const;
export type ThemeId = (typeof THEME_IDS)[number];

// How products are laid out: photo grid, rows, big photos, or a text menu board.
export const LAYOUTS = ["grid", "list", "lookbook", "menu"] as const;
export type Layout = (typeof LAYOUTS)[number];

export const BADGES = ["bestseller", "new", "offer"] as const;
export type Badge = (typeof BADGES)[number];

// A festive banner the owner can switch on for the season.
export const FESTIVALS = ["diwali", "navratri", "ganesh", "holi", "eid", "christmas", "pongal", "onam", "ugadi", "newyear"] as const;
export type FestivalId = (typeof FESTIVALS)[number];
export type Festival = { id: FestivalId; message: string | null };

export const ItemSchema = z.object({
  name: z.string().describe("Product name as the owner said it, cleaned up"),
  price: z.number().nullable().describe("Price in rupees; null if not said or unclear"),
  unit: z.string().nullable().describe("e.g. 'per kg', 'per piece'; null unless the owner said it"),
  lowConfidence: z.boolean().describe("True if the name or price might be misheard (e.g. 79 vs 799)"),
});

// What the model returns when planning a website from the owner's words (and photos).
export const SitePlanSchema = z.object({
  businessName: z.string().nullable(),
  language: z.string().describe("Language(s) the owner spoke, e.g. 'Kannada', 'Hinglish'"),
  category: z.string().describe("Short business type in English, e.g. 'women's ethnic wear', 'bakery', 'kirana store'"),
  themeId: z.enum(THEME_IDS).describe(
    "boutique: clothing, sarees, beauty, salons. kitchen: food, bakery, sweets, restaurants, tiffin. fresh: grocery, kirana, fruits, vegetables, dairy, organic. studio: services, tuition, repairs, consultants, fitness. craft: handmade, jewellery, pottery, home decor, gifts. bazaar: electronics, mobiles, hardware, general stores, anything else.",
  ),
  accent: z.number().describe("0, 1 or 2: which of the theme's three colour options suits this business best"),
  heroStyle: z.enum(["full", "split"]).describe("full: big photo behind the headline. split: headline beside the photo"),
  headline: z.string().describe("Short, warm homepage headline (max 8 words) in the owner's language or English"),
  subheadline: z.string().describe("One sentence saying what they sell and to whom, using only what they said"),
  about: z.string().nullable().describe("2-3 sentences about the business using only facts the owner said; null if they said nothing beyond products"),
  highlights: z.array(z.string()).describe("Up to 3 short selling points the owner actually said (e.g. 'Home delivery in Jayanagar'). Empty if none said."),
  area: z.string().nullable().describe("Area/locality/city if said"),
  address: z.string().nullable().describe("Full address if said"),
  hours: z.string().nullable().describe("Opening hours if said"),
  whatsapp: z.string().nullable().describe("The WhatsApp or phone number if the owner said one, digits only (e.g. '9876543210'); null if not said"),
  items: z.array(
    ItemSchema.extend({
      description: z.string().describe("One short line describing the product, using only what was said or what the product name itself means. No invented claims."),
      mediaIndex: z.number().nullable().describe("Index of the uploaded photo that shows this product; null if none matches"),
      imagePrompt: z.string().describe("If no uploaded photo matches: a description for an illustrative product photo, plain background, no text"),
      imageQuery: z.string().describe("2-4 English words to search a stock photo library for this product, e.g. 'cotton kurti'"),
      category: z.string().nullable().describe("Product group if the owner grouped products (e.g. 'Sarees', 'Sweets'); null otherwise"),
      askPrice: z.boolean().describe("True only if the owner said this price varies or is given on request/quotation (custom sizes, bulk orders, services); then price is null"),
      optionName: z.string().nullable().describe("If the owner said the product comes in choices: what varies, e.g. 'Size', 'Colour', 'Weight'; else null"),
      optionChoices: z.array(z.string()).describe("The choices the owner said, e.g. ['S','M','L'] or ['250 g','500 g']; empty if none"),
    }),
  ),
  heroMediaIndex: z.number().nullable().describe("Index of the uploaded photo or video best suited as the main banner; null if none"),
  galleryMediaIndexes: z.array(z.number()).describe("Indexes of uploaded media not used above that are worth showing in a gallery"),
  heroImagePrompt: z.string().describe("If there is no suitable upload: a description for a wide banner photo that sets the mood of this business, no text or logos"),
  heroImageQuery: z.string().describe("2-4 English words to search a stock photo library for a banner, e.g. 'indian saree shop'"),
});

// Before building: what's missing or unclear in what the owner said.
export const GapCheckSchema = z.object({
  questions: z
    .array(
      z.object({
        question: z.string().describe("A short, friendly question in the owner's language, e.g. 'What is the price of the silk saree?'"),
        reason: z.enum(["missing_name", "missing_price", "unclear_price", "unclear_product", "other"]),
      }),
    )
    .describe("At most 3 questions, most important first. Empty if nothing important is missing."),
});
export type GapCheck = z.infer<typeof GapCheckSchema>;

// What the model returns from a voice edit: a patch, never a whole site.
export const PatchSchema = z.object({
  ops: z.array(
    z.object({
      op: z.enum(["set_price", "rename", "add", "remove", "set_business_name", "out_of_stock", "in_stock", "mark_bestseller", "mark_new", "mark_offer", "clear_badge"]),
      index: z.number().nullable().describe("Index of the item in the current list; null for add/set_business_name"),
      name: z.string().nullable(),
      price: z.number().nullable(),
    }),
  ),
  ambiguity: z
    .string()
    .nullable()
    .describe("If the request could mean more than one item, a short question for the owner; else null"),
});

// "Not happy? Say what to change": a change to the whole website from one spoken request.
// Every field must be given; null means "leave it as it is" (an empty string clears a text).
// (With optional fields the fast model tended to describe changes without making them.)
const keep = (d: string) => `${d}. null = no change`;
export const RevisionSchema = z.object({
  question: z.string().nullable().describe("If the request is unclear or impossible, one short question or explanation for the owner; else null"),
  businessName: z.string().nullable().describe(keep("New business name")),
  headline: z.string().nullable().describe(keep("New headline, max 8 words")),
  subheadline: z.string().nullable().describe(keep("New one-sentence subheadline")),
  about: z.string().nullable().describe(keep("New about text, 2-3 sentences; empty string removes it")),
  highlights: z.array(z.string()).nullable().describe(keep("Up to 3 short selling points, only facts the owner said")),
  themeId: z.enum(THEME_IDS).nullable().describe(keep("New theme")),
  accent: z.number().nullable().describe(keep("0, 1 or 2: colour option within the theme")),
  heroStyle: z.enum(["full", "split"]).nullable().describe(keep("Banner style")),
  layout: z.enum(LAYOUTS).nullable().describe(keep("Product layout")),
  area: z.string().nullable().describe(keep("Area/city; empty string removes it")),
  address: z.string().nullable().describe(keep("Full address; empty string removes it")),
  hours: z.string().nullable().describe(keep("Opening hours; empty string removes them")),
  festival: z.enum([...FESTIVALS, "none"]).nullable().describe(keep("Festival banner; 'none' removes it")),
  festivalMessage: z.string().nullable().describe(keep("Offer line on the festival banner")),
  newHeroPhoto: z.string().nullable().describe(keep("2-4 English words to search a new banner photo, only if the owner wants a different banner/main photo")),
  items: z
    .array(
      z.object({
        op: z.enum(["update", "add", "remove"]),
        index: z.number().nullable().describe("Index in the current list; null for add"),
        name: z.string().nullable().describe(keep("Name")),
        price: z.number().nullable().describe(keep("Price in rupees")),
        unit: z.string().nullable().describe(keep("e.g. 'per kg'; empty string removes it")),
        description: z.string().nullable().describe(keep("One short line")),
        category: z.string().nullable().describe(keep("Category; empty string removes it")),
        badge: z.enum([...BADGES, "none"]).nullable().describe(keep("Tag; 'none' removes it")),
        inStock: z.boolean().nullable().describe(keep("In stock")),
        askPrice: z.boolean().nullable().describe(keep("true = show 'Price on request' instead of a price")),
        newPhoto: z.string().nullable().describe(keep("2-4 English words to search a new photo for this product, only if the owner wants a different photo")),
      }),
    )
    .describe("Only the products that change (one entry per product). Empty if no product changes."),
});
export type Revision = z.infer<typeof RevisionSchema>;

export type Item = z.infer<typeof ItemSchema>;
export type SitePlan = z.infer<typeof SitePlanSchema>;
export type Patch = z.infer<typeof PatchSchema>;

export type Media = {
  url: string;
  kind: "image" | "video";
  generated: boolean; // true = not the owner's own photo (AI illustration or stock photo)
  alt: string;
  credit?: string | null; // e.g. "Photo: Jane Doe / Pexels" for stock photos
};

export type Product = Item & {
  description: string;
  image: Media | null;
  category?: string | null; // groups products into filter chips on the site
  optionName?: string | null; // e.g. "Size"
  options?: string[]; // e.g. ["S", "M", "L"]; the customer picks one
  inStock?: boolean; // false = shown as "Out of stock", can't be ordered (default true)
  badge?: Badge | null; // "Bestseller" / "New" / "Offer" tag on the product card
  askPrice?: boolean; // "Price on request" (manufacturers, custom work): no price needed
};

// A second language for the website (e.g. Kannada), switchable by customers.
export const TranslationSchema = z.object({
  businessName: z.string(),
  category: z.string().describe("What the business sells, e.g. 'women's ethnic wear'"),
  headline: z.string(),
  subheadline: z.string(),
  about: z.string().nullable(),
  highlights: z.array(z.string()),
  area: z.string().nullable(),
  hours: z.string().nullable(),
  items: z.array(z.object({ name: z.string(), description: z.string(), optionName: z.string().nullable(), options: z.array(z.string()) })),
  categories: z.array(z.object({ from: z.string(), to: z.string() })).describe("Each product category translated"),
  ui: z.record(z.string(), z.string()).describe("The interface wording translated, same keys as given"),
});
export type Translation = z.infer<typeof TranslationSchema> & { language: string; label: string };

export type SiteContent = {
  businessName: string;
  category: string;
  language: string;
  siteType: "static" | "dynamic";
  theme: { id: ThemeId; accent: number; heroStyle: "full" | "split"; layout?: Layout };
  headline: string;
  subheadline: string;
  about: string | null;
  highlights: string[];
  area: string | null;
  address: string | null;
  hours: string | null;
  hero: Media | null;
  gallery: Media[];
  items: Product[];
  translation?: Translation | null;
  upiId?: string | null; // owner's UPI ID; buyers pay the shop directly
  delivery?: Delivery | null;
  reviewsUrl?: string | null; // the shop's Google reviews / Maps listing
  festival?: Festival | null;
};

export type Delivery = {
  areas: string | null; // e.g. "Jayanagar, JP Nagar, BTM"
  charge: number | null; // rupees per order
  freeAbove: number | null; // free delivery when items total at least this
  minOrder: number | null; // smallest order accepted (items total)
};

// A draft is what the review screen edits before publishing.
export type Draft = SiteContent & { whatsapp: string; ownerEmail?: string };

export type Site = SiteContent & {
  slug: string;
  whatsapp: string; // digits only, with country code
  editKeyHash: string;
  updatedAt: string;
  // Earlier versions, newest first, for one-step undo (capped in lib/catalogue.ts).
  history?: Snapshot[];
  payment?: Payment | null;
  live?: Live | null;
  ownerEmail?: string | null; // private: new-order and renewal emails go here
  renewalReminderSentFor?: string | null; // the paidUntil date we already reminded about
};

export type Payment = {
  plan: "static" | "dynamic";
  amount: number; // rupees paid in total
  mode: "test" | "live";
  reference: string;
  paidAt: string;
  paidUntil?: string | null; // dynamic plan: online orders paid up to this date (yearly)
};

// The customer's own deployed website (Cloudflare Pages).
export type Live = {
  provider: "cloudflare";
  project: string;
  url: string;
  deployedAt: string;
  updatedAt: string; // site content version that was deployed
};

export type Snapshot = { content: SiteContent; updatedAt: string };

export type PublicSite = Omit<Site, "editKeyHash" | "history" | "payment" | "live">;

export const ORDER_STATUSES = ["new", "confirmed", "out_for_delivery", "delivered", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type OrderLine = { name: string; qty: number; price: number | null; option?: string | null };

export type Order = {
  id: string;
  slug: string;
  createdAt: string;
  updatedAt?: string;
  customer: { name: string; phone: string; address: string; note: string };
  lines: OrderLine[];
  discount?: number; // rupees taken off by the owner
  deliveryCharge?: number; // rupees added by the owner
  total: number; // items - discount + delivery
  status?: OrderStatus; // missing on older orders = "new"
  tokenHash?: string; // the buyer's private "My order" link
  changedByBuyer?: boolean; // buyer edited it since the owner last looked
  paid?: boolean; // owner marked the payment received
  events?: { at: string; by: "buyer" | "owner"; text: string }[];
};
