"use client";
// "Pay ₹1,999 to get your website" — then the site is deployed to its own address.
// Runs in test mode until a real payment gateway is connected.
import { useState } from "react";
import { formatPrice } from "@/lib/catalogue";
import type { Live } from "@/lib/schema";

type Props = {
  slug: string;
  editKey: string;
  siteType: "static" | "dynamic";
  due: number;
  upgrade?: boolean;
  onLive: (live: Live) => void;
};

const INCLUDES = {
  static: ["Your own website address", "Products, photos, about and contact", "Orders on WhatsApp", "Unlimited voice changes"],
  dynamic: ["Everything in Static", "Cart and checkout with delivery address", "Orders list for you", "First year included (₹3,000/yr after)"],
};

export function PayPanel({ slug, editKey, siteType, due, upgrade, onLive }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paidNotLive, setPaidNotLive] = useState(false);

  async function pay() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/pay/${slug}`, { method: "POST", headers: { "x-edit-key": editKey } });
      const data = await res.json();
      if (res.ok && data.live) return onLive(data.live);
      if (data.payment) setPaidNotLive(true);
      setError(data.error ?? "Couldn't complete this step.");
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pay card">
      <div className="pay-head">
        <div>
          <p className="pay-plan">{siteType === "dynamic" ? "Dynamic website" : "Static website"}</p>
          <p className="pay-amount">{formatPrice(due)}</p>
          <p className="hint">{upgrade ? "Upgrade from Static to Dynamic" : siteType === "dynamic" ? "₹1,999 setup + ₹3,000 first year" : "One-time, no yearly fee"}</p>
        </div>
        <span className="test-badge">Test mode</span>
      </div>
      <ul className="pay-list">
        {INCLUDES[siteType].map((x) => (
          <li key={x}>{x}</li>
        ))}
      </ul>
      {error && (
        <div className="errors">
          <p>{error}</p>
          {paidNotLive && <p>Your payment is recorded. Tap the button again to retry putting the site live.</p>}
        </div>
      )}
      <button className="btn block" onClick={pay} disabled={busy}>
        {busy ? "Putting your website live…" : paidNotLive ? "Retry putting it live" : `Pay ${formatPrice(due)} to get your website`}
      </button>
      <p className="hint small">
        Test mode: no money is charged. Real payments (UPI, cards) will be added before launch. By continuing you agree to the{" "}
        <a href="/terms" target="_blank" rel="noreferrer">
          Terms
        </a>{" "}
        and{" "}
        <a href="/privacy" target="_blank" rel="noreferrer">
          Privacy policy
        </a>
        .
      </p>
    </div>
  );
}
