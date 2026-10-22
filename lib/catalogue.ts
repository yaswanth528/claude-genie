// Deterministic rules: validation, patch application, undo, slugs and WhatsApp links.
// No AI in here — this is the "Logic" and "Script" stages from the MVP scope.
import type { Item, Order, Patch, Product, Site, SiteContent } from "./schema";

const HISTORY_LIMIT = 10;

export const formatPrice = (p: number | null) => (p === null ? "—" : `₹${p.toLocaleString("en-IN")}`);

export function validateItems(items: Item[]): string[] {
  const errors: string[] = [];
  if (items.length === 0) errors.push("Add at least one product.");
  const seen = new Set<string>();
  items.forEach((it, i) => {
    const name = it.name.trim();
    if (!name) errors.push(`Item ${i + 1} needs a name.`);
    if (it.price === null || !Number.isFinite(it.price)) errors.push(`"${name || `Item ${i + 1}`}" needs a price.`);
    else if (it.price < 0) errors.push(`"${name}" has a negative price.`);
    const key = name.toLowerCase();
    if (key && seen.has(key)) errors.push(`"${name}" is listed twice.`);
    seen.add(key);
  });
  return errors;
}

export function normaliseWhatsapp(input: string): string | null {
  let digits = input.replace(/\D/g, "");
  if (digits.length === 10) digits = `91${digits}`; // assume India
  return digits.length >= 11 && digits.length <= 15 ? digits : null;
}

export function contentOf(site: Site): SiteContent {
  const { slug: _s, whatsapp: _w, editKeyHash: _k, updatedAt: _u, history: _h, payment: _p, live: _l, ...content } = site;
  return content;
}

export function applyPatch(items: Product[], businessName: string, patch: Patch) {
  const next = items.map((it) => ({ ...it }));
  let name = businessName;
  const removals: number[] = [];
  for (const op of patch.ops) {
    const target = op.index !== null ? next[op.index] : undefined;
    switch (op.op) {
      case "set_price":
        if (target && op.price !== null) Object.assign(target, { price: op.price, lowConfidence: false });
        break;
      case "rename":
        if (target && op.name) target.name = op.name;
        break;
      case "add":
        if (op.name)
          next.push({ name: op.name, price: op.price, unit: null, lowConfidence: false, description: "", image: null });
        break;
      case "remove":
        if (target) removals.push(op.index!);
        break;
      case "set_business_name":
        if (op.name) name = op.name;
        break;
    }
  }
  return { businessName: name, items: next.filter((_, i) => !removals.includes(i)) };
}

// Apply new content and remember the current version so it can be undone.
export function withChange(site: Site, next: Partial<SiteContent>): Site {
  const snapshot = { content: contentOf(site), updatedAt: site.updatedAt };
  return {
    ...site,
    ...next,
    updatedAt: new Date().toISOString(),
    history: [snapshot, ...(site.history ?? [])].slice(0, HISTORY_LIMIT),
  };
}

// Restore the most recent earlier version.
export function undoLast(site: Site): Site | null {
  const [previous, ...rest] = site.history ?? [];
  if (!previous) return null;
  return { ...site, ...previous.content, updatedAt: new Date().toISOString(), history: rest };
}

export function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base || "shop"}-${suffix}`;
}

type Line = { name: string; qty: number; price: number | null };
export const orderTotal = (lines: Line[]) => lines.reduce((s, l) => s + (l.price ?? 0) * l.qty, 0);

export function orderText(businessName: string, lines: Line[], customer?: Order["customer"], orderId?: string) {
  return [
    `Hi ${businessName}, I'd like to order:`,
    ...lines.map((l) => `• ${l.name} × ${l.qty}${l.price !== null ? ` — ${formatPrice(l.price * l.qty)}` : ""}`),
    `Total: ${formatPrice(orderTotal(lines))}`,
    ...(customer
      ? [
          "",
          `Name: ${customer.name}`,
          `Phone: ${customer.phone}`,
          `Deliver to: ${customer.address}`,
          ...(customer.note ? [`Note: ${customer.note}`] : []),
        ]
      : []),
    ...(orderId ? [`Order ID: ${orderId}`] : []),
  ].join("\n");
}

export const whatsappLink = (whatsapp: string, text: string) =>
  `https://wa.me/${whatsapp}?text=${encodeURIComponent(text)}`;
