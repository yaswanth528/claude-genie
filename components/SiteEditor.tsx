"use client";
// Edit panel for a website: type, look, text, products, photos and contact details.
// Shared by the review screen (before publishing) and the owner's edit screen.
import { useRef, useState } from "react";
import { parseHours } from "@/lib/hours";
import { BADGES, FESTIVALS, LAYOUTS, THEME_IDS, type Badge, type FestivalId, type Layout, type Media, type Product, type SiteContent, type Translation } from "@/lib/schema";
import { THEMES } from "@/lib/themes";
import { CompareTypes } from "./CompareTypes";
import { ReadBack } from "./ReadBack";
import { uploadFile } from "./upload";

type Props<T extends SiteContent> = {
  value: T;
  onChange: (next: T) => void;
  language?: string;
  showWhatsapp?: boolean;
  recordings?: string[]; // the owner's own voice recordings, to check prices by ear
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

export function SiteEditor<T extends SiteContent & { whatsapp?: string; ownerEmail?: string | null }>({ value: d, onChange, language = "English", showWhatsapp, recordings = [] }: Props<T>) {
  const set = (patch: Partial<SiteContent> & { whatsapp?: string; ownerEmail?: string | null }) => onChange({ ...d, ...patch });
  const setItem = (i: number, patch: Partial<Product>) => set({ items: d.items.map((it, j) => (j === i ? { ...it, ...patch } : it)) });
  const up = useUpload();
  const [comparing, setComparing] = useState(false);
  const num = (v: string) => (v.replace(/\D/g, "") ? Number(v.replace(/\D/g, "")) : null);
  const setDelivery = (patch: Partial<NonNullable<SiteContent["delivery"]>>) =>
    set({ delivery: { areas: null, charge: null, freeAbove: null, minOrder: null, ...(d.delivery ?? {}), ...patch } });
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
            <label htmlFor="e-email">Email for new-order alerts (optional)</label>
            <input id="e-email" type="email" autoComplete="email" placeholder="you@example.com" value={d.ownerEmail ?? ""} onChange={(e) => set({ ownerEmail: e.target.value })} />
          </>
        )}
        <label htmlFor="e-cat">What you sell</label>
        <input id="e-cat" value={d.category} onChange={(e) => set({ category: e.target.value })} />
      </details>

      <details open>
        <summary>Website type</summary>
        <div className="choice-row">
          <button type="button" className={`choice ${d.siteType === "static" ? "on" : ""}`} onClick={() => set({ siteType: "static" })} aria-pressed={d.siteType === "static"}>
            <TypeSketch dynamic={false} />
            <strong>Static · Showcase</strong>
            <span>A beautiful catalogue. Customers send their list or ask about a product on WhatsApp.</span>
            <em>₹1,999 one-time</em>
          </button>
          <button type="button" className={`choice ${d.siteType === "dynamic" ? "on" : ""}`} onClick={() => set({ siteType: "dynamic" })} aria-pressed={d.siteType === "dynamic"}>
            <TypeSketch dynamic />
            <strong>Dynamic · Online store</strong>
            <span>Everything in Showcase, plus cart, checkout, delivery rules, order tracking and your orders list.</span>
            <em>₹1,999 + ₹3,000/yr</em>
          </button>
        </div>
        <button type="button" className="btn ghost sm cmp-open" onClick={() => setComparing(true)}>
          ⇄ Compare both designs side by side
        </button>
        {comparing && (
          <CompareTypes
            site={d}
            onClose={() => setComparing(false)}
            onChoose={(siteType) => {
              set({ siteType });
              setComparing(false);
            }}
          />
        )}
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
        <p className="field-label">How products are shown</p>
        <div className="layout-row" role="radiogroup" aria-label="Product layout">
          {LAYOUTS.map((l) => (
            <button
              key={l}
              type="button"
              role="radio"
              aria-checked={(d.theme.layout ?? "grid") === l}
              className={`layout-chip ${(d.theme.layout ?? "grid") === l ? "on" : ""}`}
              onClick={() => set({ theme: { ...d.theme, layout: l } })}
            >
              <LayoutIcon layout={l} />
              <strong>{LAYOUT_TEXT[l][0]}</strong>
              <span>{LAYOUT_TEXT[l][1]}</span>
            </button>
          ))}
        </div>
      </details>

      <details open>
        <summary>Products and prices</summary>
        <ReadBack businessName={d.businessName} items={d.items} language={language} />
        <p className="hint">Check every price. Yellow ones might be misheard{recordings.length ? ". Play your recording to check by ear" : ""}.</p>
        {recordings.length > 0 && (
          <div className="recordings">
            {recordings.map((url, i) => (
              <div key={url} className="recording">
                <span>▶ {recordings.length > 1 ? `Recording ${i + 1}` : "What you said"}</span>
                <audio controls preload="metadata" src={url} />
              </div>
            ))}
          </div>
        )}
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
                    className="price-in"
                    inputMode="decimal"
                    placeholder={it.askPrice ? "On request" : "₹"}
                    disabled={!!it.askPrice}
                    value={it.price ?? ""}
                    onChange={(e) => setItem(i, { price: e.target.value === "" ? null : Number(e.target.value), lowConfidence: false })}
                  />
                </div>
                <textarea rows={2} aria-label={`Description of ${it.name}`} placeholder="Short description" value={it.description} onChange={(e) => setItem(i, { description: e.target.value })} />
                <details className="prod-more">
                  <summary>
                    More: tag, category, sizes, stock
                    {it.badge && <span className="pill ok">{BADGE_TEXT[it.badge]}</span>}
                    {it.inStock === false && <span className="pill warn">Out of stock</span>}
                  </summary>
                  <div className="seg small" role="radiogroup" aria-label={`Tag for ${it.name}`}>
                    {([null, ...BADGES] as (Badge | null)[]).map((b) => (
                      <button key={b ?? "none"} type="button" role="radio" aria-checked={(it.badge ?? null) === b} className={(it.badge ?? null) === b ? "on" : ""} onClick={() => setItem(i, { badge: b })}>
                        {b ? BADGE_TEXT[b] : "No tag"}
                      </button>
                    ))}
                  </div>
                  <label className="check">
                    <input type="checkbox" checked={it.inStock !== false} onChange={(e) => setItem(i, { inStock: e.target.checked })} />
                    In stock
                  </label>
                  <label className="check">
                    <input type="checkbox" checked={!!it.askPrice} onChange={(e) => setItem(i, { askPrice: e.target.checked, ...(e.target.checked ? { price: null, lowConfidence: false } : {}) })} />
                    Price on request (customers ask you on WhatsApp)
                  </label>
                  <input aria-label={`Category of ${it.name}`} placeholder="Category (e.g. Sarees)" value={it.category ?? ""} onChange={(e) => setItem(i, { category: e.target.value || null })} />
                  <div className="prod-line">
                    <input
                      aria-label={`Choices for ${it.name}`}
                      placeholder="Choices, comma separated (e.g. S, M, L)"
                      value={(it.options ?? []).join(", ")}
                      onChange={(e) => {
                        const options = e.target.value.split(",").map((x) => x.trim());
                        setItem(i, { options: options.some(Boolean) ? options : [], optionName: it.optionName ?? "Size" });
                      }}
                    />
                    <input aria-label="What the choices are" placeholder="Size" value={it.optionName ?? ""} onChange={(e) => setItem(i, { optionName: e.target.value || null })} />
                  </div>
                </details>
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
        <summary>Payments and delivery</summary>
        <label htmlFor="e-upi">Your UPI ID (optional)</label>
        <input
          id="e-upi"
          placeholder="e.g. yourshop@okaxis"
          autoCapitalize="none"
          autoCorrect="off"
          value={d.upiId ?? ""}
          onChange={(e) => set({ upiId: e.target.value.trim() || null })}
        />
        <p className="hint small">Customers can pay you directly with GPay, PhonePe or Paytm. The money goes straight to you.</p>
        <label htmlFor="e-areas">Delivery areas</label>
        <input id="e-areas" placeholder="e.g. Jayanagar, JP Nagar, BTM" value={d.delivery?.areas ?? ""} onChange={(e) => setDelivery({ areas: e.target.value || null })} />
        <div className="prod-line three">
          <label>
            Delivery charge ₹
            <input inputMode="numeric" placeholder="0" value={d.delivery?.charge ?? ""} onChange={(e) => setDelivery({ charge: num(e.target.value) })} />
          </label>
          <label>
            Free above ₹
            <input inputMode="numeric" placeholder="—" value={d.delivery?.freeAbove ?? ""} onChange={(e) => setDelivery({ freeAbove: num(e.target.value) })} />
          </label>
          <label>
            Minimum order ₹
            <input inputMode="numeric" placeholder="—" value={d.delivery?.minOrder ?? ""} onChange={(e) => setDelivery({ minOrder: num(e.target.value) })} />
          </label>
        </div>
      </details>

      <TranslationPanel value={d} onChange={(translation) => set({ translation })} />

      <details>
        <summary>Festival banner</summary>
        <p className="hint small">A festive strip at the top of your website, with your offer. Switch it off after the festival.</p>
        <label htmlFor="e-fest">Festival</label>
        <select
          id="e-fest"
          value={d.festival?.id ?? ""}
          onChange={(e) => set({ festival: e.target.value ? { id: e.target.value as FestivalId, message: d.festival?.message ?? null } : null })}
        >
          <option value="">No banner</option>
          {FESTIVALS.map((f) => (
            <option key={f} value={f}>
              {FESTIVAL_TEXT[f]}
            </option>
          ))}
        </select>
        {d.festival && (
          <>
            <label htmlFor="e-fest-msg">Your offer (optional)</label>
            <input
              id="e-fest-msg"
              maxLength={100}
              placeholder="e.g. 10% off on all sweet boxes till Sunday"
              value={d.festival.message ?? ""}
              onChange={(e) => set({ festival: { ...d.festival!, message: e.target.value || null } })}
            />
          </>
        )}
      </details>

      <details>
        <summary>Location and hours</summary>
        <label htmlFor="e-area">Area / city</label>
        <input id="e-area" value={d.area ?? ""} onChange={(e) => set({ area: e.target.value || null })} />
        <label htmlFor="e-addr">Full address</label>
        <textarea id="e-addr" rows={2} value={d.address ?? ""} onChange={(e) => set({ address: e.target.value || null })} />
        <label htmlFor="e-hours">Opening hours</label>
        <input id="e-hours" placeholder="e.g. 10 am – 9 pm, closed Tuesday" value={d.hours ?? ""} onChange={(e) => set({ hours: e.target.value || null })} aria-describedby="e-hours-hint" />
        <HoursHint id="e-hours-hint" hours={d.hours} />
        <label htmlFor="e-reviews">Google reviews link (optional)</label>
        <input
          id="e-reviews"
          inputMode="url"
          autoCapitalize="none"
          autoCorrect="off"
          placeholder="https://maps.app.goo.gl/…"
          value={d.reviewsUrl ?? ""}
          onChange={(e) => set({ reviewsUrl: e.target.value.trim() || null })}
        />
        <p className="hint small">In Google Maps, open your shop, tap Share, and paste the link here. Customers trust shops with reviews.</p>
      </details>

      {up.error && <p className="error">{up.error}</p>}
    </div>
  );
}

