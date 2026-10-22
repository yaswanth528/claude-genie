import { NextResponse } from "next/server";
import { applyPatch, undoLast, validateItems, withChange } from "@/lib/catalogue";
import { interpretEdit } from "@/lib/ai";
import type { Catalogue, Patch } from "@/lib/schema";
import { getCatalogue, keyMatches, saveCatalogue } from "@/lib/store";

type Ctx = { params: Promise<{ slug: string }> };

async function authorised(req: Request, slug: string) {
  const catalogue = await getCatalogue(slug);
  if (!catalogue) return { error: NextResponse.json({ error: "Page not found" }, { status: 404 }) };
  if (!keyMatches(catalogue, req.headers.get("x-edit-key")))
    return { error: NextResponse.json({ error: "This edit link isn't valid." }, { status: 403 }) };
  return { catalogue };
}

const ownerView = (c: Catalogue) => ({
  businessName: c.businessName,
  items: c.items,
  updatedAt: c.updatedAt,
  canUndo: (c.history?.length ?? 0) > 0,
});

// The owner's current page, for the edit screen.
export async function GET(req: Request, { params }: Ctx) {
  const { slug } = await params;
  const { catalogue, error } = await authorised(req, slug);
  if (error) return error;
  return NextResponse.json(ownerView(catalogue));
}

// Step 1 of a voice edit: interpret the request and return a before/after. Nothing is saved.
export async function POST(req: Request, { params }: Ctx) {
  const { slug } = await params;
  const { catalogue, error } = await authorised(req, slug);
  if (error) return error;
  const { request } = (await req.json()) as { request?: string };
  if (!request?.trim()) return NextResponse.json({ error: "Say what you want to change." }, { status: 400 });

  try {
    const patch = await interpretEdit(catalogue.items, catalogue.businessName, request.trim());
    const after = applyPatch(catalogue.items, catalogue.businessName, patch);
    return NextResponse.json({
      patch,
      before: { businessName: catalogue.businessName, items: catalogue.items },
      after,
      errors: patch.ops.length ? validateItems(after.items) : [],
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: (err as Error).message || "Couldn't understand that edit" }, { status: 502 });
  }
}

// Step 2: the owner approved the before/after. Re-apply the same patch to the
// latest saved catalogue (so a stale preview can't overwrite newer changes) and save.
export async function PUT(req: Request, { params }: Ctx) {
  const { slug } = await params;
  const { catalogue, error } = await authorised(req, slug);
  if (error) return error;
  const { patch } = (await req.json()) as { patch?: Patch };
  if (!patch?.ops?.length) return NextResponse.json({ error: "Nothing to apply." }, { status: 400 });

  const after = applyPatch(catalogue.items, catalogue.businessName, patch);
  const errors = validateItems(after.items);
  if (errors.length) return NextResponse.json({ errors }, { status: 400 });

  const next = withChange(catalogue, after);
  try {
    await saveCatalogue(next, `Voice edit on ${slug}`);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Couldn't save the change. Try again." }, { status: 502 });
  }
  return NextResponse.json(ownerView(next));
}

// Undo: restore the version before the last change.
export async function DELETE(req: Request, { params }: Ctx) {
  const { slug } = await params;
  const { catalogue, error } = await authorised(req, slug);
  if (error) return error;
  const restored = undoLast(catalogue);
  if (!restored) return NextResponse.json({ error: "There's nothing to undo." }, { status: 409 });
  try {
    await saveCatalogue(restored, `Undo last change on ${slug}`);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Couldn't undo. Try again." }, { status: 502 });
  }
  return NextResponse.json(ownerView(restored));
}
