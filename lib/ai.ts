import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { mediaForModel } from "./media";
import { UI_EN } from "./i18n";
import {
  GapCheckSchema,
  PatchSchema,
  RevisionSchema,
  type Revision,
  SitePlanSchema,
  TranslationSchema,
  type GapCheck,
  type Patch,
  type Product,
  type SiteContent,
  type SitePlan,
} from "./schema";

// Created on first use so `next build` doesn't need an API key.
let _client: GoogleGenAI | null = null;
function client() {
  if (!process.env.GEMINI_API_KEY)
    throw new Error(
      process.env.VERCEL
        ? "GEMINI_API_KEY is not set. Add it in Vercel → Settings → Environment Variables, then redeploy."
        : "GEMINI_API_KEY is not set. Add it to .env.local and restart.",
    );
  return (_client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }));
}

// Flash-Lite answered as accurately as 3.8 Flash on our product-list tests at about a third of the latency.
const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
const TRANSCRIBE_MODEL = process.env.GEMINI_TRANSCRIBE_MODEL || MODEL;
const IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || "gemini-nano-banana-2.1";
// "low" works on every current text model. "minimal" is rejected by 3.8 Flash, and on Lite it
// dropped spoken items from transcripts in our tests, so we don't use it.
const thinking = { thinking_level: "low" as const };

type Part = { type: "text"; text: string } | { type: "image"; data: string; mime_type: string };

// Ask Gemini for JSON matching a Zod schema, then validate it with the same schema.
// Text-only JSON tasks (planning, edits) gave identical results with Lite's "minimal" thinking
// in our tests and run ~40% faster; larger models don't accept "minimal".
const jsonThinking = (model: string) => ({ thinking_level: model.includes("lite") ? ("minimal" as const) : ("low" as const) });

async function generateJson<T extends z.ZodType>(schema: T, input: string | Part[], model = MODEL, think?: "low"): Promise<z.infer<T>> {
  const { $schema: _drop, ...jsonSchema } = z.toJSONSchema(schema) as Record<string, unknown>;
  const interaction = await client().interactions.create({
    model,
    input,
    response_format: { type: "text", mime_type: "application/json", schema: jsonSchema },
    // Light thinking keeps the build quick; the owner reviews everything before it goes live.
    generation_config: think ? { thinking_level: think } : jsonThinking(model),
  });
  if (!interaction.output_text) throw new Error("No response from the model");
  const parsed = schema.safeParse(JSON.parse(interaction.output_text));
  if (!parsed.success) throw new Error("The model's answer didn't match the expected format");
  return parsed.data;
}

// ---------- Speech to text (the PDF's open decision, resolved as Gemini audio) ----------

const AUDIO_TYPES: Record<string, string> = {
  "audio/webm": "audio/webm",
  "audio/ogg": "audio/ogg",
  "audio/mp4": "audio/m4a", // iPhone Safari records AAC in an MP4 container
  "audio/x-m4a": "audio/m4a",
  "audio/m4a": "audio/m4a",
  "audio/aac": "audio/aac",
  "audio/mpeg": "audio/mpeg",
  "audio/mp3": "audio/mp3",
  "audio/wav": "audio/wav",
};

export function supportedAudioType(mime: string): string | null {
  return AUDIO_TYPES[mime.split(";")[0].trim().toLowerCase()] ?? null;
}

export async function transcribeAudio(base64: string, mimeType: string, language: string): Promise<string> {
  const interaction = await client().interactions.create({
    model: TRANSCRIBE_MODEL,
    input: [
      {
        type: "text",
        text: `Transcribe this recording. A small shop owner in India is either describing their business (products, prices, area, hours) or asking for a change to their website (for example "change the price of kaju katli to 950" or "make the colours green").
First work out which language is actually spoken: usually Kannada, Hindi, Tamil, Telugu, English, or a mix. The owner picked ${language}, but treat that only as a hint; if they speak another language, transcribe that language.
Write exactly what was said, in the native script of the language spoken (Kannada in ಕನ್ನಡ script, Hindi in देवनागरी, Tamil in தமிழ், Telugu in తెలుగు); English words stay in English. Write every number and price as digits (e.g. 950). Output only the transcript, no commentary. If there is no speech, output nothing.`,
      },
      { type: "audio", data: base64, mime_type: mimeType },
    ],
    generation_config: thinking,
  });
  return (interaction.output_text ?? "").trim();
}

// ---------- Asking about gaps before building ----------

