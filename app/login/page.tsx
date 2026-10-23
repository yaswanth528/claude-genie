"use client";
import Link from "next/link";
import { useState } from "react";
import { Logo } from "@/components/Logo";

// Owner login: WhatsApp number → 6-digit code on WhatsApp → My websites.
export default function LoginPage() {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [challenge, setChallenge] = useState<{ id: string; masked: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone }) });
      const data = await res.json();
      if (!res.ok) return setError(data.error);
      setChallenge({ id: data.challenge, masked: data.phone });
      setCode("");
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    if (!challenge) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ challenge: challenge.id, code }) });
      const data = await res.json();
      if (!res.ok) return setError(data.error);
      window.location.href = "/my";
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="narrow">
      <Logo />
      <h1>Log in to your websites</h1>
      {!challenge ? (
        <form onSubmit={send}>
          <p className="hint">Enter the WhatsApp number on your website. We’ll send you a 6-digit code on WhatsApp.</p>
          <label htmlFor="ph">WhatsApp number</label>
          <input id="ph" inputMode="tel" autoComplete="tel" placeholder="98765 43210" value={phone} onChange={(e) => setPhone(e.target.value)} />
          {error && <div className="errors"><p>{error}</p></div>}
          <div className="row">
            <button className="btn" disabled={busy || phone.replace(/\D/g, "").length < 10} aria-busy={busy}>
              {busy ? "Sending…" : "Send code on WhatsApp"}
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={verify}>
          <p className="hint">We sent a code to {challenge.masked} on WhatsApp. It works for 10 minutes.</p>
          <label htmlFor="code">6-digit code</label>
          <input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            style={{ fontSize: "1.6rem", letterSpacing: "0.3em", fontVariantNumeric: "tabular-nums" }}
          />
          {error && <div className="errors"><p>{error}</p></div>}
          <div className="row">
            <button className="btn" disabled={busy || code.length !== 6} aria-busy={busy}>
              {busy ? "Checking…" : "Log in"}
            </button>
            <button type="button" className="btn ghost" onClick={() => send()} disabled={busy}>
              Send a new code
            </button>
          </div>
        </form>
      )}
      <p className="hint" style={{ marginTop: 24 }}>
        Don’t have a website yet? <Link href="/create">Make one in 20 seconds</Link>
      </p>
    </main>
  );
}
