// Order rules shared by the place-order, buyer and owner endpoints.
import { formatPrice, lineName, orderTotal } from "./catalogue";
import type { Order, OrderLine, OrderStatus, Site } from "./schema";

export const STATUS_LABEL: Record<OrderStatus, string> = {
  new: "Waiting for the shop to confirm",
  confirmed: "Confirmed by the shop",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const statusOf = (o: Order): OrderStatus => o.status ?? "new";
// Buyers can change or cancel only until the shop confirms.
export const buyerCanChange = (o: Order) => statusOf(o) === "new";

export const money = (n: unknown, max = 1_000_000) => (typeof n === "number" && Number.isFinite(n) && n >= 0 ? Math.min(Math.round(n), max) : 0);

export function totalOf(o: Pick<Order, "lines" | "discount" | "deliveryCharge">): number {
  return Math.max(0, orderTotal(o.lines) - (o.discount ?? 0) + (o.deliveryCharge ?? 0));
}

type RawLine = { index?: number; qty?: number; option?: string | null };

// Turn lines sent by a browser into order lines using the shop's saved products.
// Prices come from the server, never the browser. When `previous` is given (an order
// being changed), items already in the order keep the price they were ordered at.
export function buildLines(site: Site, raw: RawLine[] | undefined, previous?: OrderLine[]): { lines: OrderLine[]; errors: string[] } {
  const errors: string[] = [];
  const valid = (raw ?? []).filter(
    (l) => Number.isInteger(l.index) && l.index! >= 0 && l.index! < site.items.length && Number.isInteger(l.qty) && l.qty! > 0 && l.qty! <= 99,
  );
  const lines = valid.map((l) => {
    const item = site.items[l.index!];
    const option = item.options?.length ? (item.options.includes(l.option ?? "") ? l.option! : item.options[0]) : null;
    const before = previous?.find((p) => p.name === item.name && (p.option ?? null) === option);
    return { name: item.name, price: before ? before.price : item.price, qty: l.qty!, option };
  });
  // Items newly added (not already in the order) must be in stock.
  const soldOut = valid
    .filter((l) => site.items[l.index!].inStock === false && !previous?.some((p) => p.name === site.items[l.index!].name))
    .map((l) => site.items[l.index!].name);
  if (soldOut.length) errors.push(`Sorry, ${soldOut.join(", ")} ${soldOut.length > 1 ? "are" : "is"} out of stock.`);
  if (lines.length === 0) errors.push("The order has no items.");
  return { lines, errors };
}

// What a buyer or owner may see (never the token hash).
export function publicOrder(o: Order) {
  const { tokenHash: _t, ...rest } = o;
  return { ...rest, status: statusOf(o) };
}

export function orderSummary(o: Order, site: Pick<Site, "businessName">, link?: string): string {
  const lines = o.lines.map((l) => `• ${lineName(l)} × ${l.qty}${l.price !== null ? ` — ${formatPrice(l.price * l.qty)}` : ""}`);
  return [
    `${site.businessName}: order #${o.id}`,
    `Status: ${STATUS_LABEL[statusOf(o)]}`,
    ...lines,
    ...(o.discount ? [`Discount: −${formatPrice(o.discount)}`] : []),
    ...(o.deliveryCharge ? [`Delivery: ${formatPrice(o.deliveryCharge)}`] : []),
    `Total: ${formatPrice(totalOf(o))}`,
    ...(link ? ["", `See your order: ${link}`] : []),
  ].join("\n");
}

export const orderLink = (origin: string, o: Pick<Order, "slug" | "id">, token: string) => `${origin}/o/${o.slug}/${o.id}#t=${token}`;

// Indian numbers without a country code get +91 for wa.me links.
export const waNumber = (phone: string) => {
  const d = phone.replace(/\D/g, "");
  return d.length === 10 ? `91${d}` : d;
};
