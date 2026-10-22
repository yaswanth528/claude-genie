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
      <main className="narrow">
        <h1>Order</h1>
        <div className="errors">
          <p>{error}</p>
        </div>
        <p className="hint">Open the order link from your WhatsApp message to the shop.</p>
      </main>
    );
  if (!data) return <main className="narrow"><p className="hint" style={{ marginTop: 24 }}>Loading your order…</p></main>;

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

  return (
    <div className="order-page" style={vars}>
      <main className="narrow">
        <p className="op-shop">{shop.businessName}</p>
        <h1>Order #{shortId(order.id)}</h1>
        <p className={`op-status s-${status}`}>{STATUS_LABEL[status]}</p>

        {status !== "cancelled" && (
          <ol className="op-steps" aria-label="Order progress">
            {STEPS.map((s, i) => (
              <li key={s} className={i <= stepAt ? "done" : ""}>
                {s === "new" ? "Placed" : s === "confirmed" ? "Confirmed" : s === "out_for_delivery" ? "On the way" : "Delivered"}
              </li>
            ))}
          </ol>
        )}

        {notice && (
          <div className="success">
            <p>{notice.text}</p>
            {notice.wa && (
              <a className="btn wa sm" href={notice.wa} target="_blank" rel="noreferrer" style={{ marginTop: 8 }}>
                Tell the shop on WhatsApp
              </a>
            )}
          </div>
        )}
        {error && <div className="errors"><p>{error}</p></div>}

        <div className="card op-card">
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
              <li className="op-total">
                <strong>Total</strong>
                <strong>{formatPrice(totalOf(order))}</strong>
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
                <strong>New total</strong> <strong>{formatPrice(draftTotal)}</strong>
              </p>
              <p className="hint small">Items already in your order keep the price you ordered at.</p>
            </div>
          )}
        </div>

        {order.paid ? (
          <div className="success">✓ Paid. Thank you!</div>
        ) : (
          shop.upiId &&
          ["confirmed", "out_for_delivery", "delivered"].includes(status) && (
            <div className="card op-card">
              <strong>Pay the shop</strong>
              <UpiPay upiId={shop.upiId} payee={shop.businessName} amount={totalOf(order)} note={`Order ${shortId(order.id)}`} />
              <p className="hint small">After paying, send the shop a screenshot on WhatsApp so they can mark it paid.</p>
            </div>
          )
        )}
        {!order.paid && shop.upiId && status === "new" && (
          <p className="hint" style={{ marginTop: 12 }}>You can pay with UPI once the shop confirms your order and the final total.</p>
        )}

        <div className="card op-card">
          <p className="hint small">Deliver to</p>
          <p>
            <strong>{order.customer.name}</strong> · {order.customer.phone}
          </p>
          <p>{order.customer.address}</p>
          {order.customer.note && <p className="hint">“{order.customer.note}”</p>}
        </div>

        {canChange ? (
          editing ? (
            <div className="row">
              <button className="btn" onClick={save} disabled={busy || draft.length === 0}>
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
            <div className="row">
              <button className="btn" onClick={() => setEditing(true)}>
                Change order
              </button>
              <button className="btn ghost danger" onClick={cancel} disabled={busy}>
                Cancel order
              </button>
            </div>
          )
        ) : (
          status !== "cancelled" &&
          status !== "delivered" && (
            <p className="hint" style={{ marginTop: 16 }}>
              The shop has confirmed your order. To change it, message them on WhatsApp.
            </p>
          )
        )}
        <div className="row">
          <a className="btn wa" href={whatsappLink(shop.whatsapp, `Hi, about my order #${shortId(order.id)}:`)} target="_blank" rel="noreferrer">
            Message the shop
          </a>
        </div>
      </main>
    </div>
  );
}
