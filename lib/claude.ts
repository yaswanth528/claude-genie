import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { ExtractionSchema, PatchSchema, type Extraction, type Item, type Patch } from "./schema";

// Created on first use so `next build` doesn't need an API key.
let _client: Anthropic | null = null;
const client = () => (_client ??= new Anthropic());
const MODEL = "claude-opus-5-5";

const EXTRACT_SYSTEM = `You turn a small Indian business owner's spoken description into a product catalogue.
The transcript may mix languages (Kannada, Hindi, English, Hinglish) and may contain speech-to-text errors.
Rules:
- Only include items the owner actually said. Never invent items, prices or a business name.
- Prices are in rupees. Convert spoken numbers ("saat sau ninyanve", "seven ninety nine") to digits.
- Set lowConfidence to true when a price or name could plausibly be misheard (e.g. 79 vs 799, a garbled word).
- Write product names in the script the owner would use on a shop page; keep them short.`;

const EDIT_SYSTEM = `You turn a business owner's spoken edit request into a patch for their catalogue.
Return only the operations needed. Use the item's index from the list given.
If the request could match more than one item (e.g. "the kurti" when there are several kurtis), return no ops and put a short clarifying question in ambiguity.
Never change anything the owner didn't ask for.`;

class RefusalError extends Error {}

export async function extractCatalogue(transcript: string): Promise<Extraction> {
  const response = await client().messages.parse({
    model: MODEL,
    max_tokens: 16000,
    output_config: { effort: "low", format: zodOutputFormat(ExtractionSchema) },
    system: EXTRACT_SYSTEM,
    messages: [{ role: "user", content: `Transcript:\n${transcript}` }],
  });
  if (response.stop_reason === "refusal") throw new RefusalError("Claude declined this request");
  if (!response.parsed_output) throw new Error("Could not read a catalogue from that description");
  return response.parsed_output;
}

export async function interpretEdit(items: Item[], businessName: string, request: string): Promise<Patch> {
  const list = items.map((it, i) => `${i}: ${it.name} — ${it.price ?? "no price"}${it.unit ? ` ${it.unit}` : ""}`).join("\n");
  const response = await client().messages.parse({
    model: MODEL,
    max_tokens: 16000,
    output_config: { effort: "low", format: zodOutputFormat(PatchSchema) },
    system: EDIT_SYSTEM,
    messages: [
      {
        role: "user",
        content: `Business: ${businessName}\nCurrent items:\n${list}\n\nOwner said: ${request}`,
      },
    ],
  });
  if (response.stop_reason === "refusal") throw new RefusalError("Claude declined this request");
  if (!response.parsed_output) throw new Error("Could not understand that edit");
  return response.parsed_output;
}
