"use client";
import { useCallback, useState } from "react";
import { Logo } from "@/components/Logo";
import { CopyButton } from "@/components/CopyButton";
import { MicButton } from "@/components/MicButton";
import { ReadBack } from "@/components/ReadBack";
import { LANGUAGES } from "@/components/useSpeech";
import type { Extraction, Item } from "@/lib/schema";

type Stage = "speak" | "confirm" | "done";

export default function CreatePage() {
  const [stage, setStage] = useState<Stage>("speak");
  const [lang, setLang] = useState("English");
  const [transcript, setTranscript] = useState("");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const [businessName, setBusinessName] = useState("");
  const [tagline, setTagline] = useState<string | null>(null);
  const [language, setLanguage] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [result, setResult] = useState<{ slug: string; editKey: string; whatsapp: string } | null>(null);

  const onText = useCallback((t: string) => setTranscript(t), []);

  async function extract() {
    setBusy(true);
    setErrors([]);
    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript }),
      });
      const data = await res.json();
      if (!res.ok) return setErrors([data.error]);
      const ex = data as Extraction;
      setBusinessName(ex.businessName ?? "");
      setTagline(ex.tagline);
      setLanguage(ex.language);
      setItems(ex.items);
      setStage("confirm");
    } catch {
      setErrors(["Network error. Try again."]);
    } finally {
      setBusy(false);
    }
  }

  async function publish() {
    setBusy(true);
    setErrors([]);
    try {
      const res = await fetch("/api/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessName, tagline, language, whatsapp, items }),
      });
      const data = await res.json();
      if (!res.ok) return setErrors(data.errors ?? ["Couldn't publish."]);
      setResult(data);
      setStage("done");
    } catch {
      setErrors(["Network error. Try again."]);
    } finally {
      setBusy(false);
    }
  }

  const update = (i: number, patch: Partial<Item>) =>
    setItems((prev) => prev.map((it, j) => (j === i ? { ...it, ...patch } : it)));

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const stageIndex = { speak: 0, confirm: 1, done: 2 }[stage];

  return (
    <main className="narrow">
      <Logo />
      <div className="stepper-head" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span key={i} className={i <= stageIndex ? "done" : ""} />
        ))}
      </div>

      {stage === "speak" && (
        <>
          <h1>Tell us about your shop</h1>
          <p className="hint">
            About 20 seconds: your business name, then each product and its price. Example: “[your shop name]. Cotton
            kurti 799, silk kurti 1499.”
          </p>
          <label htmlFor="lang">Language</label>
          <select id="lang" value={lang} onChange={(e) => setLang(e.target.value)}>
            {LANGUAGES.map((l) => (
              <option key={l.name} value={l.name}>
                {l.label}
              </option>
            ))}
          </select>
          <MicButton language={lang} onText={onText} />
          <label htmlFor="transcript">What we heard (you can edit or type)</label>
          <textarea id="transcript" value={transcript} onChange={(e) => setTranscript(e.target.value)} />
          {errors.length > 0 && (
            <div className="errors">
              {errors.map((e) => (
                <p key={e}>{e}</p>
              ))}
            </div>
          )}
          <div className="row">
            <button className="btn" onClick={extract} disabled={busy || transcript.trim().length < 5}>
              {busy ? "Reading your products…" : "Make my product list"}
            </button>
          </div>
        </>
      )}

      {stage === "confirm" && (
        <>
          <h1>Is this right?</h1>
          <p className="hint">
            Check every price. Prices in <span style={{ background: "var(--warn-bg)" }}>yellow</span> might be misheard.
            Nothing goes live until you publish.
          </p>
          <ReadBack businessName={businessName} items={items} language={lang} />
          <label htmlFor="bn">Business name</label>
          <input id="bn" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
          <label htmlFor="wa">Your WhatsApp number (orders come here)</label>
          <input
            id="wa"
            inputMode="tel"
            placeholder="98765 43210"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
          />
          <label>Products and prices (₹)</label>
          <div className="items">
            {items.map((it, i) => (
              <div key={i} className={`item-row ${it.lowConfidence ? "low" : ""}`}>
                <input aria-label="Product name" value={it.name} onChange={(e) => update(i, { name: e.target.value })} />
                <input
                  aria-label={`Price of ${it.name}`}
                  className="price"
                  inputMode="decimal"
                  value={it.price ?? ""}
                  onChange={(e) =>
                    update(i, { price: e.target.value === "" ? null : Number(e.target.value), lowConfidence: false })
                  }
                />
                <button
                  className="icon-btn"
                  aria-label={`Remove ${it.name}`}
                  onClick={() => setItems((prev) => prev.filter((_, j) => j !== i))}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <button
            className="btn ghost"
            style={{ marginTop: 10 }}
            onClick={() => setItems((p) => [...p, { name: "", price: null, unit: null, lowConfidence: false }])}
          >
            + Add product
          </button>
          {errors.length > 0 && (
            <div className="errors">
              {errors.map((e) => (
                <p key={e}>{e}</p>
              ))}
            </div>
          )}
          <div className="row">
            <button className="btn" onClick={publish} disabled={busy}>
              {busy ? "Publishing…" : "Yes, publish my page"}
            </button>
            <button className="btn ghost" onClick={() => setStage("speak")} disabled={busy}>
              Speak again
            </button>
          </div>
        </>
      )}

      {stage === "done" && result && (
        <>
          <h1>Your page is live 🎉</h1>
          <div className="success">
            <strong>Share this link</strong> in your WhatsApp or Instagram bio:
            <div className="link-box">
              <input readOnly value={`${origin}/p/${result.slug}`} onFocus={(e) => e.target.select()} aria-label="Shop link" />
              <CopyButton text={`${origin}/p/${result.slug}`} />
              <a className="btn" href={`/p/${result.slug}`} target="_blank" rel="noreferrer">
                Open
              </a>
            </div>
          </div>
          <div className="notice">
            <strong>Save your private edit link.</strong> Anyone with it can change your page, so don’t share it.
            <div className="link-box">
              <input
                readOnly
                aria-label="Private edit link"
                value={`${origin}/p/${result.slug}/edit#key=${result.editKey}`}
                onFocus={(e) => e.target.select()}
              />
              <CopyButton text={`${origin}/p/${result.slug}/edit#key=${result.editKey}`} />
            </div>
          </div>
          <div className="card" style={{ marginTop: 16 }}>
            <strong>Check that orders reach you</strong>
            <p className="hint">
              Send yourself a test order. If it opens WhatsApp with your own chat, you’re set. Your number is also shown
              on your page, so customers can still reach you if a message doesn’t go through.
            </p>
            <a
              className="btn wa"
              style={{ marginTop: 10 }}
              href={`https://wa.me/${result.whatsapp}?text=${encodeURIComponent(`Test order from my SiteGenie page (${origin}/p/${result.slug})`)}`}
              target="_blank"
              rel="noreferrer"
            >
              Send a test order
            </a>
          </div>
        </>
      )}
    </main>
  );
}
