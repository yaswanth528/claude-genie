import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { applyDeliveryRules, buildLines, buyerCanChange, money, publicOrder, statusOf, totalOf } from "@/lib/orders";
import { canEdit } from "@/lib/owner";
import { ORDER_STATUSES, type Order, type OrderStatus, type Site } from "@/lib/schema";
import { ConflictError, getOrderRev, getSite, hashKey, saveOrder } from "@/lib/store";

type Ctx = { params: Promise<{ slug: string; id: string }> };

function buyerToken(req: Request, order: Order): boolean {
  const t = req.headers.get("x-order-token");
  if (!t || !order.tokenHash) return false;
  const a = Buffer.from(hashKey(t), "hex");
  const b = Buffer.from(order.tokenHash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

async function load(req: Request, ctx: Ctx) {
  const { slug, id } = await ctx.params;
  const [site, { order, rev }] = await Promise.all([getSite(slug), getOrderRev(slug, id)]);
  if (!site || !order) return { error: NextResponse.json({ error: "Order not found." }, { status: 404 }) };
  const owner = canEdit(req, site);
  const buyer = buyerToken(req, order);
  if (!owner && !buyer) return { error: NextResponse.json({ error: "This order link isn't valid." }, { status: 403 }) };
  return { site, order, rev, owner, buyer };
}

// What the "My order" page needs: the order plus the shop's look and products.
function view(site: Site, order: Order, owner: boolean) {
  return {
    order: publicOrder(order),
    canChange: buyerCanChange(order),
    owner,
    shop: {
      businessName: site.businessName,
      upiId: site.upiId ?? null,
      delivery: site.delivery ?? null,
      whatsapp: site.whatsapp,
      theme: site.theme,
      items: site.items.map((i) => ({ name: i.name, price: i.price, unit: i.unit, options: i.options ?? [], inStock: i.inStock !== false })),
    },
  };
}

export async function GET(req: Request, ctx: Ctx) {
  const r = await load(req, ctx);
  if ("error" in r) return r.error;
  return NextResponse.json(view(r.site, r.order, r.owner));
}

const stamp = (o: Order, by: "buyer" | "owner", text: string): Order => {
  const at = new Date().toISOString();
  return { ...o, updatedAt: at, events: [...(o.events ?? []), { at, by, text }].slice(-30) };
};

// Buyer: change items or cancel while the order is new.
// Owner: set status, change items, discount and delivery charge.
export async function PUT(req: Request, ctx: Ctx) {
  const r = await load(req, ctx);
  if ("error" in r) return r.error;
  const { site, owner } = r;
  let order = r.order;
  const body = (await req.json().catch(() => ({}))) as {
    lines?: { index?: number; qty?: number; option?: string | null }[];
    cancel?: boolean;
    status?: string;
    discount?: number;
    deliveryCharge?: number;
    seen?: boolean;
    paid?: boolean;
  };

  if (!owner) {
    if (!buyerCanChange(order))
      return NextResponse.json({ error: "The shop has already confirmed this order. Message them on WhatsApp to change it." }, { status: 409 });
    if (body.cancel) {
      order = stamp({ ...order, status: "cancelled", changedByBuyer: true }, "buyer", "Cancelled by buyer");
    } else {
      const built = buildLines(site, body.lines, order.lines);
      const rules = applyDeliveryRules(site, built.lines);
      if (rules.error) built.errors.push(rules.error);
      if (built.errors.length) return NextResponse.json({ errors: built.errors }, { status: 400 });
      order = stamp({ ...order, lines: built.lines, deliveryCharge: rules.deliveryCharge || undefined, changedByBuyer: true }, "buyer", "Changed by buyer");
    }
  } else {
    const changes: string[] = [];
    if (body.lines) {
      const built = buildLines(site, body.lines, order.lines);
      if (built.errors.length) return NextResponse.json({ errors: built.errors }, { status: 400 });
      order = { ...order, lines: built.lines };
      changes.push("items changed");
    }
    if (body.discount !== undefined) {
      order = { ...order, discount: money(body.discount) };
      changes.push(`discount ₹${money(body.discount)}`);
    }
    if (body.deliveryCharge !== undefined) {
      order = { ...order, deliveryCharge: money(body.deliveryCharge) };
      changes.push(`delivery ₹${money(body.deliveryCharge)}`);
    }
    if (body.status !== undefined) {
      if (!ORDER_STATUSES.includes(body.status as OrderStatus)) return NextResponse.json({ error: "Unknown status." }, { status: 400 });
      if (body.status !== statusOf(order)) changes.push(`status ${body.status.replace(/_/g, " ")}`);
      order = { ...order, status: body.status as OrderStatus };
    }
    if (body.seen) order = { ...order, changedByBuyer: false };
    if (typeof body.paid === "boolean" && body.paid !== !!order.paid) {
      order = { ...order, paid: body.paid };
      changes.push(body.paid ? "marked paid" : "marked unpaid");
    }
    if (changes.length) order = stamp(order, "owner", changes.join(", "));
  }

  order = { ...order, total: totalOf(order) };
  try {
    await saveOrder(order, r.rev);
  } catch (err) {
    if (err instanceof ConflictError) return NextResponse.json({ error: err.message }, { status: 409 });
    console.error(err);
    return NextResponse.json({ error: "Couldn't save. Try again." }, { status: 502 });
  }
  return NextResponse.json(view(site, order, owner));
}