const BADGE_TEXT: Record<Badge, string> = { bestseller: "Bestseller", new: "New", offer: "Offer" };
const LAYOUT_TEXT: Record<Layout, [string, string]> = {
  grid: ["Grid", "Photo tiles"],
  list: ["List", "Photo and details side by side"],
  lookbook: ["Lookbook", "Big photos"],
  menu: ["Menu", "Names and prices, no photos"],
};
const FESTIVAL_TEXT: Record<FestivalId, string> = {
  diwali: "🪔 Diwali",
  navratri: "🪷 Navratri / Dussehra",
  ganesh: "🌺 Ganesh Chaturthi",
  holi: "🎨 Holi",
  eid: "🌙 Eid",
  christmas: "🎄 Christmas",
  pongal: "🌾 Pongal / Sankranti",
  onam: "🌼 Onam",
  ugadi: "🌿 Ugadi / Gudi Padwa",
  newyear: "✨ New Year",
};

// Tiny pictures of the two website types: a calm catalogue vs a store with a cart.
function TypeSketch({ dynamic }: { dynamic: boolean }) {
  const r = (x: number, y: number, w: number, h: number, o = 1, rx = 1.5) => <rect x={x} y={y} width={w} height={h} rx={rx} fill="currentColor" opacity={o} />;
  return (
    <svg viewBox="0 0 64 44" width="64" height="44" aria-hidden="true" className="type-sketch">
      {dynamic ? (
        <>
          {r(0, 0, 64, 4, 0.9, 0)}
          {r(3, 7, 24, 3, 0.6)}
          {r(48, 6.5, 13, 5, 1, 2.5)}
          {r(0, 14, 64, 30, 0.12, 0)}
          {[3, 24, 45].map((x) => (
            <g key={x}>
              {r(x, 17, 16, 12, 0.45)}
              {r(x, 31, 10, 2, 0.6)}
              {r(x, 35, 16, 4, 1, 2)}
            </g>
          ))}
        </>
      ) : (
        <>
          {r(3, 3, 22, 3, 0.6)}
          {r(3, 10, 30, 5, 0.85)}
          {r(3, 17, 22, 2, 0.4)}
          {r(38, 3, 23, 16, 0.4)}
          {[3, 24, 45].map((x) => (
            <g key={x}>
              {r(x, 24, 16, 12, 0.35)}
              {r(x, 38, 11, 2, 0.6)}
            </g>
          ))}
        </>
      )}
    </svg>
  );
}

