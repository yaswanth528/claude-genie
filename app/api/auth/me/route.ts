import { NextResponse } from "next/server";
import { OWNER_COOKIE, sessionPhone } from "@/lib/owner";
import { sitesForPhone } from "@/lib/store";
import { whatsappLoginReady } from "@/lib/whatsapp";

// The logged-in owner and their websites.
export async function GET(req: Request) {
  const phone = sessionPhone(req);
  if (!phone) return NextResponse.json({ loggedIn: false, loginAvailable: whatsappLoginReady() }, { status: 401 });
  const sites = await sitesForPhone(phone);
  return NextResponse.json({
    loggedIn: true,
    phone,
    sites: sites.map((s) => ({ slug: s.slug, businessName: s.businessName, siteType: s.siteType, live: s.live ?? null, paid: !!s.payment, updatedAt: s.updatedAt })),
  });
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(OWNER_COOKIE);
  return res;
}
