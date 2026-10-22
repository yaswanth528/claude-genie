import { NextResponse } from "next/server";
import { slugify } from "@/lib/catalogue";
import { cleanDraft } from "@/lib/draft";
import type { Site } from "@/lib/schema";
import { hashKey, newEditKey, saveSite } from "@/lib/store";

// Publish a reviewed website draft.
export async function POST(req: Request) {
  const { content, whatsapp, errors } = cleanDraft(await req.json().catch(() => null));
  if (errors.length) return NextResponse.json({ errors }, { status: 400 });

  const editKey = newEditKey();
  const site: Site = {
    ...content,
    slug: slugify(content.businessName),
    whatsapp: whatsapp!,
    editKeyHash: hashKey(editKey),
    updatedAt: new Date().toISOString(),
  };
  try {
    await saveSite(site, `Create site ${site.slug}`);
  } catch (err) {
    console.error(err);
    const msg = (err as Error).message;
    return NextResponse.json({ errors: [msg.startsWith("Saving needs") ? msg : "Couldn't save the website. Try again."] }, { status: 502 });
  }
  return NextResponse.json({ slug: site.slug, editKey, whatsapp: site.whatsapp });
}