// Tiny pictures of each product layout.
function LayoutIcon({ layout }: { layout: Layout }) {
  const r = (x: number, y: number, w: number, h: number, o = 1) => <rect x={x} y={y} width={w} height={h} rx={1.5} fill="currentColor" opacity={o} />;
  return (
    <svg viewBox="0 0 40 28" width="40" height="28" aria-hidden="true">
      {layout === "grid" && [r(1, 1, 11, 11), r(14.5, 1, 11, 11), r(28, 1, 11, 11), r(1, 15, 11, 11, 0.5), r(14.5, 15, 11, 11, 0.5), r(28, 15, 11, 11, 0.5)]}
      {layout === "list" && [r(1, 1, 9, 7.5), r(12, 2.5, 26, 2, 0.5), r(12, 6, 16, 1.6, 0.3), r(1, 10.25, 9, 7.5), r(12, 11.75, 26, 2, 0.5), r(12, 15.25, 16, 1.6, 0.3), r(1, 19.5, 9, 7.5), r(12, 21, 26, 2, 0.5)]}
      {layout === "lookbook" && [r(1, 1, 18, 26), r(21, 1, 18, 26, 0.6)]}
      {layout === "menu" && [r(1, 2, 18, 2.4, 0.7), r(31, 2, 8, 2.4), r(1, 9, 22, 2.4, 0.7), r(31, 9, 8, 2.4), r(1, 16, 15, 2.4, 0.7), r(31, 16, 8, 2.4), r(1, 23, 20, 2.4, 0.7), r(31, 23, 8, 2.4)]}
    </svg>
  );
}

