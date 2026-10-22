import { NextResponse } from "next/server";
import { limit } from "@/lib/ratelimit";
import { canEdit } from "@/lib/owner";
import { interpretEdit } from "@/lib/ai";
import { applyPatch, contentOf, undoLast, validateItems, withChange } from "@/lib/catalogue";
import { cleanContent } from "@/lib/draft";
import { amountDue, appOrigin, deploySite } from "@/lib/publish";
import type { Patch, Site } from "@/lib/schema";
import { ConflictError, getSiteRev, saveSite, type Rev } from "@/lib/store";

type Ctx = { params: Promise<{ slug: string }> };

async function authorised(req: Request, slug: string) {
  const { site, rev } = await getSiteRev(slug);
  if (!site) return { error: NextResponse.json({ error: "Website not found" }, { status: 404 }) };
  if (!canEdit(req, site))
    return { error: NextResponse.json({ error: "Log in with WhatsApp or open your private edit link." }, { status: 403 }) };
  return { site, rev };
}

const ownerView = (s: Site) => ({
  ...contentOf(s),
  slug: s.slug,
  whatsapp: s.whatsapp,
  updatedAt: s.updatedAt,
  canUndo: (s.history?.length ?? 0) > 0,
  payment: s.payment ?? null,
  live: s.live ?? null,
  due: amountDue(s),
});

async function save(next: Site, message: string, req: Request, rev: Rev) {
  try {
    await saveSite(next, message, rev);
    // Paid sites update their own live website automatically.
    if (next.live && amountDue(next) === 0) {
      try {
        next = await deploySite(next, appOrigin(req));
      } catch (err) {
        console.error("Auto-deploy failed:", err); // saved; the owner can retry "Update live website"
      }
    }
    return NextResponse.json(ownerView(next));
  } catch (err) {
    if (err instanceof ConflictError) return NextResponse.json({ error: err.message }, { status: 409 });
    console.error(err);
    return NextResponse.json({ error: "Couldn't save the change. Try again." }, { status: 502 });
  }
}

// The owner's current website, for the edit screen.
export async function GET(req: Request, { params }: Ctx) {
  const { slug } = await params;
  const { site, error } = await authorised(req, slug);
  if (error) return error;
  return NextResponse.json(ownerView(site));
}

// Voice edit, step 1: interpret the request and return a before/after. Nothing is saved.
export async function POST(req: Request, { params }: Ctx) {
  const stop = await limit(req, "voiceEdit");
  if (stop) return stop;
  const { slug } = await params;
  const { site, error } = await authorised(req, slug);
  if (error) return error;
  const { request } = (await req.json().catch(() => ({}))) as { request?: string };
  if (!request?.trim()) return NextResponse.json({ error: "Say what you want to change." }, { status: 400 });

  try {
    const patch = await interpretEdit(site.items, site.businessName, request.trim().slice(0, 1000));
    const after = applyPatch(site.items, site.businessName, patch);
    return NextResponse.json({
      patch,
      before: { businessName: site.businessName, items: site.items },
      after,
      errors: patch.ops.length ? validateItems(after.items) : [],
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: (err as Error).message || "Couldn't understand that edit" }, { status: 502 });
  }
}

// Save a change: either an approved voice-edit patch, or the whole site from the editor.
export async function PUT(req: Request, { params }: Ctx) {
  const { slug } = await params;
  const { site, rev, error } = await authorised(req, slug);
  if (error) return error;
  const body = (await req.json().catch(() => ({}))) as { patch?: Patch; content?: unknown };

  if (body.patch) {
    if (!body.patch.ops?.length) return NextResponse.json({ error: "Nothing to apply." }, { status: 400 });
    // Re-apply to the latest saved site so a stale preview can't overwrite newer changes.
    const after = applyPatch(site.items, site.businessName, body.patch);
    const errors = validateItems(after.items);
    if (errors.length) return NextResponse.json({ errors }, { status: 400 });
    return save(withChange(site, after), `Voice edit on ${slug}`, req, rev);
  }

  if (body.content) {
    const { content, errors } = cleanContent(body.content);
    if (errors.length) return NextResponse.json({ errors }, { status: 400 });
    return save(withChange(site, content), `Edit site ${slug}`, req, rev);
  }

  return NextResponse.json({ error: "Nothing to save." }, { status: 400 });
}

// Undo: restore the version before the last change.
export async function DELETE(req: Request, { params }: Ctx) {
  const { slug } = await params;
  const { site, rev, error } = await authorised(req, slug);
  if (error) return error;
  const restored = undoLast(site);
  if (!restored) return NextResponse.json({ error: "There's nothing to undo." }, { status: 409 });
  return save(restored, `Undo last change on ${slug}`, req, rev);
}
