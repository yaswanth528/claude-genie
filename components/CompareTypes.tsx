"use client";
// "Compare both designs": the owner's own website shown as a Showcase (static) and as an
// Online store (dynamic), side by side on a laptop and switchable on a phone, so they can
// see the difference before choosing.
import { useEffect, useState } from "react";
import { PRICES, YEARLY } from "@/lib/prices";
import type { SiteContent } from "@/lib/schema";
import { SiteView } from "./site/SiteView";

type Type = "static" | "dynamic";

const INFO: Record<Type, { name: string; tag: string; points: string[]; price: string }> = {
  static: {
    name: "Showcase",
    tag: "Great",
    points: ["A beautiful catalogue of your products", "Customers send their list to you on WhatsApp", "“Ask on WhatsApp” on every product", "Open-now badge, map and reviews"],
    price: `₹${PRICES.static.toLocaleString("en-IN")} one-time`,
  },
  dynamic: {
    name: "Online store",
    tag: "Greatest",
    points: [
      "Everything in Showcase",
      "Cart and checkout: customers order in a minute",
      "Delivery areas, charges and minimum order",
      "Order tracking for customers, an orders list for you",
    ],
    price: `₹${PRICES.static.toLocaleString("en-IN")} + ₹${YEARLY.toLocaleString("en-IN")}/yr`,
  },
};

export function CompareTypes({ site, onChoose, onClose }: { site: SiteContent & { whatsapp?: string }; onChoose: (t: Type) => void; onClose: () => void }) {
  const [show, setShow] = useState<Type>(site.siteType); // phone: which one is on screen
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const column = (t: Type) => (
    <div className={`cmp-col ${show === t ? "show" : ""} ${t}`} key={t}>
      <div className="cmp-head">
        <strong>{INFO[t].name}</strong>
        <span className={`cmp-tag ${t}`}>{INFO[t].tag}</span>
        {site.siteType === t && <span className="cmp-current">Your choice</span>}
      </div>
      <div className="cmp-frame">
        <div className="cmp-scroll">
          <SiteView site={{ ...site, siteType: t, whatsapp: site.whatsapp || "919999999999" }} preview />
        </div>
      </div>
      <ul className="cmp-points">
        {INFO[t].points.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
      <p className="cmp-price">{INFO[t].price}</p>
      <button className={`btn ${t === "dynamic" ? "" : "ghost"}`} onClick={() => onChoose(t)}>
        {site.siteType === t ? `Keep ${INFO[t].name}` : `Choose ${INFO[t].name}`}
      </button>
    </div>
  );

  return (
    <div className="cmp-wrap" role="dialog" aria-modal="true" aria-labelledby="cmp-title">
      <button className="sheet-scrim" onClick={onClose} aria-label="Close" />
      <div className="cmp">
        <div className="cmp-top">
          <div>
            <h2 id="cmp-title">Your website, two ways</h2>
            <p className="hint">Scroll inside each phone to see the whole website.</p>
          </div>
          <button className="btn ghost sm" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="seg cmp-switch" role="tablist" aria-label="Design">
          {(["static", "dynamic"] as const).map((t) => (
            <button key={t} role="tab" aria-selected={show === t} className={show === t ? "on" : ""} onClick={() => setShow(t)}>
              {INFO[t].name}
            </button>
          ))}
        </div>
        <div className="cmp-cols">{(["static", "dynamic"] as const).map(column)}</div>
      </div>
    </div>
  );
}
