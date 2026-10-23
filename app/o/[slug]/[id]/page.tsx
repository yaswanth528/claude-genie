"use client";
// The buyer's "My order" page: status, items and total, in the shop's colours.
// While the shop hasn't confirmed, the buyer can change quantities/sizes, remove or add
// items, or cancel; each change opens WhatsApp to tell the shop.
import { use, useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { formatPrice, lineName, shortId, whatsappLink } from "@/lib/catalogue";
import { STATUS_LABEL, orderSummary, totalOf } from "@/lib/orders";
import { UpiPay } from "@/components/UpiPay";
import type { Delivery, Order, OrderStatus, ThemeId } from "@/lib/schema";
import { themeVars } from "@/lib/themes";

type ShopItem = { name: string; price: number | null; unit: string | null; options: string[]; inStock: boolean };
type View = {
  order: Order & { status: OrderStatus };
  canChange: boolean;
  shop: { businessName: string; whatsapp: string; upiId: string | null; delivery: Delivery | null; theme: { id: ThemeId; accent: number }; items: ShopItem[] };
};
type Draft = { index: number; option: string | null; qty: number; price: number | null; name: string };

const STEPS: OrderStatus[] = ["new", "confirmed", "out_for_delivery", "delivered"];
const HEADLINE: Record<OrderStatus, string> = {
  new: "Order placed",
  confirmed: "Order confirmed",
  out_for_delivery: "On its way",
  delivered: "Delivered",
  cancelled: "Order cancelled",
};
const SUBLINE: Record<OrderStatus, string> = {
  new: STATUS_LABEL.new + ".",
  confirmed: "The shop has confirmed your order.",
  out_for_delivery: "Your order is out for delivery.",
  delivered: "Your order has been delivered. Thank you!",
  cancelled: "This order was cancelled.",
};

export default function MyOrderPage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = use(params);
  const [token, setToken] = useState<string | null | undefined>(undefined);
  const [data, setData] = useState<View | null>(null);
  const [draft, setDraft] = useState<Draft[]>([]);
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ text: string; wa?: string } | null>(null);

  useEffect(() => setToken(new URLSearchParams(window.location.hash.slice(1)).get("t")), []);

  const toDraft = useCallback((v: View): Draft[] => {
    return v.order.lines.map((l) => ({
      index: Math.max(0, v.shop.items.findIndex((i) => i.name === l.name)),
      option: l.option ?? null,
      qty: l.qty,
      price: l.price,
      name: l.name,
    }));
  }, []);

  const loaded = useCallback(
    (v: View) => {
      setData(v);
      setDraft(toDraft(v));
    },
    [toDraft],
  );

  useEffect(() => {
    if (token === undefined) return;
    fetch(`/api/orders/${slug}/${id}`, { headers: { "x-order-token": token ?? "" } })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        loaded(d);
      })
      .catch((e) => setError((e as Error).message || "Couldn't load your order."));
  }, [token, slug, id, loaded]);

  const draftTotal = useMemo(() => draft.reduce((s, l) => s + (l.price ?? 0) * l.qty, 0), [draft]);

  async function put(body: unknown) {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(`/api/orders/${slug}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-order-token": token ?? "" },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) {
        setError(d.error ?? d.errors?.join(" ") ?? "Couldn't save.");
        return null;
      }
      loaded(d);
      return d as View;
    } catch {
      setError("Network error. Try again.");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    const v = await put({ lines: draft.map((l) => ({ index: l.index, qty: l.qty, option: l.option })) });
    if (v) {
      setEditing(false);
      setAdding(false);
      setNotice({
        text: "Your order is updated. Tell the shop on WhatsApp so they see it.",
        wa: whatsappLink(v.shop.whatsapp, `Updated order\n${orderSummary(v.order, v.shop)}`),
      });
    }
  }

  async function cancel() {
    if (!window.confirm("Cancel this order?")) return;
    const v = await put({ cancel: true });
    if (v) setNotice({ text: "Your order is cancelled.", wa: whatsappLink(v.shop.whatsapp, `Please cancel my order #${shortId(v.order.id)}. Thank you.`) });
  }

  if (token === undefined) return null;
  if (error && !data)
    return (
      <div className="order-page">
        <main className="op-main">
          <section className="op-hero">
            <h1>Order not found</h1>
            <p className="op-sub">{error}</p>
            <p className="op-fine">Open the order link from your WhatsApp message to the shop.</p>
          </section>
        </main>
      </div>
    );
  if (!data)
    return (
      <div className="order-page">
        <main className="op-main">
          <p className="op-fine op-center op-loading loading">Loading your order…</p>
        </main>
      </div>
    );

  const { order, shop, canChange } = data;
  const status = order.status;
  const vars = themeVars(shop.theme.id, shop.theme.accent) as CSSProperties;
  const stepAt = STEPS.indexOf(status);
  const change = (i: number, patch: Partial<Draft>) => setDraft((d) => d.map((l, j) => (j === i ? { ...l, ...patch } : l)).filter((l) => l.qty > 0));
  const addItem = (index: number) => {
    const it = shop.items[index];
    const option = it.options[0] ?? null;
    setDraft((d) => {
      const at = d.findIndex((l) => l.index === index && l.option === option);
      if (at >= 0) return d.map((l, j) => (j === at ? { ...l, qty: Math.min(99, l.qty + 1) } : l));
      return [...d, { index, option, qty: 1, price: it.price, name: it.name }];
    });
  };

  const placed = new Date(order.createdAt);
  const placedText = Number.isNaN(placed.getTime())
    ? ""
    : placed.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });
  const chatLink = whatsappLink(shop.whatsapp, `Hi, about my order #${shortId(order.id)}:`);

  return (
    <div className={`order-page theme-${shop.theme.id}`} style={vars}>
      <header className="op-bar">
        <div className="op-bar-row">
          <span className="op-shop">{shop.businessName}</span>
          <a className="op-bar-wa" href={chatLink} target="_blank" rel="noreferrer">
            Message the shop
          </a>
        </div>
      </header>

      <main className="op-main">
        <section className="op-hero">
          <p className="op-eyebrow">
            Order #{shortId(order.id)}
            {placedText && ` · ${placedText}`}
          </p>
          <h1>{HEADLINE[status]}</h1>
          <p className={`op-sub s-${status}`}>{SUBLINE[status]}</p>

          {status !== "cancelled" && (
            <ol className="op-steps" aria-label="Order progress">
              {STEPS.map((s, i) => (
                <li key={s} className={i < stepAt ? "done" : i === stepAt ? "done now" : ""} aria-current={i === stepAt ? "step" : undefined}>
                  <span className="op-dot" aria-hidden="true" />
                  {s === "new" ? "Placed" : s === "confirmed" ? "Confirmed" : s === "out_for_delivery" ? "On the way" : "Delivered"}
                </li>
              ))}
            </ol>
          )}
        </section>

        {notice && (
          <div className="op-note is-ok">
            <p>{notice.text}</p>
            {notice.wa && (
              <a className="btn wa sm" href={notice.wa} target="_blank" rel="noreferrer">
                Tell the shop on WhatsApp
              </a>
            )}
          </div>
        )}
        {error && (
          <div className="op-note is-bad">
            <p>{error}</p>
          </div>
        )}

        <section className="op-card">
          <h2>{editing ? "Change your order" : "Your items"}</h2>
          {!editing ? (
            <ul className="op-lines">
              {order.lines.map((l, i) => (
                <li key={i}>
                  <span>
                    {lineName(l)} <span className="op-qty">× {l.qty}</span>
                  </span>
                  <span className="op-price">{formatPrice((l.price ?? 0) * l.qty)}</span>
                </li>
              ))}
              {!!order.discount && (
                <li className="op-extra">
                  <span>Discount</span>
                  <span className="op-price">−{formatPrice(order.discount)}</span>
                </li>
              )}
              {!!order.deliveryCharge && (
                <li className="op-extra">
                  <span>Delivery</span>
                  <span className="op-price">{formatPrice(order.deliveryCharge)}</span>
                </li>
              )}
              <li className="op-total">
                <span>Total</span>
                <span className="op-price">{formatPrice(totalOf(order))}</span>
              </li>
            </ul>
          ) : (
            <div className="op-edit">
              {draft.map((l, i) => {
                const it = shop.items[l.index];
                return (
                  <div key={`${l.index}-${l.option}-${i}`} className="op-line">
                    <div className="op-line-name">
                      <strong>{l.name}</strong>
                      {!!it?.options.length && (
                        <select aria-label={`Size of ${l.name}`} value={l.option ?? ""} onChange={(e) => change(i, { option: e.target.value })}>
                          {it.options.map((o) => (
                            <option key={o} value={o}>
                              {o}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                    <div className="qty-row">
                      <button onClick={() => change(i, { qty: l.qty - 1 })} aria-label={`One less ${l.name}`}>
                        −
                      </button>
                      <span>{l.qty}</span>
                      <button onClick={() => change(i, { qty: Math.min(99, l.qty + 1) })} aria-label={`One more ${l.name}`}>
                        +
                      </button>
                    </div>
                    <span className="op-price">{formatPrice((l.price ?? 0) * l.qty)}</span>
                  </div>
                );
              })}
              {adding ? (
                <div className="op-add">
                  {shop.items.map((it, i) =>
                    it.inStock ? (
                      <button key={i} className="btn ghost sm" onClick={() => addItem(i)}>
                        + {it.name} · {formatPrice(it.price)}
                      </button>
                    ) : null,
                  )}
                </div>
              ) : (
                <button className="btn ghost sm" onClick={() => setAdding(true)}>
                  + Add more items
                </button>
              )}
              <p className="op-total-line">
                <span>New total</span> <span className="op-price">{formatPrice(draftTotal)}</span>
              </p>
              <p className="op-fine">Items already in your order keep the price you ordered at.</p>
            </div>
          )}

          {canChange &&
            (editing ? (
              <div className="op-actions">
                <button className="btn" onClick={save} disabled={busy || draft.length === 0} aria-busy={busy}>
                  {busy ? "Saving…" : "Save changes"}
                </button>
                <button
                  className="btn ghost"
                  onClick={() => {
                    setEditing(false);
                    setAdding(false);
                    setDraft(toDraft(data));
                  }}
                  disabled={busy}
                >
                  Discard
                </button>
              </div>
            ) : (
              <div className="op-actions">
                <button className="btn" onClick={() => setEditing(true)}>
                  Change order
                </button>
                <button className="btn ghost danger" onClick={cancel} disabled={busy}>
                  Cancel order
                </button>
              </div>
            ))}
          {!canChange && status !== "cancelled" && status !== "delivered" && (
            <p className="op-fine">The shop has confirmed your order. To change it, message them on WhatsApp.</p>
          )}
        </section>

        {order.paid ? (
          <div className="op-note is-ok">
            <p>✓ Paid. Thank you!</p>
          </div>
        ) : (
          shop.upiId &&
          ["confirmed", "out_for_delivery", "delivered"].includes(status) && (
            <section className="op-card">
              <h2>Pay the shop</h2>
              <UpiPay upiId={shop.upiId} payee={shop.businessName} amount={totalOf(order)} note={`Order ${shortId(order.id)}`} />
              <p className="op-fine">After paying, send the shop a screenshot on WhatsApp so they can mark it paid.</p>
            </section>
          )
        )}
        {!order.paid && shop.upiId && status === "new" && <p className="op-fine op-center">You can pay with UPI once the shop confirms your order and the final total.</p>}

        <section className="op-card">
          <h2>Deliver to</h2>
          <p className="op-who">
            <strong>{order.customer.name}</strong> · {order.customer.phone}
          </p>
          <p>{order.customer.address}</p>
          {order.customer.note && <p className="op-fine">“{order.customer.note}”</p>}
        </section>

        <div className="op-actions op-center">
          <a className="btn wa" href={chatLink} target="_blank" rel="noreferrer">
            Message the shop
          </a>
        </div>
        <p className="op-foot">
          <a href="/privacy">Privacy</a> · <a href="/">Made with SiteGenie</a>
        </p>
      </main>
    </div>
  );
}
