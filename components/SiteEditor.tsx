"use client";
// Edit panel for a website: type, look, text, products, photos and contact details.
// Shared by the review screen (before publishing) and the owner's edit screen.
import { useRef, useState } from "react";
import { THEME_IDS, type Media, type Product, type SiteContent } from "@/lib/schema";
import { THEMES } from "@/lib/themes";
import { ReadBack } from "./ReadBack";
import { uploadFile } from "./upload";

type Props<T extends SiteContent> = {
  value: T;
  onChange: (next: T) => void;
  language?: string;
  showWhatsapp?: boolean;
};

function useUpload() {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function run(key: string, file: File | undefined, done: (m: Media) => void) {
    if (!file) return;
    setBusy(key);
    setError(null);
    try {
      const up = await uploadFile(file);
      done({ url: up.url, kind: up.kind, generated: false, alt: up.name });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }
  return { busy, error, run };
}

function FileButton({ label, accept, disabled, onFile }: { label: string; accept: string; disabled?: boolean; onFile: (f: File | undefined) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <button type="button" className="btn ghost sm" disabled={disabled} onClick={() => ref.current?.click()}>
        {label}
      </button>
      <input
        ref={ref}
        type="file"
        accept={accept}
        hidden
        onChange={(e) => {
          onFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </>
  );
}

export function SiteEditor<T extends SiteContent & { whatsapp?: string }>({ value: d, onChange, language = "English", showWhatsapp }: Props<T>) {
  const set = (patch: Partial<SiteContent> & { whatsapp?: string }) => onChange({ ...d, ...patch });
  const setItem = (i: number, patch: Partial<Product>) => set({ items: d.items.map((it, j) => (j === i ? { ...it, ...patch } : it)) });
  const up = useUpload();
  const theme = THEMES[d.theme.id];

  return (
    <div className="editor">
      <details open>
        <summary>Business</summary>
        <label htmlFor="e-name">Business name</label>
        <input id="e-name" value={d.businessName} onChange={(e) => set({ businessName: e.target.value })} />
        {showWhatsapp && (
          <>
            <label htmlFor="e-wa">WhatsApp number (orders come here)</label>
            <input id="e-wa" inputMode="tel" placeholder="98765 43210" value={d.whatsapp ?? ""} onChange={(e) => set({ whatsapp: e.target.value })} />
          </>
        )}
        <label htmlFor="e-cat">What you sell</label>
        <input id="e-cat" value={d.category} onChange={(e) => set({ category: e.target.value })} />
      </details>

      <details open>
        <summary>Website type</summary>
        <div className="choice-row">
          <button type="button" className={`choice ${d.siteType === "static" ? "on" : ""}`} onClick={() => set({ siteType: "static" })} aria-pressed={d.siteType === "static"}>
            <strong>Static</strong>
            <span>Showcase + order on WhatsApp</span>
            <em>₹1,999 one-time</em>
          </button>
          <button type="button" className={`choice ${d.siteType === "dynamic" ? "on" : ""}`} onClick={() => set({ siteType: "dynamic" })} aria-pressed={d.siteType === "dynamic"}>
            <strong>Dynamic</strong>
            <span>Cart, checkout form, orders list</span>
            <em>₹1,999 + ₹3,000/yr</em>
          </button>
        </div>
      </details>

      <details open>
        <summary>Look</summary>
        <div className="theme-row" role="radiogroup" aria-label="Theme">
          {THEME_IDS.map((id) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={d.theme.id === id}
              className={`theme-chip ${d.theme.id === id ? "on" : ""}`}
              style={{ fontFamily: THEMES[id].display, background: THEMES[id].palettes[0].bg, color: THEMES[id].palettes[0].ink }}
              onClick={() => set({ theme: { ...d.theme, id } })}
            >
              <span className="theme-dot" style={{ background: THEMES[id].palettes[0].accent }} />
              {THEMES[id].label}
            </button>
          ))}
        </div>
        <div className="row tight">
          <div className="swatches" role="radiogroup" aria-label="Colours">
            {theme.palettes.map((p, i) => (
              <button
                key={p.name}
                type="button"
                role="radio"
                aria-checked={d.theme.accent === i}
                aria-label={p.name}
                title={p.name}
                className={`swatch ${d.theme.accent === i ? "on" : ""}`}
                style={{ background: `linear-gradient(135deg, ${p.bg} 50%, ${p.accent} 50%)` }}
                onClick={() => set({ theme: { ...d.theme, accent: i } })}
              />
            ))}
          </div>
          <div className="seg" role="radiogroup" aria-label="Banner style">
            {(["full", "split"] as const).map((h) => (
              <button key={h} type="button" role="radio" aria-checked={d.theme.heroStyle === h} className={d.theme.heroStyle === h ? "on" : ""} onClick={() => set({ theme: { ...d.theme, heroStyle: h } })}>
                {h === "full" ? "Big photo" : "Side by side"}
              </button>
            ))}
          </div>
        </div>
      </details>

      <details open>
        <summary>Products and prices</summary>
        <ReadBack businessName={d.businessName} items={d.items} language={language} />
        <p className="hint">Check every price. Yellow ones might be misheard.</p>
        <div className="prod-list">
          {d.items.map((it, i) => (
            <div key={i} className={`prod-row ${it.lowConfidence ? "low" : ""}`}>
              <div className="prod-thumb">
                {it.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={it.image.url} alt="" />
                ) : (
                  <span>No photo</span>
                )}
                {it.image?.generated && <em>AI</em>}
              </div>
              <div className="prod-fields">
                <div className="prod-line">
                  <input aria-label="Product name" value={it.name} onChange={(e) => setItem(i, { name: e.target.value })} />
                  <input
                    aria-label={`Price of ${it.name}`}
                    className="price"
                    inputMode="decimal"
                    placeholder="₹"
                    value={it.price ?? ""}
                    onChange={(e) => setItem(i, { price: e.target.value === "" ? null : Number(e.target.value), lowConfidence: false })}
                  />
                </div>
                <input aria-label={`Description of ${it.name}`} placeholder="Short description" value={it.description} onChange={(e) => setItem(i, { description: e.target.value })} />
                <div className="row tight">
                  <FileButton label={up.busy === `p${i}` ? "Uploading…" : it.image ? "Change photo" : "Add photo"} accept="image/*" disabled={!!up.busy} onFile={(f) => up.run(`p${i}`, f, (m) => setItem(i, { image: { ...m, alt: it.name } }))} />
                  {it.image && (
                    <button type="button" className="btn ghost sm" onClick={() => setItem(i, { image: null })}>
                      Remove photo
                    </button>
                  )}
                  <button type="button" className="btn ghost sm danger" onClick={() => set({ items: d.items.filter((_, j) => j !== i) })}>
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <button type="button" className="btn ghost" onClick={() => set({ items: [...d.items, { name: "", price: null, unit: null, lowConfidence: false, description: "", image: null }] })}>
          + Add product
        </button>
      </details>

      <details>
        <summary>Words on the website</summary>
        <label htmlFor="e-head">Headline</label>
        <input id="e-head" value={d.headline} onChange={(e) => set({ headline: e.target.value })} />
        <label htmlFor="e-sub">Line under the headline</label>
        <textarea id="e-sub" rows={2} value={d.subheadline} onChange={(e) => set({ subheadline: e.target.value })} />
        <label htmlFor="e-about">About your business</label>
        <textarea id="e-about" rows={4} value={d.about ?? ""} placeholder="Leave empty to hide this section" onChange={(e) => set({ about: e.target.value || null })} />
        <label>Highlights (up to 3)</label>
        {[0, 1, 2].map((i) => (
          <input
            key={i}
            aria-label={`Highlight ${i + 1}`}
            placeholder={i === 0 ? "e.g. Home delivery in Jayanagar" : ""}
            value={d.highlights[i] ?? ""}
            onChange={(e) => set({ highlights: [0, 1, 2].map((j) => (j === i ? e.target.value : (d.highlights[j] ?? ""))) })}
          />
        ))}
      </details>

      <details>
        <summary>Banner and gallery</summary>
        <label>Main banner</label>
        <div className="row tight">
          {d.hero &&
            (d.hero.kind === "video" ? (
              <video className="mini" src={d.hero.url} muted playsInline />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="mini" src={d.hero.url} alt="" />
            ))}
          <FileButton label={up.busy === "hero" ? "Uploading…" : d.hero ? "Change banner" : "Add banner"} accept="image/*,video/mp4,video/webm,video/quicktime" disabled={!!up.busy} onFile={(f) => up.run("hero", f, (m) => set({ hero: m }))} />
          {d.hero && (
            <button type="button" className="btn ghost sm" onClick={() => set({ hero: null })}>
              Remove
            </button>
          )}
        </div>
        <label>Gallery</label>
        <div className="mini-grid">
          {d.gallery.map((m, i) => (
            <div key={m.url} className="mini-cell">
              {m.kind === "video" ? (
                <video src={m.url} muted playsInline />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.url} alt="" />
              )}
              <button type="button" className="thumb-x" aria-label="Remove from gallery" onClick={() => set({ gallery: d.gallery.filter((_, j) => j !== i) })}>
                ×
              </button>
            </div>
          ))}
        </div>
        <FileButton label={up.busy === "gallery" ? "Uploading…" : "Add to gallery"} accept="image/*,video/mp4,video/webm,video/quicktime" disabled={!!up.busy} onFile={(f) => up.run("gallery", f, (m) => set({ gallery: [...d.gallery, m] }))} />
      </details>

      <details>
        <summary>Location and hours</summary>
        <label htmlFor="e-area">Area / city</label>
        <input id="e-area" value={d.area ?? ""} onChange={(e) => set({ area: e.target.value || null })} />
        <label htmlFor="e-addr">Full address</label>
        <textarea id="e-addr" rows={2} value={d.address ?? ""} onChange={(e) => set({ address: e.target.value || null })} />
        <label htmlFor="e-hours">Opening hours</label>
        <input id="e-hours" placeholder="e.g. 10 am – 9 pm, closed Tuesday" value={d.hours ?? ""} onChange={(e) => set({ hours: e.target.value || null })} />
      </details>

      {up.error && <p className="error">{up.error}</p>}
    </div>
  );
}