const GAP_RULES = `A small shop owner described their business by voice (possibly mixed languages, possibly with speech-to-text errors).
Before we build their website, list what is important and missing or unclear. Only ask about:
- the shop/business name, if it was never said;
- EVERY product that was mentioned without a price, even in passing ("we also have jamun", "ಜಾಮೂನ್ ಕೂಡ ಇದೆ", "aur dupatta bhi hai") - ask its price;
- a price that may be misheard (e.g. "seventy nine" vs "seven ninety nine", or a number that looks wrong for that product);
- a product name that is garbled.
Do NOT ask about anything optional (address, hours, delivery, photos, WhatsApp number, descriptions).
Do NOT ask the price of something the owner said is priced on request, by quotation, or "depends on size/quantity" (manufacturers, wholesalers, custom work, services).
Ask at most 3 questions, in the language the owner spoke, short and friendly. If nothing important is missing, return no questions.`;

export async function checkGaps(transcript: string): Promise<GapCheck> {
  const result = await generateJson(GapCheckSchema, `${GAP_RULES}

Transcript:
${transcript}`);
  return { questions: result.questions.slice(0, 3) };
}

// ---------- Planning the website ----------

const PLAN_RULES = `You are planning a small business's website from what the owner said (and any photos they uploaded).
The transcript may mix languages (Kannada, Hindi, English, Hinglish) and may contain speech-to-text errors.

Facts — be strict:
- Only include products, prices, units, areas, hours and selling points the owner actually said. Never invent them.
- Prices are in rupees. Convert spoken numbers ("saat sau ninyanve", "ಏಳುನೂರ ತೊಂಬತ್ತೊಂಬತ್ತು") to digits.
- Set lowConfidence when a price or name could plausibly be misheard (e.g. 79 vs 799).

Writing — be warm and short:
- headline, subheadline, about and product descriptions are marketing copy for a real shop page. Keep them simple, friendly and specific to this business. No claims the owner didn't make (no "best in town", "free delivery", "since 1990" unless said).
- Write copy in the language the owner spoke, except use English if they spoke English or mixed with lots of English.

Design:
- Pick the theme that fits the business type, the colour option that suits it, and a hero style.
- Uploaded photos are numbered from 0 in the order given. Match photos to the products they show, pick the best banner, and put good leftovers in the gallery. Never use one photo twice.
- For any product without a matching photo, write imagePrompt: a realistic product photo of exactly that item (Indian context), soft natural light, clean simple background, no text, no people's faces.
- heroImagePrompt: a wide, inviting photo that captures this kind of shop in India, no text or logos.

Products:
- If the owner groups products (e.g. "in sarees we have... in kurtis we have..."), set category; otherwise leave it null.
- If they say a product comes in sizes, colours or weights, set optionName and optionChoices. Only what they said.
- Manufacturers, wholesalers and service businesses often quote prices per order. If the owner says the price depends or is on request, set askPrice true and price null. Never make up a price.
- highlights: pick up to 3 real selling points from what they said (e.g. "Custom sizes", "Bulk orders welcome", "Home delivery in Jayanagar", "Open 10 am to 9 pm"). Use what they said; never invent.`;

export type UploadedMedia = { url: string; kind: "image" | "video"; name: string };

export async function planSite(transcript: string, media: UploadedMedia[]): Promise<SitePlan> {
  const parts: Part[] = [{ type: "text", text: `${PLAN_RULES}\n\nTranscript:\n${transcript}` }];
  for (const [i, m] of media.entries()) {
    if (m.kind === "video") {
      parts.push({ type: "text", text: `Upload ${i}: a video (file name "${m.name}"). Can be the banner or go in the gallery.` });
      continue;
    }
    const img = await mediaForModel(m.url);
    parts.push({ type: "text", text: `Upload ${i}: photo "${m.name}"` });
    if (img) parts.push({ type: "image", ...img });
  }
  return generateJson(SitePlanSchema, parts);
}

// ---------- Images for slots the owner didn't fill ----------

// Returns the JPEG bytes, null on a one-off failure, or "quota" when this key can't generate images.
export async function generateImage(prompt: string, aspect: "16:9" | "1:1" | "4:3"): Promise<Buffer | null | "quota"> {
  try {
    const interaction = await client().interactions.create({
      model: IMAGE_MODEL,
      input: `${prompt}. Photorealistic, high quality, natural colours. No text, no watermark, no logos.`,
      response_format: { type: "image", mime_type: "image/jpeg", aspect_ratio: aspect, image_size: "1K" },
      generation_config: { thinking_level: "minimal" },
    });
    const data = interaction.output_image?.data;
    return data ? Buffer.from(data, "base64") : null;
  } catch (err) {
    // A missing picture shouldn't stop the website being built.
    const msg = (err as Error).message;
    console.error("Image generation failed:", msg);
    return /\b429\b|rate limit|quota/i.test(msg) ? "quota" : null;
  }
}

// ---------- Second language ----------

