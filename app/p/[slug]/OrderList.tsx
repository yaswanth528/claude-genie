"use client";
import { useState } from "react";
import { formatPrice, whatsappOrderLink } from "@/lib/catalogue";
import type { PublicCatalogue } from "@/lib/schema";

export function OrderList({ catalogue }: { catalogue: PublicCatalogue }) {
  const [qty, setQty] = useState<number[]>(() => catalogue.items.map(() => 0));
  const change = (i: number, d: number) => setQty((q) => q.map((n, j) => (j === i ? Math.max(0, n + d) : n)));

  const lines = catalogue.items
    .map((it, i) => ({ name: it.name, price: it.price, qty: qty[i] }))
    .filter((l) => l.qty > 0);
  const total = lines.reduce((s, l) => s + (l.price ?? 0) * l.qty, 0);

  return (
    <>
      <div>
        {catalogue.items.map((it, i) => (
          <div key={i} className="product">
            <div>
              <div className="name">{it.name}</div>
              <div className="meta">
                {formatPrice(it.price)}
                {it.unit ? ` ${it.unit}` : ""}
              </div>
            </div>
            <div className="qty">
              <button onClick={() => change(i, -1)} aria-label={`One less ${it.name}`} disabled={qty[i] === 0}>
                −
              </button>
              <span aria-live="polite">{qty[i]}</span>
              <button onClick={() => change(i, 1)} aria-label={`One more ${it.name}`}>
                +
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="order-bar">
        {lines.length > 0 ? (
          <a
            className="btn wa block"
            href={whatsappOrderLink(catalogue.whatsapp, catalogue.businessName, lines)}
            target="_blank"
            rel="noreferrer"
          >
            Order on WhatsApp · {formatPrice(total)}
          </a>
        ) : (
          <button className="btn wa block" disabled>
            Pick items to order
          </button>
        )}
      </div>
    </>
  );
}
