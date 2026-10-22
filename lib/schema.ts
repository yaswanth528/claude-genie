import { z } from "zod";

export const ItemSchema = z.object({
  name: z.string().describe("Product name as the owner said it, cleaned up"),
  price: z.number().nullable().describe("Price in rupees; null if not said or unclear"),
  unit: z.string().nullable().describe("e.g. 'per kg', 'per piece'; null if not said"),
  lowConfidence: z
    .boolean()
    .describe("True if the name or price might be misheard (e.g. 79 vs 799)"),
});

// What the model returns from a spoken description.
export const ExtractionSchema = z.object({
  businessName: z.string().nullable(),
  tagline: z.string().nullable().describe("One short line about the business, only if said"),
  language: z.string().describe("Language(s) the owner spoke, e.g. 'Kannada', 'Hinglish'"),
  items: z.array(ItemSchema),
});

// What the model returns from a voice edit: a patch, never a whole catalogue.
export const PatchSchema = z.object({
  ops: z.array(
    z.object({
      op: z.enum(["set_price", "rename", "add", "remove", "set_business_name"]),
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

export type Item = z.infer<typeof ItemSchema>;
export type Extraction = z.infer<typeof ExtractionSchema>;
export type Patch = z.infer<typeof PatchSchema>;

export type Catalogue = {
  slug: string;
  businessName: string;
  tagline: string | null;
  language: string;
  whatsapp: string; // digits only, with country code
  items: Item[];
  editKeyHash: string;
  updatedAt: string;
  // Earlier versions, newest first, for one-step undo (capped in lib/catalogue.ts).
  history?: Snapshot[];
};

export type Snapshot = { businessName: string; items: Item[]; updatedAt: string };

export type PublicCatalogue = Omit<Catalogue, "editKeyHash" | "history">;
