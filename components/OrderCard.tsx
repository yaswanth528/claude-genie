"use client";
// One order in the owner's Orders tab: status, items, discount/delivery, WhatsApp update.
import { useState } from "react";
import { formatPrice, lineName, shortId, whatsappLink } from "@/lib/catalogue";
import { STATUS_LABEL, orderSummary, totalOf, waNumber } from "@/lib/orders";
import type { Order, OrderStatus, Product } from "@/lib/schema";

type Props = {
  order: Order & { status: OrderStatus };
  slug: string;
  editKey: string;
  businessName: string;
  products: Product[];
  onSaved: (o: Order & { status: OrderStatus }) => void;
};

const NEXT: Partial<Record<OrderStatus, { to: OrderStatus; label: string }>> = {
  new: { to: "confirmed", label: "Confirm order" },
  confirmed: { to: "out_for_delivery", label: "Out for delivery" },
  out_for_delivery: { to: "delivered", label: "Mark delivered" },
};

export function OrderCard({ order, slug, editKey, businessName, products, onSaved }: Props) {
  const [editing, setEditing] = useState(false);
  const [qty, setQty] = useState<number[]>(order.lines.map((l) => l.qty));
  const [discount, setDiscount] = useState(String(order.discount ?? ""));
  const [delivery, setDelivery] = useState(String(order.deliveryCharge ?? ""));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const status = order.status;
  const closed = status === "delivered" || status === "cancelled";

  async function put(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(`/api/orders/${slug}/${order.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-edit-key": editKey },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) return setError(d.error ?? d.errors?.join(" ") ?? "Couldn't save.");
      onSaved(d.order);
      setEditing(false);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  function saveEdits() {
    const lines = order.lines
      .map((l, i) => ({ index: products.findIndex((p) => p.name === l.name), qty: qty[i], option: l.option ?? null }))
      .filter((l) => l.qty > 0 && l.index >= 0);
    put({ lines, discount: Number(discount) || 0, deliveryCharge: Number(delivery) || 0, seen: true });
  }

  const draft = { lines: order.lines.map((l, i) => ({ ...l, qty: qty[i] })).filter((l) => l.qty > 0), discount: Number(discount) || 0, deliveryCharge: Number(delivery) || 0 };
  const update = whatsappLink(waNumber(order.customer.phone), orderSummary(order, { businessName }));

  return (
    <article className={`card order s-${status}`}>
      <header>
        <div>
          <strong>{order.customer.name}</strong>
          <span className="hint small"> · #{shortId(order.id)}</span>
        </div>
        <span className="hint small">{new Date(order.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span>
      </header>
      <div className="row tight" style={{ marginTop: 6 }}>
        <span className={`pill ${status === "new" ? "warn" : status === "cancelled" ? "bad" : "ok"}`}>{STATUS_LABEL[status]}</span>
        {order.paid && <span className="pill ok">Paid ✓</span>}
        {order.changedByBuyer && (
          <button className="pill warn as-btn" onClick={() => put({ seen: true })} title="Mark as seen">
            Changed by buyer ✓
          </button>
        )}
      </div>

      {!editing ? (
        <ul className="plain">
          {order.lines.map((l, i) => (
            <li key={i}>
              <span>
                {lineName(l)} × {l.qty}
              </span>
              <span>{formatPrice((l.price ?? 0) * l.qty)}</span>
            </li>
          ))}
          {!!order.discount && (
            <li>
              <span>Discount</span>
              <span>−{formatPrice(order.discount)}</span>
            </li>
          )}
          {!!order.deliveryCharge && (
            <li>
              <span>Delivery</span>
              <span>{formatPrice(order.deliveryCharge)}</span>
            </li>
          )}
          <li>
            <strong>Total</strong>
            <strong>{formatPrice(totalOf(order))}</strong>
          </li>
        </ul>
      ) : (
        <div className="op-edit" style={{ marginTop: 8 }}>
          {order.lines.map((l, i) => (
            <div key={i} className="op-line">
              <span>{lineName(l)}</span>
              <div className="qty-row">
                <button onClick={() => setQty((q) => q.map((n, j) => (j === i ? Math.max(0, n - 1) : n)))} aria-label={`One less ${l.name}`}>
                  −
                </button>
                <span>{qty[i]}</span>
                <button onClick={() => setQty((q) => q.map((n, j) => (j === i ? Math.min(99, n + 1) : n)))} aria-label={`One more ${l.name}`}>
                  +
                </button>
              </div>
              <span className="op-price">{formatPrice((l.price ?? 0) * qty[i])}</span>
            </div>
          ))}
          <div className="prod-line">
            <label>
              Discount ₹
              <input inputMode="numeric" value={discount} onChange={(e) => setDiscount(e.target.value.replace(/\D/g, ""))} placeholder="0" />
            </label>
            <label>
              Delivery ₹
              <input inputMode="numeric" value={delivery} onChange={(e) => setDelivery(e.target.value.replace(/\D/g, ""))} placeholder="0" />
            </label>
          </div>
          <p className="op-total-line">
            <strong>New total</strong> <strong>{formatPrice(totalOf(draft))}</strong>
          </p>
        </div>
      )}

      <p className="hint small">
        {order.customer.phone} · {order.customer.address}
        {order.customer.note ? ` · “${order.customer.note}”` : ""}
      </p>
      {error && <div className="errors"><p>{error}</p></div>}

      <div className="row tight">
        {editing ? (
          <>
            <button className="btn sm" onClick={saveEdits} disabled={busy} aria-busy={busy}>
              {busy ? "Saving…" : "Save"}
            </button>
            <button className="btn ghost sm" onClick={() => setEditing(false)} disabled={busy}>
              Cancel
            </button>
          </>
        ) : (
          <>
            {NEXT[status] && (
              <button className="btn sm" onClick={() => put({ status: NEXT[status]!.to, seen: true })} disabled={busy}>
                {NEXT[status]!.label}
              </button>
            )}
            {!closed && (
              <button className="btn ghost sm" onClick={() => setEditing(true)}>
                Edit items / price
              </button>
            )}
            <a className="btn wa sm" href={update} target="_blank" rel="noreferrer">
              Send update on WhatsApp
            </a>
            {status !== "cancelled" && (
              <button className="btn ghost sm" onClick={() => put({ paid: !order.paid })} disabled={busy}>
                {order.paid ? "Mark unpaid" : "Mark paid"}
              </button>
            )}
            {!closed && (
              <button
                className="btn ghost sm danger"
                onClick={() => window.confirm("Cancel this order?") && put({ status: "cancelled", seen: true })}
                disabled={busy}
              >
                Cancel order
              </button>
            )}
          </>
        )}
      </div>
    </article>
  );
}
