"use client";
// Renders a business website from its content. Used for the live preview link (/p/<slug>)
// and for the preview on the review screen. lib/standalone.ts renders the same markup for
// customers' separately hosted sites.
import QRCode from "qrcode";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { deliveryFor, formatPrice, lineName, orderText, orderTotal, shortId, upiLink, whatsappLink } from "@/lib/catalogue";
import { categoriesOf, localText } from "@/lib/localize";
import type { Media, Order, SiteContent } from "@/lib/schema";
import { SITE_CSS } from "@/lib/siteCss";
import { themeVars } from "@/lib/themes";

type Props = {
  site: SiteContent & { whatsapp: string; slug?: string };
  preview?: boolean; // review screen: don't save orders
};

// Cart entries are keyed by product index and chosen option index ("3:1"; "-1" = no option).
type Cart = Record<string, number>;
const keyOf = (i: number, opt: number) => `${i}:${opt}`;

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
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();

export function SiteView({ site, preview }: Props) {
  const [cart, setCart] = useState<Cart>({});
  const [choice, setChoice] = useState<Record<number, number>>({}); // selected option per product
  const [cartOpen, setCartOpen] = useState(false);
  const [alt, setAlt] = useState(false); // showing the translation?
  const [filter, setFilter] = useState<string | null>(null);
  const [view, setView] = useState<number | null>(null); // product opened in the big view
  const [upiQr, setUpiQr] = useState<string | null>(null);
  const upi = site.upiId ? upiLink(site.upiId, site.businessName, undefined, "Order") : null;
  useEffect(() => {
    if (upi) QRCode.toDataURL(upi, { width: 200, margin: 1 }).then(setUpiQr).catch(() => setUpiQr(null));
  }, [upi]);
  const credits = [...new Set(site.items.map((i) => i.image?.credit).concat(site.hero?.credit).filter((c): c is string => !!c))];
  const dynamic = site.siteType === "dynamic";
  const storageKey = site.slug ? `sg-cart2-${site.slug}` : null;
  const L = localText(site, alt && !!site.translation);
  const u = L.ui;
  const categories = categoriesOf(site.items);

  // Drop cart entries for products that no longer exist (the draft changes while editing).
  useEffect(() => {
    setCart((c) => Object.fromEntries(Object.entries(c).filter(([k]) => Number(k.split(":")[0]) < site.items.length)));
  }, [site.items.length]);

  // Remember a customer's cart on this device.
  useEffect(() => {
    if (!storageKey || preview) return;
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) ?? "null");
      if (saved && typeof saved === "object") setCart(saved);
    } catch {}
  }, [storageKey, preview]);
  useEffect(() => {
    if (!storageKey || preview) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(cart));
    } catch {}
  }, [cart, storageKey, preview]);

  const optIndex = (i: number) => (site.items[i].options?.length ? (choice[i] ?? 0) : -1);
  const change = (key: string, d: number) =>
    setCart((c) => {
      const n = Math.min(99, Math.max(0, (c[key] ?? 0) + d));
      const next = { ...c, [key]: n };
      if (!n) delete next[key];
      return next;
    });

  // Lines use the main-language names so orders read the same for the owner whichever
  // language the customer browsed in.
  const lines = useMemo(
    () =>
      Object.entries(cart)
        .map(([k, qty]) => {
          const [i, o] = k.split(":").map(Number);
          const it = site.items[i];
          if (!it) return null;
          return { key: k, index: i, optIndex: o, name: it.name, price: it.price, option: o >= 0 ? (it.options?.[o] ?? null) : null, qty };
        })
        .filter((l): l is NonNullable<typeof l> => l !== null && l.qty > 0),
    [cart, site.items],
  );
  const count = lines.reduce((s, l) => s + l.qty, 0);
  const total = orderTotal(lines);
  const vars = themeVars(site.theme.id, site.theme.accent) as CSSProperties;
  const heroType = !site.hero;
  const heroFull = !heroType && site.theme.heroStyle === "full";
  const anyImages = site.items.some((it) => it.image);
  const visible = filter ? site.items.filter((it) => it.category === filter).length : site.items.length;
  const cols = Math.min(4, Math.max(2, visible));
  const wa = site.whatsapp;
  const phone = wa.startsWith("91") && wa.length === 12 ? `+91 ${wa.slice(2, 7)} ${wa.slice(7)}` : `+${wa}`;
  const aboutImage = site.gallery.find((m) => m.kind === "image") ?? null;

  return (
    <div className="site-box">
      <style dangerouslySetInnerHTML={{ __html: SITE_CSS }} />
      <div className={`site theme-${site.theme.id} ${preview ? "is-preview" : ""}`} style={vars}>
        <header className="s-header">
          <div className="s-wrap s-header-row">
            <a href="#top" className="s-brand">
              {L.businessName || "Your shop"}
            </a>
            <nav className="s-nav" aria-label="Sections">
              <a href="#products">{dynamic ? u.shop : u.products}</a>
              {L.about && <a href="#about">{u.about}</a>}
              {site.gallery.length > 0 && <a href="#gallery">{u.gallery}</a>}
              <a href="#contact">{u.contact}</a>
            </nav>
            {site.translation && (
              <button className="s-lang" onClick={() => setAlt((a) => !a)} aria-label="Change language">
                {alt ? "English" : site.translation.label}
              </button>
            )}
            {dynamic ? (
              <button className="s-btn s-btn-sm" onClick={() => setCartOpen(true)}>
                {u.cartShort}
                {count > 0 ? ` · ${count}` : ""}
              </button>
            ) : (
              <a className="s-btn s-btn-sm" href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer">
                WhatsApp
              </a>
            )}
          </div>
        </header>

        <section id="top" className={`s-hero ${heroType ? "s-hero-type" : heroFull ? "s-hero-full" : "s-hero-split"}`}>
          {heroFull && site.hero && <MediaBox media={site.hero} className="s-hero-bg" eager />}
          <div className="s-wrap s-hero-inner">
            <div className="s-hero-copy">
              {L.category && <p className="s-eyebrow">{L.area ? `${L.category} · ${L.area}` : L.category}</p>}
              <h1>{L.headline || L.businessName}</h1>
              <p className="s-lead">{L.subheadline}</p>
              <div className="s-hero-cta">
                <a className="s-btn" href="#products">
                  {dynamic ? u.shopNow : u.seeProducts}
                </a>
                <a className="s-btn s-btn-ghost" href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer">
                  {u.chat}
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

        {L.highlights.length > 0 && (
          <section className="s-highlights">
            <div className="s-wrap s-highlights-row">
              {L.highlights.map((h) => (
                <p key={h}>{h}</p>
              ))}
            </div>
          </section>
        )}

        <section id="products" className="s-section">
          <div className="s-wrap">
            <div className="s-section-head">
              <h2>{dynamic ? u.shop : u.products}</h2>
              <p>{dynamic ? u.cartHint : u.pickHint}</p>
            </div>
            {categories.length > 1 && (
              <div className="s-chips" role="group" aria-label="Categories">
                <button className={!filter ? "on" : ""} onClick={() => setFilter(null)} aria-pressed={!filter}>
                  {u.all}
                </button>
                {categories.map((c) => (
                  <button key={c} className={filter === c ? "on" : ""} onClick={() => setFilter(c)} aria-pressed={filter === c}>
                    {L.items.find((x) => x.category === c)?.categoryLabel ?? c}
                  </button>
                ))}
              </div>
            )}
            <div className={`s-grid ${anyImages ? "" : "s-grid-text"}`} style={{ "--cols": cols } as CSSProperties}>
              {L.items.map((it, i) => {
                if (filter && site.items[i].category !== filter) return null;
                const out = it.inStock === false;
                const o = optIndex(i);
                const key = keyOf(i, o);
                const n = cart[key] ?? 0;
                return (
                  <article key={i} className={`s-card ${out ? "is-out" : ""}`}>
                    {anyImages && (
                      <div className="s-card-media" onClick={() => setView(i)} role="presentation">
                        {it.image ? (
                          <>
                            <MediaBox media={it.image} />
                            {it.image.generated && <span className="s-ai-tag">{u.samplePhoto}</span>}
                          </>
                        ) : (
                          <div className="s-card-mono">{initials(it.name || "?")}</div>
                        )}
                        {out && <span className="s-out-tag">{u.outOfStock}</span>}
                      </div>
                    )}
                    {!anyImages && <span className="s-card-num">{String(i + 1).padStart(2, "0")}</span>}
                    <div className="s-card-body">
                      <h3>
                        <button className="s-card-title" onClick={() => setView(i)}>
                          {it.name}
                        </button>
                      </h3>
                      {it.description && <p className="s-card-desc">{it.description}</p>}
                      {!!it.options?.length && (
                        <div className="s-opts" role="radiogroup" aria-label={it.optionName ?? "Options"}>
                          {it.options.map((label, j) => (
                            <button
                              key={j}
                              role="radio"
                              aria-checked={o === j}
                              className={o === j ? "on" : ""}
                              onClick={() => setChoice((c) => ({ ...c, [i]: j }))}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      )}
                      <div className="s-card-foot">
                        <span className="s-price">
                          {formatPrice(it.price)}
                          {it.unit && <small> {it.unit}</small>}
                        </span>
                        {out ? (
                          !anyImages && <span className="s-out-text">{u.outOfStock}</span>
                        ) : n > 0 ? (
                          <div className="s-qty">
                            <button onClick={() => change(key, -1)} aria-label={`One less ${it.name}`}>
                              −
                            </button>
                            <span aria-live="polite">{n}</span>
                            <button onClick={() => change(key, 1)} aria-label={`One more ${it.name}`}>
                              +
                            </button>
                          </div>
                        ) : (
                          <button className="s-add" onClick={() => change(key, 1)} aria-label={`Add ${it.name}`}>
                            {dynamic ? u.addToCart : u.add}
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {L.about && (
          <section id="about" className="s-section s-about">
            <div className={`s-wrap ${aboutImage ? "s-about-grid" : ""}`}>
              <div>
                <h2>
                  {u.about} {L.businessName}
                </h2>
                <p className="s-about-text">{L.about}</p>
              </div>
              {aboutImage && <MediaBox media={aboutImage} className="s-about-img" />}
            </div>
          </section>
        )}

        {site.gallery.length > 0 && (
          <section id="gallery" className="s-section">
            <div className="s-wrap">
              <div className="s-section-head">
                <h2>{u.gallery}</h2>
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
              <h2>{u.visit}</h2>
              {site.address || L.area || L.hours ? (
                <ul className="s-contact-list">
                  {site.address ? (
                    <li>
                      <span>{u.address}</span>
                      {site.address}
                    </li>
                  ) : (
                    L.area && (
                      <li>
                        <span>{u.area}</span>
                        {L.area}
                      </li>
                    )
                  )}
                  {L.hours && (
                    <li>
                      <span>{u.hours}</span>
                      {L.hours}
                    </li>
                  )}
                </ul>
              ) : (
                <p className="s-muted">{u.messageUs}</p>
              )}
              {(site.address || site.area) && (
                <a
                  className="s-link"
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${site.businessName} ${site.address ?? site.area}`)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {u.maps} ↗
                </a>
              )}
            {site.delivery && (
              <ul className="s-contact-list s-delivery">
                {site.delivery.areas && (
                  <li>
                    <span>{u.deliveryTo}</span>
                    {site.delivery.areas}
                  </li>
                )}
                {!!site.delivery.charge && (
                  <li>
                    <span>{u.deliveryCharge}</span>
                    {formatPrice(site.delivery.charge)}
                    {site.delivery.freeAbove ? ` · ${u.freeAbove} ${formatPrice(site.delivery.freeAbove)}` : ""}
                  </li>
                )}
                {!!site.delivery.minOrder && (
                  <li>
                    <span>{u.minOrder}</span>
                    {formatPrice(site.delivery.minOrder)}
                  </li>
                )}
              </ul>
            )}
            </div>
            <div className="s-contact-card">
              <p className="s-muted">WhatsApp</p>
              <p className="s-phone">{phone}</p>
              <a className="s-btn" href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer">
                {u.messageOnWa}
              </a>
              {upi && (
                <div className="s-upi">
                  <p className="s-muted">{u.upiHint}</p>
                  <div className="s-upi-row">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {upiQr && <img src={upiQr} alt={`UPI QR code for ${site.upiId}`} width={110} height={110} />}
                    <div>
                      <p className="s-upi-id">{site.upiId}</p>
                      <a className="s-btn s-btn-ghost s-btn-sm" href={upi}>
                        {u.payUpi}
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        <footer className="s-footer">
          <div className="s-wrap s-footer-row">
            <span>
              © {L.businessName}
              {credits.length > 0 && <small className="s-credits"> · {u.photosBy}: {credits.map((c) => c.replace(/^Photo: /, "")).join(", ")}</small>}
            </span>
            <span>
              <a href="/privacy">{u.privacy}</a> · <a href="/">Made with SiteGenie</a>
            </span>
          </div>
        </footer>

        {view !== null && L.items[view] && (
          <ProductView
            item={L.items[view]}
            index={view}
            ui={u}
            dynamic={dynamic}
            option={optIndex(view)}
            qty={cart[keyOf(view, optIndex(view))] ?? 0}
            onOption={(j) => setChoice((c) => ({ ...c, [view]: j }))}
            onChange={(d) => change(keyOf(view, optIndex(view)), d)}
            onClose={() => setView(null)}
          />
        )}

        {!dynamic && count > 0 && (
          <div className="s-orderbar">
            <a className="s-btn s-btn-wa" href={whatsappLink(wa, orderText(site.businessName, lines))} target="_blank" rel="noreferrer">
              {u.orderOnWa} · {formatPrice(total)}
            </a>
          </div>
        )}
        {dynamic && count > 0 && !cartOpen && (
          <div className="s-orderbar">
            <button className="s-btn" onClick={() => setCartOpen(true)}>
              {u.viewCart} · {count} · {formatPrice(total)}
            </button>
          </div>
        )}
        {dynamic && cartOpen && (
          <CartDrawer
            site={site}
            ui={u}
            delivery={deliveryFor(site.delivery, total)}
            minOrder={site.delivery?.minOrder ?? null}
            lines={lines}
            total={total}
            preview={preview}
            onChange={change}
            onClose={() => setCartOpen(false)}
            onPlaced={() => setCart({})}
          />
        )}
      </div>
    </div>
  );
}

type Line = { key: string; index: number; optIndex: number; name: string; price: number | null; option: string | null; qty: number };

function CartDrawer({
  site,
  ui,
  delivery,
  minOrder,
  lines,
  total,
  preview,
  onChange,
  onClose,
  onPlaced,
}: {
  site: Props["site"];
  ui: ReturnType<typeof localText>["ui"];
  delivery: number;
  minOrder: number | null;
  lines: Line[];
  total: number;
  preview?: boolean;
  onChange: (key: string, d: number) => void;
  onClose: () => void;
  onPlaced: () => void;
}) {
  const [customer, setCustomer] = useState({ name: "", phone: "", address: "", note: "" });
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [placed, setPlaced] = useState<{ link: string; id?: string; track?: string } | null>(null);
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
        body: JSON.stringify({ customer, lines: lines.map((l) => ({ index: l.index, qty: l.qty, option: l.option })) }),
      });
      const data = (await res.json()) as { errors?: string[]; error?: string; order?: Order; link?: string };
      if (!res.ok || !data.order) return setErrors(data.errors ?? [data.error ?? "Couldn't place the order."]);
      const o = data.order;
      setPlaced({ link: whatsappLink(site.whatsapp, orderText(site.businessName, o.lines, o.customer, o.id, data.link)), id: o.id, track: data.link });
      onPlaced();
    } catch {
      setErrors(["Network error. Check your connection and try again."]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="s-drawer-wrap" role="dialog" aria-modal="true" aria-label={ui.cart}>
      <button className="s-drawer-scrim" onClick={onClose} aria-label="Close cart" />
      <div className="s-drawer">
        <div className="s-drawer-head">
          <h2>{placed ? "Almost done" : ui.cart}</h2>
          <button className="s-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        {placed ? (
          <div className="s-placed">
            <p>
              {placed.id ? `Order #${shortId(placed.id)} is saved. ` : ""}Tap below to send it to {site.businessName} on WhatsApp so they can confirm.
            </p>
            <a className="s-btn s-btn-wa" href={placed.link} target="_blank" rel="noreferrer">
              {ui.orderOnWa}
            </a>
            {placed.track && (
              <a className="s-btn s-btn-ghost" href={placed.track} target="_blank" rel="noreferrer">
                View or change my order
              </a>
            )}
            {preview && <p className="s-muted">Preview: orders aren’t saved until the site is published.</p>}
          </div>
        ) : lines.length === 0 ? (
          <p className="s-muted">{ui.empty}</p>
        ) : (
          <form onSubmit={checkout} className="s-checkout">
            <ul className="s-lines">
              {lines.map((l) => (
                <li key={l.key}>
                  <span>{lineName(l)}</span>
                  <div className="s-qty">
                    <button type="button" onClick={() => onChange(l.key, -1)} aria-label={`One less ${l.name}`}>
                      −
                    </button>
                    <span>{l.qty}</span>
                    <button type="button" onClick={() => onChange(l.key, 1)} aria-label={`One more ${l.name}`}>
                      +
                    </button>
                  </div>
                  <span className="s-line-price">{formatPrice((l.price ?? 0) * l.qty)}</span>
                </li>
              ))}
            </ul>
            {delivery > 0 && (
              <p className="s-total s-sub">
                <span>{ui.delivery}</span>
                <span>{formatPrice(delivery)}</span>
              </p>
            )}
            <p className="s-total">
              <span>{ui.total}</span>
              <strong>{formatPrice(total + delivery)}</strong>
            </p>
            {!!minOrder && total < minOrder && (
              <p className="s-errors">
                {ui.belowMin} {formatPrice(minOrder)}.
              </p>
            )}
            <label htmlFor="c-name">{ui.yourName}</label>
            <input id="c-name" value={customer.name} onChange={set("name")} autoComplete="name" required />
            <label htmlFor="c-phone">{ui.phone}</label>
            <input id="c-phone" value={customer.phone} onChange={set("phone")} inputMode="tel" autoComplete="tel" required />
            <label htmlFor="c-address">{ui.deliveryAddress}</label>
            <textarea id="c-address" value={customer.address} onChange={set("address")} autoComplete="street-address" required />
            <label htmlFor="c-note">{ui.note}</label>
            <input id="c-note" value={customer.note} onChange={set("note")} />
            {errors.length > 0 && (
              <div className="s-errors">
                {errors.map((er) => (
                  <p key={er}>{er}</p>
                ))}
              </div>
            )}
            <button className="s-btn s-btn-block" disabled={busy || (!!minOrder && total < minOrder)}>
              {busy ? "…" : `${ui.placeOrder} · ${formatPrice(total + delivery)}`}
            </button>
            <p className="s-muted s-small">
              {ui.payNote} {ui.checkoutNote}{" "}
              <a href="/privacy" target="_blank" rel="noreferrer">
                {ui.privacy}
              </a>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

function ProductView({
  item,
  index,
  ui,
  dynamic,
  option,
  qty,
  onOption,
  onChange,
  onClose,
}: {
  item: ReturnType<typeof localText>["items"][number];
  index: number;
  ui: ReturnType<typeof localText>["ui"];
  dynamic: boolean;
  option: number;
  qty: number;
  onOption: (j: number) => void;
  onChange: (d: number) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const out = item.inStock === false;
  return (
    <div className="s-drawer-wrap s-pv-wrap" role="dialog" aria-modal="true" aria-label={item.name} data-index={index}>
      <button className="s-drawer-scrim" onClick={onClose} aria-label={ui.close} />
      <div className="s-pv">
        <button className="s-close s-pv-close" onClick={onClose} aria-label={ui.close}>
          ×
        </button>
        {item.image && <MediaBox media={item.image} className="s-pv-img" eager />}
        <div className="s-pv-body">
          <h2>{item.name}</h2>
          <p className="s-price">
            {formatPrice(item.price)}
            {item.unit && <small> {item.unit}</small>}
          </p>
          {item.description && <p className="s-pv-desc">{item.description}</p>}
          {!!item.options?.length && (
            <div className="s-opts" role="radiogroup" aria-label={item.optionName ?? "Options"}>
              {item.options.map((label, j) => (
                <button key={j} role="radio" aria-checked={option === j} className={option === j ? "on" : ""} onClick={() => onOption(j)}>
                  {label}
                </button>
              ))}
            </div>
          )}
          {out ? (
            <p className="s-out-text">{ui.outOfStock}</p>
          ) : qty > 0 ? (
            <div className="s-qty s-pv-qty">
              <button onClick={() => onChange(-1)} aria-label={`One less ${item.name}`}>
                −
              </button>
              <span aria-live="polite">{qty}</span>
              <button onClick={() => onChange(1)} aria-label={`One more ${item.name}`}>
                +
              </button>
            </div>
          ) : (
            <button className="s-btn s-btn-block" onClick={() => onChange(1)}>
              {dynamic ? ui.addToCart : ui.add}
            </button>
          )}
          {item.image?.generated && <p className="s-muted s-small">{ui.samplePhoto}{item.image.credit ? ` · ${item.image.credit.replace(/^Photo: /, "")}` : ""}</p>}
        </div>
      </div>
    </div>
  );
}
