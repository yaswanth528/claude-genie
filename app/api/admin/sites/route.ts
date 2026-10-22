import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { deleteProject } from "@/lib/cloudflare";
import { backend, deleteSite, getSite, listOrders, listSites } from "@/lib/store";

const forbidden = () => NextResponse.json({ error: "Please log in." }, { status: 401 });

// Every shop, with payment, live address and order count.
export async function GET(req: Request) {
  if (!isAdmin(req)) return forbidden();
  const sites = await listSites();
  const rows = await Promise.all(
    sites.map(async (s) => ({
      slug: s.slug,
      businessName: s.businessName,
      siteType: s.siteType,
      theme: s.theme.id,
      products: s.items.length,
      whatsapp: s.whatsapp,
      updatedAt: s.updatedAt,
      payment: s.payment ?? null,
      live: s.live ?? null,
      orders: s.siteType === "dynamic" ? (await listOrders(s.slug).catch(() => [])).length : null,
    })),
  );
  return NextResponse.json({ backend: backend(), sites: rows });
}

// Delete a shop: its data, its orders and its separately hosted website.
export async function DELETE(req: Request) {
  if (!isAdmin(req)) return forbidden();
  const slug = new URL(req.url).searchParams.get("slug") ?? "";
  const site = await getSite(slug);
  if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    if (site.live?.project) await deleteProject(site.live.project).catch((e) => console.error("Cloudflare delete:", e));
    await deleteSite(slug);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