export async function translateSite(site: SiteContent, language: string) {
  const source = {
    businessName: site.businessName,
    category: site.category,
    headline: site.headline,
    subheadline: site.subheadline,
    about: site.about,
    highlights: site.highlights,
    area: site.area,
    hours: site.hours,
    items: site.items.map((i) => ({ name: i.name, description: i.description, optionName: i.optionName ?? null, options: i.options ?? [] })),
    categories: [...new Set(site.items.map((i) => i.category).filter(Boolean))],
    ui: UI_EN,
  };
  const prompt = `Translate this small shop's website text into ${language}, for local customers in India.
Rules:
- Natural, simple, everyday ${language}, the way a shop sign or WhatsApp message would say it. Not formal or literary.
- Keep product and brand names recognisable: well-known names (e.g. "Kaju Katli", "iPhone") can stay as they are or be written in ${language} script.
- Keep numbers, prices and units as digits. Keep the same number and order of items, highlights and options.
- Translate every key in "ui" (keep the keys exactly). Translate each category in "categories" as {from, to}.
- businessName: keep the shop's name, written in ${language} script if natural.

Website text (JSON):
${JSON.stringify(source)}`;
  return generateJson(TranslationSchema, prompt);
}

// ---------- Voice edits ----------

const EDIT_RULES = `You turn a business owner's spoken edit request into a patch for their product list.
Return only the operations needed. Use the item's index from the list given.
If the request could match more than one item (e.g. "the kurti" when there are several kurtis), return no ops and put a short clarifying question in ambiguity.
Use out_of_stock / in_stock when the owner says an item is finished, sold out, not available, or back in stock.
Use mark_bestseller / mark_new / mark_offer when the owner wants a product tagged as a bestseller (popular, most sold), new (new arrival, just in) or on offer (discount, sale); clear_badge to remove the tag.
Never change anything the owner didn't ask for.`;

export async function interpretEdit(items: Product[], businessName: string, request: string): Promise<Patch> {
  const list = items.map((it, i) => `${i}: ${it.name} — ${it.price ?? "no price"}${it.unit ? ` ${it.unit}` : ""}`).join("\n");
  return generateJson(
    PatchSchema,
    `${EDIT_RULES}\n\nBusiness: ${businessName}\nCurrent items:\n${list}\n\nOwner said: ${request}`,
  );
}

// ---------- "Not happy? Say what to change" ----------

const REVISE_RULES = `You are editing a small business's website. The owner looked at it and said, in their own words, what they want changed (possibly mixed languages, possibly with speech-to-text errors).
Give every field. Use null for anything that stays the same; put the new value in every field you change.

What you can change: the business name, headline, subheadline, about text, highlights, theme (look and colours), banner style, product layout, area, address, hours, festival banner, and products (update, add or remove; name, price, unit, description, category, tag, stock, "price on request", a new photo). You can also ask for a new banner photo.

Themes: boutique (elegant, clothing and beauty), kitchen (warm, food), fresh (green, grocery), studio (clean, services), craft (handmade, decor), bazaar (bold, electronics and general).
Layouts: grid (photo tiles), list (photo beside details), lookbook (big photos), menu (names and prices, no photos).

Rules:
- Do what they asked, fully, and nothing else.
- If they ask for something general ("make it better", "more professional", "looks empty", "I don't like it"), improve the whole page: rewrite the headline (warm, specific, max 8 words), subheadline, about (2-3 sentences) and every product's description (one short line), and pick the theme, colours and layout that suit this business best. Mention each in the summary.
- Facts are strict: never invent prices, products, years, awards, delivery ("delivered daily", "home delivery"), freshness promises, discounts or claims the owner didn't make. Rewriting copy means saying the same facts better.
- Never add or change tags, stock, prices, categories or the festival banner unless the owner asked for that.
- Write copy in the same language as the current website text unless the owner asks for another language.
- If they ask for something the website can't do, or it's unclear what they mean, change nothing and put a short, friendly question or explanation in "question".
- Only list products in "items" that you actually change, and give the new values in their fields.`;

export async function reviseSite(site: SiteContent, request: string): Promise<Revision> {
  const current = {
    businessName: site.businessName,
    category: site.category,
    siteType: site.siteType,
    headline: site.headline,
    subheadline: site.subheadline,
    about: site.about,
    highlights: site.highlights,
    themeId: site.theme.id,
    accent: site.theme.accent,
    heroStyle: site.theme.heroStyle,
    layout: site.theme.layout ?? "grid",
    area: site.area,
    address: site.address,
    hours: site.hours,
    festival: site.festival ?? null,
    hasBannerPhoto: !!site.hero,
    items: site.items.map((it, i) => ({
      index: i,
      name: it.name,
      price: it.price,
      unit: it.unit,
      description: it.description,
      category: it.category ?? null,
      badge: it.badge ?? null,
      inStock: it.inStock !== false,
      askPrice: !!it.askPrice,
      photo: it.image ? (it.image.generated ? "stock photo" : "owner's photo") : "none",
    })),
  };
  // A little thinking here: with "minimal" the model ignored the no-invented-claims rule.
  return generateJson(RevisionSchema, `${REVISE_RULES}

Current website (JSON):
${JSON.stringify(current)}

Owner said: ${request}`, MODEL, "low");
}
