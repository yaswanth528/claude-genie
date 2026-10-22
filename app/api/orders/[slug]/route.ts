import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { buildLines, orderLink, publicOrder, totalOf } from "@/lib/orders";
import { canEdit } from "@/lib/owner";
import { appOrigin } from "@/lib/publish";
import type { Order } from "@/lib/schema";
import { getSite, hashKey, listOrders, newId, saveOrder } from "@/lib/store";

type Ctx = { params: Promise<{ slug: string }> };

// Customer websites hosted on their own domain (Cloudflare Pages) post orders here.
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: CORS });

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}
const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

// A buyer places an order on a dynamic (cart) website. Prices come from the saved site,
// not the browser. The buyer gets a private link to see, change or cancel the order.
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
  const built = buildLines(site, body.lines);
  errors.push(...built.errors.map((e) => (e === "The order has no items." ? "Your cart is empty." : e)));
  if (errors.length) return json({ errors }, 400);

  const token = randomBytes(18).toString("base64url");
  const now = new Date().toISOString();
  const order: Order = {
    id: newId(),
    slug,
    createdAt: now,
    updatedAt: now,
    customer,
    lines: built.lines,
    total: totalOf({ lines: built.lines }),
    status: "new",
    tokenHash: hashKey(token),
    events: [{ at: now, by: "buyer", text: "Order placed" }],
  };
  const link = orderLink(appOrigin(req), order, token);
  try {
    await saveOrder(order);
  } catch (err) {
    console.error(err);
    // Still let the buyer send the order on WhatsApp.
    return json({ order: publicOrder(order), saved: false });
  }
  return json({ order: publicOrder(order), saved: true, link });
}

// The owner's order list.
export async function GET(req: Request, { params }: Ctx) {
  const { slug } = await params;
  const site = await getSite(slug);
  if (!site) return NextResponse.json({ error: "Website not found" }, { status: 404 });
  if (!canEdit(req, site)) return NextResponse.json({ error: "Log in with WhatsApp or open your private edit link." }, { status: 403 });
  return NextResponse.json({ orders: (await listOrders(slug)).map(publicOrder) });
}
