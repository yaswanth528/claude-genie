import { NextResponse } from "next/server";
import { canEdit } from "@/lib/owner";
import { addYear } from "@/lib/prices";
import { amountDue, appOrigin, deploySite, paymentMode, renewalDue } from "@/lib/publish";
import type { Site } from "@/lib/schema";
import { ConflictError, getSiteRev, newId, saveSite } from "@/lib/store";

export const maxDuration = 60;
type Ctx = { params: Promise<{ slug: string }> };

// Pay to get the website (or renew the dynamic plan), then deploy it to its own hosting.
// Test mode records a simulated payment; a real gateway (e.g. Razorpay) plugs in here.
export async function POST(req: Request, { params }: Ctx) {
  const { slug } = await params;
  const { site, rev } = await getSiteRev(slug);
  if (!site) return NextResponse.json({ error: "Website not found" }, { status: 404 });
  if (!canEdit(req, site)) return NextResponse.json({ error: "Log in with WhatsApp or open your private edit link." }, { status: 403 });
  const { renew } = (await req.json().catch(() => ({}))) as { renew?: boolean };

  const due = amountDue(site);
  const renewal = due === 0 && renew ? renewalDue(site) : 0;
  const charge = due + renewal;
  let paid: Site = site;
  if (charge > 0) {
    if (paymentMode() !== "test")
      return NextResponse.json({ error: "Online payment isn't connected yet. Please contact SiteGenie." }, { status: 501 });
    const now = new Date();
    // A year of online orders from today, or from the current end date when renewing early.
    const current = site.payment?.paidUntil ? Date.parse(site.payment.paidUntil) : 0;
    const paidUntil = site.siteType === "dynamic" ? addYear(new Date(Math.max(now.getTime(), renewal ? current : 0))) : null;
    paid = {
      ...site,
      payment: {
        plan: site.siteType,
        amount: charge + (site.payment?.amount ?? 0),
        mode: "test",
        reference: `TEST-${newId()}`,
        paidAt: now.toISOString(),
        paidUntil,
      },
      renewalReminderSentFor: null,
    };
    try {
      await saveSite(paid, `Test payment ₹${charge} for ${slug}${renewal ? " (renewal)" : ""}`, rev);
    } catch (err) {
      if (err instanceof ConflictError) return NextResponse.json({ error: err.message }, { status: 409 });
      console.error(err);
      return NextResponse.json({ error: "Couldn't record the payment. Try again." }, { status: 502 });
    }
    if (renewal) return NextResponse.json({ paid: charge, payment: paid.payment, live: paid.live ?? null });
  }

  try {
    const live = await deploySite(paid, appOrigin(req));
    return NextResponse.json({ paid: charge, payment: live.payment, live: live.live });
  } catch (err) {
    console.error(err);
    // Paid but not deployed yet: the owner can retry "Update live website" from the edit screen.
    return NextResponse.json({ error: (err as Error).message, paid: charge, payment: paid.payment }, { status: 502 });
  }
}