// Tells the owner whether the website can show "Open now" from what they typed.
function HoursHint({ id, hours }: { id: string; hours: string | null }) {
  if (!hours?.trim()) return <p id={id} className="hint small">Add your hours and the website shows “Open now” or “Closed” to customers.</p>;
  const week = parseHours(hours);
  if (!week) return <p id={id} className="hint small">We couldn’t read these hours, so the “Open now” badge won’t show. Try “10 am – 9 pm, closed Tuesday”.</p>;
  const fmt = (m: number) => {
    const h = Math.floor((m % 1440) / 60), mm = m % 60;
    return `${h % 12 || 12}${mm ? `:${String(mm).padStart(2, "0")}` : ""} ${h < 12 ? "am" : "pm"}`;
  };
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const summary = [1, 2, 3, 4, 5, 6, 0].map((d) => `${names[d]} ${week[d].length ? week[d].map(([a, b]) => `${fmt(a)}–${fmt(b)}`).join(", ") : "closed"}`);
  return (
    <p id={id} className="hint small">
      ✓ Customers will see “Open now” or “Closed”. We read: {summary.join(" · ")}
    </p>
  );
}

const SECOND_LANGUAGES = [
  { name: "Kannada", label: "ಕನ್ನಡ" },
  { name: "Hindi", label: "हिन्दी" },
  { name: "Tamil", label: "தமிழ்" },
  { name: "Telugu", label: "తెలుగు" },
  { name: "Malayalam", label: "മലയാളം" },
  { name: "Marathi", label: "मराठी" },
  { name: "English", label: "English" },
];

