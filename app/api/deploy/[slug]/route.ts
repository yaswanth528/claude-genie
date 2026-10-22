import { NextResponse } from "next/server";
import { canEdit } from "@/lib/owner";
import { amountDue, appOrigin, deploySite } from "@/lib/publish";
import { getSite } from "@/lib/store";

export const maxDuration = 60;
type Ctx = { params: Promise<{ slug: string }> };

// Push the latest saved version of a paid site to its own hosting.
export async function POST(req: Request, { params }: Ctx) {
  const { slug } = await params;
  const site = await getSite(slug);
  if (!site) return NextResponse.json({ error: "Website not found" }, { status: 404 });
  if (!canEdit(req, site)) return NextResponse.json({ error: "Log in with WhatsApp or open your private edit link." }, { status: 403 });
  const due = amountDue(site);
  if (due > 0) return NextResponse.json({ error: `Pay ₹${due.toLocaleString("en-IN")} to put this version live.`, due }, { status: 402 });
  try {
    const next = await deploySite(site, appOrigin(req));
    return NextResponse.json({ live: next.live });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
