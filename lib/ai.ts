import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { mediaForModel } from "./media";
import { UI_EN } from "./i18n";
import {
  GapCheckSchema,
  PatchSchema,
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

async function generateJson<T extends z.ZodType>(schema: T, input: string | Part[], model = MODEL): Promise<z.infer<T>> {
  const { $schema: _drop, ...jsonSchema } = z.toJSONSchema(schema) as Record<string, unknown>;
  const interaction = await client().interactions.create({
    model,
    input,
    response_format: { type: "text", mime_type: "application/json", schema: jsonSchema },
    // Light thinking keeps the build quick; the owner reviews everything before it goes live.
    generation_config: jsonThinking(model),
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
        text: `Transcribe this recording of a shop owner describing their business, products and prices. They mostly speak ${language}, possibly mixed with English or Hindi.
Write exactly what was said, in the script of the language spoken. Write every price as digits (e.g. 799). Output only the transcript, no commentary. If there is no speech, output nothing.`,
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
- If they say a product comes in sizes, colours or weights, set optionName and optionChoices. Only what they said.`;

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
