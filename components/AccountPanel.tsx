"use client";
// Owner account bits on the edit screen: the dynamic plan's renewal, and the email
// address for new-order alerts.
import { useState } from "react";
import { formatPrice } from "@/lib/catalogue";

type Renewal = { state: "none" | "active" | "due" | "grace" | "lapsed"; paidUntil: string | null; due: number };

export function AccountPanel({
  slug,
  editKey,
  renewal,
  ownerEmail,
  onChanged,
}: {
  slug: string;
  editKey: string;
  renewal: Renewal;
  ownerEmail: string | null;
  onChanged: () => void;
}) {
  const [email, setEmail] = useState(ownerEmail ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const until = renewal.paidUntil ? new Date(renewal.paidUntil).toLocaleDateString("en-IN", { dateStyle: "medium" }) : null;

  async function call(url: string, init: RequestInit, ok: string) {
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch(url, { ...init, headers: { "Content-Type": "application/json", "x-edit-key": editKey } });
      const d = await r.json();
      if (!r.ok) return setMsg({ ok: false, text: d.error ?? "Something went wrong." });
      setMsg({ ok: true, text: ok });
      onChanged();
    } catch {
      setMsg({ ok: false, text: "Network error. Try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card account">
      {renewal.state !== "none" && (
        <div className="account-row">
          <div>
            <strong>Online orders</strong>
            <p className="hint small">
              {renewal.state === "lapsed"
                ? "Paused: your yearly plan ended. Buyers are asked to order on WhatsApp."
                : renewal.state === "grace"
                  ? `Your yearly plan ended on ${until}. Orders keep working for a few more days.`
                  : `Paid until ${until}`}
            </p>
          </div>
          {renewal.due > 0 && (
            <button className="btn sm" disabled={busy} onClick={() => call(`/api/pay/${slug}`, { method: "POST", body: JSON.stringify({ renew: true }) }, "Renewed for a year.")}>
              Renew {formatPrice(renewal.due)} <span className="test-badge">Test</span>
            </button>
          )}
        </div>
      )}
      <form
        className="account-row"
        onSubmit={(e) => {
          e.preventDefault();
          call(`/api/pages/${slug}`, { method: "PUT", body: JSON.stringify({ ownerEmail: email }) }, email ? "We’ll email you about new orders." : "Order emails turned off.");
        }}
      >
        <label htmlFor="acc-email" style={{ margin: 0 }}>
          <strong>Email me about new orders</strong>
          <span className="hint small"> (optional)</span>
        </label>
        <div className="link-box" style={{ marginTop: 0 }}>
          <input id="acc-email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <button className="btn ghost sm" disabled={busy || email.trim() === (ownerEmail ?? "")}>
            Save
          </button>
        </div>
      </form>
      {msg && <p className={msg.ok ? "hint small" : "error"}>{msg.text}</p>}
    </div>
  );
}
