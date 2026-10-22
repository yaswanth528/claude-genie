import { NextResponse } from "next/server";
import { orderTotal } from "@/lib/catalogue";
import type { Order } from "@/lib/schema";
import { getSite, keyMatches, listOrders, newId, saveOrder } from "@/lib/store";

type Ctx = { params: Promise<{ slug: string }> };
const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

// A customer places an order on a dynamic (cart) website. Prices come from the saved
// site, not the browser, so the total can't be tampered with.
export async function POST(req: Request, { params }: Ctx) {
  const { slug } = await params;
  const site = await getSite(slug);
  if (!site) return NextResponse.json({ error: "Website not found" }, { status: 404 });
  if (site.siteType !== "dynamic") return NextResponse.json({ error: "This shop takes orders on WhatsApp." }, { status: 400 });

  const body = (await req.json().catch(() => ({}))) as { customer?: Record<string, unknown>; lines?: { index?: number; qty?: number }[] };
  const customer = {
    name: str(body.customer?.name, 80),
    phone: str(body.customer?.phone, 20),
    address: str(body.customer?.address, 400),
    note: str(body.customer?.note, 300),
  };
  const errors: string[] = [];
  if (!customer.name) errors.push("Add your name.");
  if (customer.phone.replace(/\D/g, "").length < 10) errors.push("Add a phone number we can call.");
  if (!customer.address) errors.push("Add a delivery address.");

  const lines = (body.lines ?? [])
    .filter((l) => Number.isInteger(l.index) && l.index! >= 0 && l.index! < site.items.length && Number.isInteger(l.qty) && l.qty! > 0 && l.qty! <= 99)
    .map((l) => ({ name: site.items[l.index!].name, price: site.items[l.index!].price, qty: l.qty! }));
  if (lines.length === 0) errors.push("Your cart is empty.");
  if (errors.length) return NextResponse.json({ errors }, { status: 400 });

  const order: Order = { id: newId(), slug, createdAt: new Date().toISOString(), customer, lines, total: orderTotal(lines) };
  try {
    await saveOrder(order);
  } catch (err) {
    console.error(err);
    // Still let the customer send the order on WhatsApp.
    return NextResponse.json({ order, saved: false });
  }
  return NextResponse.json({ order, saved: true });
}

// The owner's order list.
export async function GET(req: Request, { params }: Ctx) {
  const { slug } = await params;
  const site = await getSite(slug);
  if (!site) return NextResponse.json({ error: "Website not found" }, { status: 404 });
  if (!keyMatches(site, req.headers.get("x-edit-key"))) return NextResponse.json({ error: "This edit link isn't valid." }, { status: 403 });
  return NextResponse.json({ orders: await listOrders(slug) });
}
