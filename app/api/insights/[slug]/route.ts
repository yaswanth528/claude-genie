import { NextResponse } from "next/server";
import { getSite, keyMatches, listOrders, visitsByDay } from "@/lib/store";

// The owner's numbers: visits per day for the last 14 days, and orders this week/month.
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const site = await getSite(slug);
  if (!site) return NextResponse.json({ error: "Website not found" }, { status: 404 });
  if (!keyMatches(site, req.headers.get("x-edit-key"))) return NextResponse.json({ error: "This edit link isn't valid." }, { status: 403 });

  const [visits, orders] = await Promise.all([visitsByDay(slug, 14).catch(() => null), listOrders(slug).catch(() => [])]);
  const now = Date.now();
  const within = (days: number) => orders.filter((o) => now - Date.parse(o.createdAt) < days * 86400000);
  const sum = (list: typeof orders) => list.reduce((s, o) => s + o.total, 0);
  const week = within(7);
  const month = within(30);
  return NextResponse.json({
    visits, // null when the storage backend doesn't track visits
    orders: { week: week.length, weekTotal: sum(week), month: month.length, monthTotal: sum(month), all: orders.length },
  });
}