// A second language for the website. One AI call when the owner asks for it.
function TranslationPanel({ value, onChange }: { value: SiteContent; onChange: (t: Translation | null) => void }) {
  const [language, setLanguage] = useState(value.translation?.language ?? "Kannada");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = value.translation;

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const { translation: _old, ...content } = value;
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, language }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error ?? "Couldn't translate. Try again.");
      onChange(data.translation);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const setField = (patch: Partial<Translation>) => t && onChange({ ...t, ...patch });

  return (
    <details>
      <summary>Second language</summary>
      <p className="hint">Customers get a button to switch your website to another language.</p>
      {!t ? (
        <div className="row tight">
          <select aria-label="Language" value={language} onChange={(e) => setLanguage(e.target.value)} style={{ width: "auto" }}>
            {SECOND_LANGUAGES.map((l) => (
              <option key={l.name} value={l.name}>
                {l.label} {l.name !== l.label ? `(${l.name})` : ""}
              </option>
            ))}
          </select>
          <button type="button" className="btn ghost sm" onClick={create} disabled={busy}>
            {busy ? "Translating…" : `Add ${language} version`}
          </button>
        </div>
      ) : (
        <>
          <p>
            <strong>{t.label}</strong> version added. Check the main lines below; customers can switch languages on your site.
          </p>
          <label htmlFor="t-head">Headline ({t.language})</label>
          <input id="t-head" value={t.headline} onChange={(e) => setField({ headline: e.target.value })} />
          <label htmlFor="t-sub">Line under the headline ({t.language})</label>
          <textarea id="t-sub" rows={2} value={t.subheadline} onChange={(e) => setField({ subheadline: e.target.value })} />
          <label>Product names ({t.language})</label>
          {t.items.map((ti, i) => (
            <input
              key={i}
              aria-label={`Product ${i + 1} in ${t.language}`}
              value={ti.name}
              onChange={(e) => setField({ items: t.items.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })}
            />
          ))}
          <div className="row tight">
            <button type="button" className="btn ghost sm" onClick={create} disabled={busy}>
              {busy ? "Translating…" : "Translate again"}
            </button>
            <button type="button" className="btn ghost sm danger" onClick={() => onChange(null)}>
              Remove {t.language}
            </button>
          </div>
        </>
      )}
      {error && <p className="error">{error}</p>}
    </details>
  );
}
