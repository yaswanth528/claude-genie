import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { ExtractionSchema, PatchSchema, type Extraction, type Item, type Patch } from "./schema";

// Created on first use so `next build` doesn't need an API key.
let _client: GoogleGenAI | null = null;
function client() {
  if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not set. Add it to .env.local and restart.");
  return (_client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }));
}
const MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";

const EXTRACT_RULES = `You turn a small Indian business owner's spoken description into a product catalogue.
The transcript may mix languages (Kannada, Hindi, English, Hinglish) and may contain speech-to-text errors.
Rules:
- Only include items the owner actually said. Never invent items, prices or a business name.
- Prices are in rupees. Convert spoken numbers ("saat sau ninyanve", "seven ninety nine") to digits.
- Set lowConfidence to true when a price or name could plausibly be misheard (e.g. 79 vs 799, a garbled word).
- Write product names the way the owner would on a shop page; keep them short.`;

const EDIT_RULES = `You turn a business owner's spoken edit request into a patch for their catalogue.
Return only the operations needed. Use the item's index from the list given.
If the request could match more than one item (e.g. "the kurti" when there are several kurtis), return no ops and put a short clarifying question in ambiguity.
Never change anything the owner didn't ask for.`;

// Ask Gemini for JSON matching a Zod schema, then validate it with the same schema.
async function generateJson<T extends z.ZodType>(schema: T, input: string): Promise<z.infer<T>> {
  const { $schema: _drop, ...jsonSchema } = z.toJSONSchema(schema) as Record<string, unknown>;
  const interaction = await client().interactions.create({
    model: MODEL,
    input,
    response_format: { type: "text", mime_type: "application/json", schema: jsonSchema },
  });
  if (!interaction.output_text) throw new Error("No response from the model");
  const parsed = schema.safeParse(JSON.parse(interaction.output_text));
  if (!parsed.success) throw new Error("The model's answer didn't match the expected format");
  return parsed.data;
}

export async function extractCatalogue(transcript: string): Promise<Extraction> {
  return generateJson(ExtractionSchema, `${EXTRACT_RULES}\n\nTranscript:\n${transcript}`);
}

export async function interpretEdit(items: Item[], businessName: string, request: string): Promise<Patch> {
  const list = items.map((it, i) => `${i}: ${it.name} — ${it.price ?? "no price"}${it.unit ? ` ${it.unit}` : ""}`).join("\n");
  return generateJson(
    PatchSchema,
    `${EDIT_RULES}\n\nBusiness: ${businessName}\nCurrent items:\n${list}\n\nOwner said: ${request}`,
  );
}
