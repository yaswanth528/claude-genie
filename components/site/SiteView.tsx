"use client";
// Renders a business website from its content. Used for the live site (/p/<slug>)
// and for the live preview on the review screen.
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { formatPrice, orderText, orderTotal, whatsappLink } from "@/lib/catalogue";
import type { Media, Order, SiteContent } from "@/lib/schema";
import { SITE_CSS } from "@/lib/siteCss";
import { themeVars } from "@/lib/themes";

type Props = {
  site: SiteContent & { whatsapp: string; slug?: string };
  preview?: boolean; // review screen: don't save orders
};

function MediaBox({ media, className, eager }: { media: Media; className?: string; eager?: boolean }) {
  if (media.kind === "video")
    return <video className={className} src={media.url} autoPlay muted loop playsInline preload="metadata" aria-label={media.alt} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img className={className} src={media.url} alt={media.alt} loading={eager ? "eager" : "lazy"} />;
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

export function SiteView({ site, preview }: Props) {
  const [qty, setQty] = useState<number[]>(() => site.items.map(() => 0));
  const [cartOpen, setCartOpen] = useState(false);
  const dynamic = site.siteType === "dynamic";
  const storageKey = site.slug ? `sg-cart-${site.slug}` : null;

  // Keep quantities in step with the product list (it changes while editing a draft).
  useEffect(() => {
    setQty((q) => site.items.map((_, i) => q[i] ?? 0));
  }, [site.items]);

  // Remember a customer's cart on this device.
  useEffect(() => {
    if (!storageKey || preview) return;
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) ?? "null");
      if (Array.isArray(saved) && saved.length === site.items.length) setQty(saved);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);
  useEffect(() => {
    if (!storageKey || preview) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(qty));
    } catch {}
  }, [qty, storageKey, preview]);

  const change = (i: number, d: number) => setQty((q) => q.map((n, j) => (j === i ? Math.min(99, Math.max(0, n + d)) : n)));
  const lines = useMemo(
    () => site.items.map((it, i) => ({ index: i, name: it.name, price: it.price, qty: qty[i] ?? 0 })).filter((l) => l.qty > 0),
    [site.items, qty],
  );
  const count = lines.reduce((s, l) => s + l.qty, 0);
  const total = orderTotal(lines);
  const vars = themeVars(site.theme.id, site.theme.accent) as CSSProperties;
  const heroFull = site.theme.heroStyle === "full" && site.hero;
  const heroType = !site.hero; // no banner photo: a type-led banner instead of an empty picture box
  const anyImages = site.items.some((it) => it.image);
  const cols = Math.min(4, Math.max(2, site.items.length));
  const phone = site.whatsapp.startsWith("91") && site.whatsapp.length === 12 ? `+91 ${site.whatsapp.slice(2, 7)} ${site.whatsapp.slice(7)}` : `+${site.whatsapp}`;
  const aboutImage = site.gallery.find((m) => m.kind === "image") ?? null;
  const contactBits = [site.area, site.address, site.hours].filter(Boolean);
  const highlights = site.highlights.map((h) => h.trim()).filter(Boolean);

  return (
    <div className="site-box">
      <style dangerouslySetInnerHTML={{ __html: SITE_CSS }} />
    <div className={`site theme-${site.theme.id} ${preview ? "is-preview" : ""}`} style={vars}>
      <header className="s-header">
        <div className="s-wrap s-header-row">
          <a href="#top" className="s-brand">
            {site.businessName || "Your shop"}
          </a>
          <nav className="s-nav" aria-label="Sections">
            <a href="#products">{dynamic ? "Shop" : "Products"}</a>
            {site.about && <a href="#about">About</a>}
            {site.gallery.length > 0 && <a href="#gallery">Gallery</a>}
            <a href="#contact">Contact</a>
          </nav>
          {dynamic ? (
            <button className="s-btn s-btn-sm" onClick={() => setCartOpen(true)}>
              Cart{count > 0 ? ` · ${count}` : ""}
            </button>
          ) : (
            <a className="s-btn s-btn-sm" href={`https://wa.me/${site.whatsapp}`} target="_blank" rel="noreferrer">
              WhatsApp
            </a>
          )}
        </div>
      </header>

      <section id="top" className={`s-hero ${heroType ? "s-hero-type" : heroFull ? "s-hero-full" : "s-hero-split"}`}>
        {heroFull && site.hero && <MediaBox media={site.hero} className="s-hero-bg" eager />}
        <div className="s-wrap s-hero-inner">
          <div className="s-hero-copy">
            {site.category && <p className="s-eyebrow">{site.area ? `${site.category} · ${site.area}` : site.category}</p>}
            <h1>{site.headline || site.businessName}</h1>
            <p className="s-lead">{site.subheadline}</p>
            <div className="s-hero-cta">
              <a className="s-btn" href="#products">
                {dynamic ? "Shop now" : "See products"}
              </a>
              <a className="s-btn s-btn-ghost" href={`https://wa.me/${site.whatsapp}`} target="_blank" rel="noreferrer">
                Chat on WhatsApp
              </a>
            </div>
          </div>
          {!heroFull && site.hero && (
            <div className="s-hero-media">
              <MediaBox media={site.hero} eager />
            </div>
          )}
        </div>
      </section>

      {highlights.length > 0 && (
        <section className="s-highlights">
          <div className="s-wrap s-highlights-row">
            {highlights.map((h) => (
              <p key={h}>{h}</p>
            ))}
          </div>
        </section>
      )}

      <section id="products" className="s-section">
        <div className="s-wrap">
          <div className="s-section-head">
            <h2>{dynamic ? "Shop" : "Our products"}</h2>
            <p>{dynamic ? "Add items to your cart and check out in a minute." : "Pick what you like and send your order on WhatsApp."}</p>
          </div>
          <div className={`s-grid ${anyImages ? "" : "s-grid-text"}`} style={{ "--cols": cols } as CSSProperties}>
            {site.items.map((it, i) => (
              <article key={i} className="s-card">
                {anyImages && (
                  <div className="s-card-media">
                    {it.image ? (
                      <>
                        <MediaBox media={it.image} />
                        {it.image.generated && <span className="s-ai-tag">{it.image.credit ?? "Illustration"}</span>}
                      </>
                    ) : (
                      <div className="s-card-mono">{initials(it.name || "?")}</div>
                    )}
                  </div>
                )}
                {!anyImages && <span className="s-card-num">{String(i + 1).padStart(2, "0")}</span>}
                <div className="s-card-body">
                  <h3>{it.name}</h3>
                  {it.description && <p className="s-card-desc">{it.description}</p>}
                  <div className="s-card-foot">
                    <span className="s-price">
                      {formatPrice(it.price)}
                      {it.unit && <small> {it.unit}</small>}
                    </span>
                    {qty[i] > 0 ? (
                      <div className="s-qty">
                        <button onClick={() => change(i, -1)} aria-label={`One less ${it.name}`}>
                          −
                        </button>
                        <span aria-live="polite">{qty[i]}</span>
                        <button onClick={() => change(i, 1)} aria-label={`One more ${it.name}`}>
                          +
                        </button>
                      </div>
                    ) : (
                      <button className="s-add" onClick={() => change(i, 1)} aria-label={`Add ${it.name}`}>
                        {dynamic ? "Add to cart" : "Add"}
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {site.about && (
        <section id="about" className="s-section s-about">
          <div className={`s-wrap ${aboutImage ? "s-about-grid" : ""}`}>
            <div>
              <h2>About {site.businessName}</h2>
              <p className="s-about-text">{site.about}</p>
            </div>
            {aboutImage && <MediaBox media={aboutImage} className="s-about-img" />}
          </div>
        </section>
      )}

      {site.gallery.length > 0 && (
        <section id="gallery" className="s-section">
          <div className="s-wrap">
            <div className="s-section-head">
              <h2>Gallery</h2>
            </div>
            <div className="s-gallery">
              {site.gallery.map((m, i) =>
                m.kind === "video" ? (
                  <video key={i} src={m.url} controls playsInline preload="metadata" aria-label={m.alt} />
                ) : (
                  <MediaBox key={i} media={m} />
                ),
              )}
            </div>
          </div>
        </section>
      )}

      <section id="contact" className="s-section s-contact">
        <div className="s-wrap s-contact-grid">
          <div>
            <h2>Visit or message us</h2>
            {contactBits.length > 0 ? (
              <ul className="s-contact-list">
                {site.address && <li><span>Address</span>{site.address}</li>}
                {!site.address && site.area && <li><span>Area</span>{site.area}</li>}
                {site.hours && <li><span>Hours</span>{site.hours}</li>}
              </ul>
            ) : (
              <p className="s-muted">Message us on WhatsApp for orders and questions.</p>
            )}
            {(site.address || site.area) && (
              <a
                className="s-link"
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${site.businessName} ${site.address ?? site.area}`)}`}
                target="_blank"
                rel="noreferrer"
              >
                Open in Google Maps ↗
              </a>
            )}
          </div>
          <div className="s-contact-card">
            <p className="s-muted">WhatsApp</p>
            <p className="s-phone">{phone}</p>
            <a className="s-btn" href={`https://wa.me/${site.whatsapp}`} target="_blank" rel="noreferrer">
              Message on WhatsApp
            </a>
          </div>
        </div>
      </section>

      <footer className="s-footer">
        <div className="s-wrap s-footer-row">
          <span>© {site.businessName}</span>
          <a href="/">Made with SiteGenie</a>
        </div>
      </footer>

      {!dynamic && count > 0 && (
        <div className="s-orderbar">
          <a
            className="s-btn s-btn-wa"
            href={whatsappLink(site.whatsapp, orderText(site.businessName, lines))}
            target="_blank"
            rel="noreferrer"
          >
            Order on WhatsApp · {formatPrice(total)}
          </a>
        </div>
      )}
      {dynamic && count > 0 && !cartOpen && (
        <div className="s-orderbar">
          <button className="s-btn" onClick={() => setCartOpen(true)}>
            View cart · {count} item{count > 1 ? "s" : ""} · {formatPrice(total)}
          </button>
        </div>
      )}
      {dynamic && cartOpen && (
        <Cart
          site={site}
          lines={lines}
          total={total}
          preview={preview}
          onChange={change}
          onClose={() => setCartOpen(false)}
          onPlaced={() => setQty(site.items.map(() => 0))}
        />
      )}
    </div>
    </div>
  );
}

type Line = { index: number; name: string; price: number | null; qty: number };

function Cart({
  site,
  lines,
  total,
  preview,
  onChange,
  onClose,
  onPlaced,
}: {
  site: Props["site"];
  lines: Line[];
  total: number;
  preview?: boolean;
  onChange: (i: number, d: number) => void;
  onClose: () => void;
  onPlaced: () => void;
}) {
  const [customer, setCustomer] = useState({ name: "", phone: "", address: "", note: "" });
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [placed, setPlaced] = useState<{ link: string; id?: string } | null>(null);
  const set = (k: keyof typeof customer) => (e: { target: { value: string } }) => setCustomer((c) => ({ ...c, [k]: e.target.value }));

  async function checkout(e: React.FormEvent) {
    e.preventDefault();
    setErrors([]);
    if (preview || !site.slug) {
      setPlaced({ link: whatsappLink(site.whatsapp, orderText(site.businessName, lines, customer)) });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/orders/${site.slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer, lines: lines.map((l) => ({ index: l.index, qty: l.qty })) }),
      });
      const data = (await res.json()) as { errors?: string[]; error?: string; order?: Order };
      if (!res.ok || !data.order) return setErrors(data.errors ?? [data.error ?? "Couldn't place the order."]);
      const o = data.order;
      setPlaced({ link: whatsappLink(site.whatsapp, orderText(site.businessName, o.lines, o.customer, o.id)), id: o.id });
      onPlaced();
    } catch {
      setErrors(["Network error. Check your connection and try again."]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="s-drawer-wrap" role="dialog" aria-modal="true" aria-label="Your cart">
      <button className="s-drawer-scrim" onClick={onClose} aria-label="Close cart" />
      <div className="s-drawer">
        <div className="s-drawer-head">
          <h2>{placed ? "Almost done" : "Your cart"}</h2>
          <button className="s-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        {placed ? (
          <div className="s-placed">
            <p>
              {placed.id ? `Order ${placed.id} is saved. ` : ""}Tap below to send it to {site.businessName} on WhatsApp so
              they can confirm.
            </p>
            <a className="s-btn s-btn-wa" href={placed.link} target="_blank" rel="noreferrer">
              Send order on WhatsApp
            </a>
            {preview && <p className="s-muted">Preview: orders aren’t saved until the site is published.</p>}
          </div>
        ) : lines.length === 0 ? (
          <p className="s-muted">Your cart is empty.</p>
        ) : (
          <form onSubmit={checkout} className="s-checkout">
            <ul className="s-lines">
              {lines.map((l) => (
                <li key={l.index}>
                  <span>{l.name}</span>
                  <div className="s-qty">
                    <button type="button" onClick={() => onChange(l.index, -1)} aria-label={`One less ${l.name}`}>
                      −
                    </button>
                    <span>{l.qty}</span>
                    <button type="button" onClick={() => onChange(l.index, 1)} aria-label={`One more ${l.name}`}>
                      +
                    </button>
                  </div>
                  <span className="s-line-price">{formatPrice((l.price ?? 0) * l.qty)}</span>
                </li>
              ))}
            </ul>
            <p className="s-total">
              <span>Total</span>
              <strong>{formatPrice(total)}</strong>
            </p>
            <label htmlFor="c-name">Your name</label>
            <input id="c-name" value={customer.name} onChange={set("name")} autoComplete="name" required />
            <label htmlFor="c-phone">Phone</label>
            <input id="c-phone" value={customer.phone} onChange={set("phone")} inputMode="tel" autoComplete="tel" required />
            <label htmlFor="c-address">Delivery address</label>
            <textarea id="c-address" value={customer.address} onChange={set("address")} autoComplete="street-address" required />
            <label htmlFor="c-note">Note (optional)</label>
            <input id="c-note" value={customer.note} onChange={set("note")} />
            {errors.length > 0 && (
              <div className="s-errors">
                {errors.map((er) => (
                  <p key={er}>{er}</p>
                ))}
              </div>
            )}
            <button className="s-btn s-btn-block" disabled={busy}>
              {busy ? "Placing order…" : `Place order · ${formatPrice(total)}`}
            </button>
            <p className="s-muted s-small">Pay the shop directly when they confirm your order.</p>
          </form>
        )}
      </div>
    </div>
  );
}
