import { NextResponse } from "next/server";
import { normaliseWhatsapp, slugify, validateItems } from "@/lib/catalogue";
import type { Catalogue, Item } from "@/lib/schema";
import { hashKey, newEditKey, saveCatalogue } from "@/lib/store";

// Publish a confirmed read-back as a new page.
export async function POST(req: Request) {
  const body = (await req.json()) as {
    businessName?: string;
    tagline?: string | null;
    language?: string;
    whatsapp?: string;
    items?: Item[];
  };
  const businessName = body.businessName?.trim();
  const whatsapp = normaliseWhatsapp(body.whatsapp ?? "");
  const items = (body.items ?? []).map((it) => ({ ...it, name: it.name.trim(), lowConfidence: false }));

  const errors = validateItems(items);
  if (!businessName) errors.unshift("Add your business name.");
  if (!whatsapp) errors.unshift("Add a valid WhatsApp number.");
  if (errors.length) return NextResponse.json({ errors }, { status: 400 });

  const editKey = newEditKey();
  const catalogue: Catalogue = {
    slug: slugify(businessName!),
    businessName: businessName!,
    tagline: body.tagline?.trim() || null,
    language: body.language ?? "",
    whatsapp: whatsapp!,
    items,
    editKeyHash: hashKey(editKey),
    updatedAt: new Date().toISOString(),
  };
  try {
    await saveCatalogue(catalogue, `Create page ${catalogue.slug}`);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ errors: ["Couldn't save the page. Try again."] }, { status: 502 });
  }
  return NextResponse.json({ slug: catalogue.slug, editKey, whatsapp: catalogue.whatsapp });
}
