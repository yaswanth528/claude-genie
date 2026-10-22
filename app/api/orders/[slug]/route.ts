import { NextResponse } from "next/server";
import { canEdit } from "@/lib/owner";
import { orderTotal } from "@/lib/catalogue";
import type { Order } from "@/lib/schema";
import { getSite, listOrders, newId, saveOrder } from "@/lib/store";

type Ctx = { params: Promise<{ slug: string }> };

// Customer websites hosted on their own domain (Cloudflare Pages) post orders here.
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: CORS });

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}
const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

// A customer places an order on a dynamic (cart) website. Prices come from the saved
// site, not the browser, so the total can't be tampered with.
export async function POST(req: Request, { params }: Ctx) {
  const { slug } = await params;
  const site = await getSite(slug);
  if (!site) return json({ error: "Website not found" }, 404);
  if (site.siteType !== "dynamic") return json({ error: "This shop takes orders on WhatsApp." }, 400);

  const body = (await req.json().catch(() => ({}))) as {
    customer?: Record<string, unknown>;
    lines?: { index?: number; qty?: number; option?: string | null }[];
  };
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

  const valid = (body.lines ?? []).filter(
    (l) => Number.isInteger(l.index) && l.index! >= 0 && l.index! < site.items.length && Number.isInteger(l.qty) && l.qty! > 0 && l.qty! <= 99,
  );
  const lines = valid.map((l) => {
    const item = site.items[l.index!];
    // Only accept an option the product really has; products with options need one.
    const option = item.options?.length ? (item.options.includes(l.option ?? "") ? l.option! : item.options[0]) : null;
    return { name: item.name, price: item.price, qty: l.qty!, option };
  });
  const soldOut = valid.filter((l) => site.items[l.index!].inStock === false).map((l) => site.items[l.index!].name);
  if (soldOut.length) errors.push(`Sorry, ${soldOut.join(", ")} ${soldOut.length > 1 ? "are" : "is"} out of stock.`);
  if (lines.length === 0) errors.push("Your cart is empty.");
  if (errors.length) return json({ errors }, 400);

  const order: Order = { id: newId(), slug, createdAt: new Date().toISOString(), customer, lines, total: orderTotal(lines) };
  try {
    await saveOrder(order);
  } catch (err) {
    console.error(err);
    // Still let the customer send the order on WhatsApp.
    return json({ order, saved: false });
  }
  return json({ order, saved: true });
}

// The owner's order list.
export async function GET(req: Request, { params }: Ctx) {
  const { slug } = await params;
  const site = await getSite(slug);
  if (!site) return NextResponse.json({ error: "Website not found" }, { status: 404 });
  if (!canEdit(req, site)) return NextResponse.json({ error: "Log in with WhatsApp or open your private edit link." }, { status: 403 });
  return NextResponse.json({ orders: await listOrders(slug) });
}
