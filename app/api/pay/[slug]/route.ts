import { NextResponse } from "next/server";
import { amountDue, appOrigin, deploySite, paymentMode } from "@/lib/publish";
import { getSite, keyMatches, newId, saveSite } from "@/lib/store";

export const maxDuration = 60;
type Ctx = { params: Promise<{ slug: string }> };

// Pay to get the website, then deploy it to its own hosting.
// Test mode records a simulated payment; a real gateway (e.g. Razorpay) plugs in here.
export async function POST(req: Request, { params }: Ctx) {
  const { slug } = await params;
  const site = await getSite(slug);
  if (!site) return NextResponse.json({ error: "Website not found" }, { status: 404 });
  if (!keyMatches(site, req.headers.get("x-edit-key"))) return NextResponse.json({ error: "This edit link isn't valid." }, { status: 403 });

  const due = amountDue(site);
  let paid = site;
  if (due > 0) {
    if (paymentMode() !== "test")
      return NextResponse.json({ error: "Online payment isn't connected yet. Please contact SiteGenie to publish." }, { status: 501 });
    paid = {
      ...site,
      payment: { plan: site.siteType, amount: due + (site.payment?.amount ?? 0), mode: "test", reference: `TEST-${newId()}`, paidAt: new Date().toISOString() },
    };
    try {
      await saveSite(paid, `Test payment ₹${due} for ${slug}`);
    } catch (err) {
      console.error(err);
      return NextResponse.json({ error: "Couldn't record the payment. Try again." }, { status: 502 });
    }
  }

  try {
    const live = await deploySite(paid, appOrigin(req));
    return NextResponse.json({ paid: due, payment: live.payment, live: live.live });
  } catch (err) {
    console.error(err);
    // Paid but not deployed yet: the owner can retry "Update live website" from the edit screen.
    return NextResponse.json({ error: (err as Error).message, paid: due, payment: paid.payment }, { status: 502 });
  }
}
