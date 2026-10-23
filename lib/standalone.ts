// Builds a customer's website as one self-contained HTML page for separate hosting
// (Cloudflare Pages). Same markup classes and CSS as SiteView, so it looks identical.
// When the site has a second language, the page holds both versions and a small script
// switches between them; one cart is shared across both.
import QRCode from "qrcode";
import { formatPrice, upiLink, whatsappLink } from "./catalogue";
import { openStatus, parseHours } from "./hours";
import { categoriesOf, localText, type LocalText } from "./localize";
import type { Media, Site } from "./schema";
import { jsonLd, ogImageUrl } from "./seo";
import { aboutFacts, askText, badgeLabel, cssUrl, FEST_ICON, festGreeting, heroMosaic, howSteps, isFramed, quoteOnly, SEARCH_MIN, storeBar, storePerks } from "./siteBits";
import { SITE_CSS } from "./siteCss";
import { themeVars } from "./themes";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const FONTS: Record<string, string> = {
  boutique: "family=Cormorant+Garamond:wght@500;600;700&family=Jost:wght@400;500;600;700",
  kitchen: "family=Fraunces:wght@600;700&family=Nunito+Sans:wght@400;600;700;800",
  fresh: "family=Baloo+2:wght@500;700;800&family=Hind:wght@400;500;600",
  studio: "family=Sora:wght@600;700&family=Manrope:wght@400;500;700;800",
  craft: "family=Playfair+Display:wght@600;700&family=Mulish:wght@400;600;700;800",
  bazaar: "family=Archivo:wght@400;600;800",
};
const FONT_VARS = `:root{--f-cormorant:"Cormorant Garamond";--f-jost:"Jost";--f-fraunces:"Fraunces";--f-nunito:"Nunito Sans";--f-baloo:"Baloo 2";--f-hind:"Hind";--f-sora:"Sora";--f-manrope:"Manrope";--f-playfair:"Playfair Display";--f-mulish:"Mulish";--f-archivo:"Archivo";--f-kannada:"Noto Sans Kannada";--f-devanagari:"Noto Sans Devanagari";--f-tamil:"Noto Sans Tamil";--f-telugu:"Noto Sans Telugu";--f-malayalam:"Noto Sans Malayalam"}`;

const WA_SVG = `<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true"><path d="M12 2.6a9.4 9.4 0 0 0-8.1 14.1L2.6 21.4l4.8-1.3A9.4 9.4 0 1 0 12 2.6z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M9 7.9c.2-.5.5-.5.8-.5h.6c.2 0 .4 0 .6.5l.8 1.8c.1.2.1.4 0 .6l-.6.8c-.1.2-.1.4 0 .5a7 7 0 0 0 2.9 2.8c.2.1.4.1.5 0l.8-.8c.2-.2.4-.2.6-.1l1.8.8c.2.1.4.2.4.4v.6c0 .5-.3 1-.9 1.3-.6.3-1.7.5-3.6-.3a10.4 10.4 0 0 1-4.6-4.3C8.4 10.4 8.6 8.7 9 7.9z" fill="currentColor"/></svg>`;

const initials = (name: string) =>
  name.split(/\s+/).slice(0, 2).map((w) => w[0] ?? "").join("").toUpperCase();

function media(m: Media, cls = "", eager = false) {
  const c = cls ? ` class="${cls}"` : "";
  return m.kind === "video"
    ? `<video${c} src="${esc(m.url)}" autoplay muted loop playsinline preload="metadata" aria-label="${esc(m.alt)}"></video>`
    : `<img${c} src="${esc(m.url)}" alt="${esc(m.alt)}" loading="${eager ? "eager" : "lazy"}">`;
}

// One full copy of the site's markup in one language.
function body(site: Site, L: LocalText, appOrigin: string, lang: "base" | "alt", upiQrSvg: string | null) {
  const u = L.ui;
  // Both language copies are in one page, so the second copy needs its own section ids.
  const idp = lang === "alt" ? "alt-" : "";
  const dynamic = site.siteType === "dynamic";
  const wa = site.whatsapp;
  const mosaic = heroMosaic(site);
  const heroType = !site.hero && !mosaic.length;
  const heroFull = !!site.hero && site.theme.heroStyle === "full";
  const ask = (name: string, price: number | null) => whatsappLink(wa, askText(name, price === null ? null : formatPrice(price)));
  const quote = quoteOnly(site.items);
  const steps = howSteps(dynamic, u, quote);
  const anyImages = site.items.some((i) => i.image);
  const cols = Math.min(4, Math.max(2, site.items.length));
  const aboutImage = site.gallery.find((m) => m.kind === "image");
  const phone = wa.startsWith("91") && wa.length === 12 ? `+91 ${wa.slice(2, 7)} ${wa.slice(7)}` : `+${wa}`;
  const place = site.address || site.area ? `${site.businessName}, ${site.address ?? site.area}` : null;
  const hasHours = !!parseHours(site.hours);
  // Filled in by the page script ("Open now · closes 9 pm"), using the visitor's clock.
  const openBadge = hasHours ? `<strong class="s-open" data-open hidden></strong>` : "";
  const categories = categoriesOf(site.items);
  const langButton = site.translation
    ? `<button class="s-lang" data-act="lang" aria-label="Change language">${esc(lang === "alt" ? "English" : site.translation.label)}</button>`
    : "";

  const layout = site.theme.layout ?? "grid";
  const cards = L.items
    .map((it, i) => {
      const out = it.inStock === false;
      const badge = it.badge ? `<span class="s-badge s-badge-${it.badge}">${esc(badgeLabel(it.badge, u))}</span>` : "";
      const framed = isFramed(it.image) && layout !== "menu";
      const img = anyImages
        ? `<div class="s-card-media${framed ? " s-framed" : ""}"${framed ? ` style="${esc(`--img:${cssUrl(it.image!.url)}`)}"` : ""} data-act="view">${layout !== "menu" ? badge : ""}${
            it.image
              ? media(it.image) + (it.image.generated ? `<span class="s-ai-tag">${esc(u.samplePhoto)}</span>` : "")
              : `<div class="s-card-name-tile">${esc(it.name || "?")}</div>`
          }${out ? `<span class="s-out-tag">${esc(u.outOfStock)}</span>` : ""}</div>`
        : `<span class="s-card-num">${String(i + 1).padStart(2, "0")}</span>`;
      const opts = it.options?.length
        ? `<div class="s-opts" role="radiogroup" aria-label="${esc(it.optionName ?? "Options")}">${it.options
            .map((o, j) => `<button role="radio" data-act="opt" data-o="${j}" aria-checked="${j === 0}" class="${j === 0 ? "on" : ""}">${esc(o)}</button>`)
            .join("")}</div>`
        : "";
      const action = out
        ? anyImages && layout !== "menu"
          ? ""
          : `<span class="s-out-text">${esc(u.outOfStock)}</span>`
        : it.askPrice
          ? `<a class="s-ask-btn" href="${esc(ask(site.items[i].name, null))}" target="_blank" rel="noreferrer">${esc(u.askPriceBtn)}</a>`
          : `<span class="s-card-actions">${
              dynamic ? "" : `<a class="s-ask" href="${esc(ask(site.items[i].name, it.price))}" target="_blank" rel="noreferrer" aria-label="${esc(`${u.askOnWa}: ${it.name}`)}" title="${esc(u.askOnWa)}">${WA_SVG}</a>`
            }<button class="s-add" data-act="add" aria-label="Add ${esc(it.name)}">${esc(dynamic ? u.addToCart : u.add)}</button></span><div class="s-qty" hidden><button data-act="dec" aria-label="One less ${esc(it.name)}">−</button><span data-qty>0</span><button data-act="inc" aria-label="One more ${esc(it.name)}">+</button></div>`;
      const searchText = [site.items[i].name, it.name, site.items[i].description, it.description, site.items[i].category, it.categoryLabel].join(" ").toLowerCase();
      return `<article class="s-card${out ? " is-out" : ""}" data-i="${i}" data-s="${esc(searchText)}"${site.items[i].category ? ` data-cat="${esc(site.items[i].category!)}"` : ""}>${img}<div class="s-card-body">${!anyImages || layout === "menu" ? badge : ""}<h3><button class="s-card-title" data-act="view">${esc(it.name)}</button></h3>${
        it.description ? `<p class="s-card-desc">${esc(it.description)}</p>` : ""
      }${opts}<div class="s-card-foot">${
        it.askPrice ? `<span class="s-ask-price">${esc(u.askPrice)}</span>` : `<span class="s-price">${esc(formatPrice(it.price))}${it.unit ? `<small> ${esc(it.unit)}</small>` : ""}</span>`
      }${action}</div></div></article>`;
    })
    .join("");

  const chips =
    categories.length > 1
      ? `<div class="s-chips" role="group" aria-label="Categories"><button class="on" data-act="cat" data-cat="">${esc(u.all)}</button>${categories
          .map((c) => `<button data-act="cat" data-cat="${esc(c)}">${esc(L.items.find((x) => x.category === c)?.categoryLabel ?? c)}</button>`)
          .join("")}</div>`
      : "";

  const facts = aboutFacts(L, site.items.length, categories.length, u);
  const showSearch = site.items.length >= (dynamic ? 5 : SEARCH_MIN);
  return `<div class="site theme-${site.theme.id} ${dynamic ? "is-store" : "is-showcase"}" data-lang="${lang}" style="${esc(Object.entries(themeVars(site.theme.id, site.theme.accent)).map(([k, v]) => `${k}:${v}`).join(";"))}"${lang === "alt" ? " hidden" : ""}>
${dynamic ? `<div class="s-storebar">${esc(storeBar(site, u))}</div>` : ""}
${site.festival ? `<div class="s-festive s-fest-${site.festival.id}"><span>${FEST_ICON[site.festival.id]} ${esc(festGreeting(site.festival.id, u))}</span>${site.festival.message ? `<em>${esc(site.festival.message)}</em>` : ""}</div>` : ""}
<header class="s-header"><div class="s-wrap s-header-row"><a href="#${idp}top" class="s-brand">${esc(L.businessName)}</a>
<nav class="s-nav" aria-label="Sections"><a href="#${idp}products">${esc(dynamic ? u.shop : u.products)}</a>${L.about ? `<a href="#${idp}about">${esc(u.about)}</a>` : ""}${site.gallery.length ? `<a href="#${idp}gallery">${esc(u.gallery)}</a>` : ""}<a href="#${idp}contact">${esc(u.contact)}</a></nav>
${langButton}${dynamic ? `<button class="s-btn s-btn-sm" data-act="open-cart">${esc(u.cartShort)}<span data-count></span></button>` : `<a class="s-btn s-btn-sm" href="https://wa.me/${wa}" target="_blank" rel="noreferrer">WhatsApp</a>`}</div></header>
<section id="${idp}top" class="s-hero ${heroType ? "s-hero-type" : heroFull ? "s-hero-full" : "s-hero-split"}${mosaic.length ? " has-mosaic" : ""}">${heroFull && site.hero ? media(site.hero, "s-hero-bg", true) : ""}
<div class="s-wrap s-hero-inner"><div class="s-hero-copy">${L.category ? `<p class="s-eyebrow">${esc(L.area ? `${L.category} · ${L.area}` : L.category)}</p>` : ""}<h1>${esc(L.headline || L.businessName)}</h1><p class="s-lead">${esc(L.subheadline)}</p>
<div class="s-hero-cta"><a class="s-btn" href="#${idp}products">${esc(dynamic ? u.shopNow : u.seeProducts)}</a><a class="s-btn s-btn-ghost" href="https://wa.me/${wa}" target="_blank" rel="noreferrer">${esc(u.chat)}</a></div>${
  dynamic ? `<div class="s-perks">${storePerks(site, u).map((p) => `<span><b aria-hidden="true">${esc(p.icon)}</b> ${esc(p.text)}</span>`).join("")}</div>` : ""
}${
  hasHours || site.reviewsUrl
    ? `<div class="s-trust">${openBadge}${site.reviewsUrl ? `<a href="${esc(site.reviewsUrl)}" target="_blank" rel="noreferrer">★ ${esc(u.reviewsShort)}</a>` : ""}</div>`
    : ""
}</div>
${!heroFull && site.hero ? `<div class="s-hero-media">${media(site.hero, "", true)}</div>` : ""}${
  mosaic.length ? `<div class="s-mosaic n${mosaic.length}" aria-hidden="true">${mosaic.map((m) => `<div>${media(m, "", true)}</div>`).join("")}</div>` : ""
}</div></section>
${L.highlights.length ? `<section class="s-highlights"><div class="s-wrap s-highlights-row">${L.highlights.map((h) => `<p>${esc(h)}</p>`).join("")}</div></section>` : ""}
<section id="${idp}products" class="s-section"><div class="s-wrap"><div class="s-section-head"><h2>${esc(dynamic ? u.shop : u.products)}</h2><p>${esc(quote ? u.pickHintQuote : dynamic ? u.cartHint : u.pickHint)}</p></div>${
  chips || showSearch
    ? `<div class="s-toolbar">${chips}${showSearch ? `<div class="s-search"><input type="search" data-search placeholder="${esc(u.search)}" aria-label="${esc(u.search)}"></div>` : ""}</div>`
    : ""
}
<div class="s-seen" data-seen hidden><p>${esc(u.recent)}</p><div class="s-seen-row" data-seen-row></div></div>
<div class="s-grid${anyImages ? "" : " s-grid-text"} s-layout-${layout}" style="--cols:${cols}">${cards}</div><p class="s-noresults" data-noresults hidden>${esc(u.noResults)}</p></div></section>
<section class="s-section s-steps-wrap"><div class="s-wrap"><div class="s-section-head"><h2>${esc(steps[0].title)}</h2></div><div class="s-steps">${steps
  .map((x) => `<div class="s-step"><h3>${esc(x.heading)}</h3><p>${esc(x.body)}</p></div>`)
  .join("")}</div></div></section>
${L.about ? `<section id="${idp}about" class="s-section s-about"><div class="s-wrap${aboutImage || facts.length >= 2 ? " s-about-grid" : ""}"><div><h2>${esc(u.about)} ${esc(L.businessName)}</h2><p class="s-about-text">${esc(L.about)}</p></div>${
  aboutImage ? media(aboutImage, "s-about-img") : facts.length >= 2 ? `<dl class="s-facts">${facts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>` : ""
}</div></section>` : ""}
${site.gallery.length ? `<section id="${idp}gallery" class="s-section"><div class="s-wrap"><div class="s-section-head"><h2>${esc(u.gallery)}</h2></div><div class="s-gallery">${site.gallery.map((m) => (m.kind === "video" ? `<video src="${esc(m.url)}" controls playsinline preload="metadata" aria-label="${esc(m.alt)}"></video>` : media(m))).join("")}</div></div></section>` : ""}
<section id="${idp}contact" class="s-section s-contact"><div class="s-wrap s-contact-grid"><div><h2>${esc(u.visit)}</h2>${
    site.address || L.area || L.hours
      ? `<ul class="s-contact-list">${site.address ? `<li><span>${esc(u.address)}</span>${esc(site.address)}</li>` : L.area ? `<li><span>${esc(u.area)}</span>${esc(L.area)}</li>` : ""}${L.hours ? `<li><span>${esc(u.hours)}</span>${esc(L.hours)}${openBadge}</li>` : ""}</ul>`
      : `<p class="s-muted">${esc(u.messageUs)}</p>`
  }${
    place
      ? `<a class="s-link" href="https://www.google.com/maps/search/?api=1&amp;query=${encodeURIComponent(place)}" target="_blank" rel="noreferrer">${esc(u.maps)} ↗</a>${
          site.address
            ? `<iframe class="s-map" title="${esc(`${u.map}: ${site.businessName}`)}" src="https://maps.google.com/maps?q=${encodeURIComponent(site.address)}&amp;z=15&amp;output=embed" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`
            : ""
        }`
      : ""
  }${deliveryHtml(site, u)}</div>
<div class="s-contact-card"><p class="s-muted">WhatsApp</p><p class="s-phone">${esc(phone)}</p><a class="s-btn" href="https://wa.me/${wa}" target="_blank" rel="noreferrer">${esc(u.messageOnWa)}</a>${
    site.reviewsUrl ? `<a class="s-link s-reviews" href="${esc(site.reviewsUrl)}" target="_blank" rel="noreferrer">★ ${esc(u.reviews)} ↗</a>` : ""
  }${
    site.upiId
      ? `<div class="s-upi"><p class="s-muted">${esc(u.upiHint)}</p><div class="s-upi-row">${upiQrSvg ? `<div class="s-upi-qr" role="img" aria-label="UPI QR code">${upiQrSvg}</div>` : ""}<div><p class="s-upi-id">${esc(site.upiId)}</p><a class="s-btn s-btn-ghost s-btn-sm" href="${esc(upiLink(site.upiId, site.businessName, undefined, "Order"))}">${esc(u.payUpi)}</a></div></div></div>`
      : ""
  }</div></div></section>
<footer class="s-footer"><div class="s-wrap s-footer-row"><span>© ${esc(L.businessName)}${credits(site).length ? `<small class="s-credits"> · ${esc(u.photosBy)}: ${esc(credits(site).join(", "))}</small>` : ""}</span><span><a href="${esc(appOrigin)}/privacy" target="_blank" rel="noreferrer">${esc(u.privacy)}</a> · <a href="${esc(appOrigin)}">Made with SiteGenie</a></span></div></footer>
${dynamic ? `<a class="s-wa-fab" data-fab hidden href="https://wa.me/${wa}" target="_blank" rel="noreferrer" aria-label="${esc(u.chat)}">${WA_SVG}</a>` : ""}
<div class="s-orderbar" data-orderbar hidden>${dynamic ? `<button class="s-btn" data-act="open-cart" data-bar-label></button>` : `<a class="s-btn s-btn-wa" target="_blank" rel="noreferrer" data-bar-label></a>`}</div>
${dynamic ? cartHtml(u, appOrigin) : ""}
<div class="s-drawer-wrap s-pv-wrap" data-pv hidden role="dialog" aria-modal="true"><button class="s-drawer-scrim" data-act="close-pv" aria-label="${esc(u.close)}"></button><div class="s-pv"><button class="s-close s-pv-close" data-act="close-pv" aria-label="${esc(u.close)}">×</button><div data-pv-media></div><div class="s-pv-body"><span data-pv-badge hidden></span><h2 data-pv-name></h2><p class="s-price" data-pv-price></p><p class="s-pv-desc" data-pv-desc></p><div class="s-opts" data-pv-opts></div><div data-pv-action></div><p class="s-muted s-small" data-pv-credit></p></div></div></div>
</div>`;
}

const credits = (site: Site) =>
  [...new Set(site.items.map((i) => i.image?.credit).concat(site.hero?.credit).filter((c): c is string => !!c))].map((c) => c.replace(/^Photo: /, ""));

function deliveryHtml(site: Site, u: LocalText["ui"]) {
  const d = site.delivery;
  if (!d) return "";
  const rows = [
    d.areas ? `<li><span>${esc(u.deliveryTo)}</span>${esc(d.areas)}</li>` : "",
    d.charge ? `<li><span>${esc(u.deliveryCharge)}</span>${esc(formatPrice(d.charge))}${d.freeAbove ? ` · ${esc(u.freeAbove)} ${esc(formatPrice(d.freeAbove))}` : ""}</li>` : "",
    d.minOrder ? `<li><span>${esc(u.minOrder)}</span>${esc(formatPrice(d.minOrder))}</li>` : "",
  ].join("");
  return rows ? `<ul class="s-contact-list s-delivery">${rows}</ul>` : "";
}

const cartHtml = (u: LocalText["ui"], appOrigin: string) => `<div class="s-drawer-wrap" data-cart hidden role="dialog" aria-modal="true" aria-label="${esc(u.cart)}"><button class="s-drawer-scrim" data-act="close-cart" aria-label="Close cart"></button><div class="s-drawer">
<div class="s-drawer-head"><h2 data-cart-title>${esc(u.cart)}</h2><button class="s-close" data-act="close-cart" aria-label="Close">×</button></div>
<div data-placed hidden class="s-placed"><p data-placed-text></p><a class="s-btn s-btn-wa" data-placed-link target="_blank" rel="noreferrer">${esc(u.orderOnWa)}</a><a class="s-btn s-btn-ghost" data-track-link target="_blank" rel="noreferrer" hidden>View or change my order</a></div>
<p class="s-muted" data-empty>${esc(u.empty)}</p>
<form class="s-checkout" data-form><ul class="s-lines" data-lines></ul><p class="s-total s-sub" data-delivery-row hidden><span>${esc(u.delivery)}</span><span data-delivery></span></p><p class="s-total"><span>${esc(u.total)}</span><strong data-total></strong></p><p class="s-errors" data-min hidden>${esc(u.belowMin)} <span data-min-amt></span>.</p>
<label>${esc(u.yourName)}<input name="name" autocomplete="name" required></label>
<label>${esc(u.phone)}<input name="phone" inputmode="tel" autocomplete="tel" required></label>
<label>${esc(u.deliveryAddress)}<textarea name="address" autocomplete="street-address" required></textarea></label>
<label>${esc(u.note)}<input name="note"></label>
<div class="s-errors" data-errors hidden></div><button class="s-btn s-btn-block" data-submit data-label="${esc(u.placeOrder)}"></button>
<p class="s-muted s-small">${esc(u.payNote)} ${esc(u.checkoutNote)} <a href="${esc(appOrigin)}/privacy" target="_blank" rel="noreferrer">${esc(u.privacy)}</a></p></form></div></div>`;

export async function renderStandalone(site: Site, appOrigin: string): Promise<string> {
  const upiQrSvg = site.upiId
    ? await QRCode.toString(upiLink(site.upiId, site.businessName, undefined, "Order"), { type: "svg", margin: 1, width: 110 }).catch(() => null)
    : null;
  const base = localText(site, false);
  const alt = site.translation ? localText(site, true) : null;
  const allText = JSON.stringify([base, alt]);
  const fonts = [FONTS[site.theme.id] ?? FONTS.bazaar];
  const scripts: [RegExp, string][] = [
    [/[\u0C80-\u0CFF]/, "Noto+Sans+Kannada"],
    [/[\u0900-\u097F]/, "Noto+Sans+Devanagari"],
    [/[\u0B80-\u0BFF]/, "Noto+Sans+Tamil"],
    [/[\u0C00-\u0C7F]/, "Noto+Sans+Telugu"],
    [/[\u0D00-\u0D7F]/, "Noto+Sans+Malayalam"],
  ];
  for (const [re, fam] of scripts) if (re.test(allText)) fonts.push(`family=${fam}:wght@400;600;700`);
  const ogImage = ogImageUrl(appOrigin, site);
  const pageUrl = site.live?.url ?? `${appOrigin}/p/${site.slug}`;

  const config = {
    slug: site.slug,
    name: site.businessName,
    wa: site.whatsapp,
    dynamic: site.siteType === "dynamic",
    api: `${appOrigin}/api/orders/${site.slug}`,
    visit: `${appOrigin}/api/visit/${site.slug}`,
    items: site.items.map((i) => ({ name: i.name, price: i.price, options: i.options ?? [] })),
    delivery: site.delivery ? { charge: site.delivery.charge ?? 0, freeAbove: site.delivery.freeAbove ?? 0, minOrder: site.delivery.minOrder ?? 0 } : null,
    view: Object.fromEntries(
      ([["base", base], ["alt", alt]] as const)
        .filter(([, l]) => l)
        .map(([k, l]) => [
          k,
          l!.items.map((it) => ({
            name: it.name,
            desc: it.description,
            price: it.askPrice ? l!.ui.askPrice : formatPrice(it.price) + (it.unit ? ` ${it.unit}` : ""),
            img: it.image?.kind === "image" ? it.image.url : null,
            credit: it.image?.generated ? [l!.ui.samplePhoto, it.image.credit?.replace(/^Photo: /, "")].filter(Boolean).join(" · ") : "",
            options: it.options ?? [],
            out: it.inStock === false,
            add: site.siteType === "dynamic" ? l!.ui.addToCart : l!.ui.add,
            outLabel: l!.ui.outOfStock,
            badge: it.badge ? badgeLabel(it.badge, l!.ui) : "",
            ask: it.askPrice ? whatsappLink(site.whatsapp, askText(it.name, null)) : "",
            askLabel: l!.ui.askPriceBtn,
            badgeKind: it.badge ?? "",
          })),
        ]),
    ),
    ui: { base: { orderOnWa: base.ui.orderOnWa, viewCart: base.ui.viewCart }, alt: alt ? { orderOnWa: alt.ui.orderOnWa, viewCart: alt.ui.viewCart } : null },
    hours: parseHours(site.hours),
    openWords: Object.fromEntries(
      ([["base", base], ["alt", alt]] as const)
        .filter(([, l]) => l)
        .map(([k, l]) => [k, { openNow: l!.ui.openNow, closes: l!.ui.closes, closedNow: l!.ui.closedNow, opens: l!.ui.opens, tomorrow: l!.ui.tomorrow }]),
    ),
  };

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(site.businessName)}</title><meta name="description" content="${esc(site.subheadline)}">
<meta property="og:type" content="website"><meta property="og:url" content="${esc(pageUrl)}"><meta property="og:title" content="${esc(site.businessName)}"><meta property="og:description" content="${esc(site.subheadline)}"><meta property="og:image" content="${esc(ogImage)}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta name="twitter:card" content="summary_large_image"><link rel="canonical" href="${esc(pageUrl)}">
<script type="application/ld+json">${jsonLd(site, pageUrl, appOrigin)}</script>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?${fonts.join("&")}&display=swap">
<style>${FONT_VARS}html,body{margin:0}${SITE_CSS}.site [hidden],.site[hidden]{display:none!important}.s-checkout label{display:grid;gap:4px}.s-upi-qr svg{width:110px;height:110px;display:block}</style></head>
<body><div class="site-box">
${body(site, base, appOrigin, "base", upiQrSvg)}
${alt ? body(site, alt, appOrigin, "alt", upiQrSvg) : ""}
</div>
<script type="application/json" id="sg-config">${JSON.stringify(config).replace(/</g, "\\u003c")}</script>
<script>var sgOpenStatus=(${openStatus.toString()});${SCRIPT}</script>
</body></html>`;
}

// Plain browser script for the standalone page (no framework). Cart keys are
// "<product index>:<option index>" ("-1" = no option), shared by both language copies.
const SCRIPT = `(function(){
var C=JSON.parse(document.getElementById("sg-config").textContent);
var key="sg-cart2-"+C.slug,cart={},choice={},lang="base";
try{var s=JSON.parse(localStorage.getItem(key)||"null");if(s&&typeof s==="object")cart=s}catch(e){}
try{if(localStorage.getItem("sg-lang-"+C.slug)==="alt"&&C.ui.alt)lang="alt"}catch(e){}
try{if(navigator.sendBeacon)navigator.sendBeacon(C.visit)}catch(e){}
function rs(n){return n==null?"\\u2014":"\\u20B9"+n.toLocaleString("en-IN")}
function opt(i){return C.items[i].options.length?(choice[i]||0):-1}
function lines(){var o=[];Object.keys(cart).forEach(function(k){var p=k.split(":"),i=+p[0],j=+p[1],it=C.items[i];if(it&&cart[k]>0)o.push({key:k,index:i,name:it.name,price:it.price,option:j>=0?it.options[j]:null,qty:cart[k]})});return o}
function total(l){return l.reduce(function(s,x){return s+(x.price||0)*x.qty},0)}
function dlv(t){var d=C.delivery;if(!d||!d.charge)return 0;return d.freeAbove&&t>=d.freeAbove?0:d.charge}
function sid(id){return String(id).split("-").pop().toUpperCase()}
function nm(x){return x.option?x.name+" ("+x.option+")":x.name}
function text(l,c,id,link){var t=["Hi "+C.name+", I'd like to order:"];l.forEach(function(x){t.push("\\u2022 "+nm(x)+" \\u00D7 "+x.qty+(x.price!=null?" \\u2014 "+rs(x.price*x.qty):""))});t.push("Total: "+rs(total(l)));if(c){t.push("","Name: "+c.name,"Phone: "+c.phone,"Deliver to: "+c.address);if(c.note)t.push("Note: "+c.note)}if(id)t.push("Order #"+sid(id));if(link)t.push("","See or change this order: "+link);return t.join("\\n")}
function wa(t){return "https://wa.me/"+C.wa+"?text="+encodeURIComponent(t)}
var $=function(s,r){return (r||document).querySelector(s)},$$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
function root(){return $('.site[data-lang="'+lang+'"]')||$(".site")}
function render(){try{localStorage.setItem(key,JSON.stringify(cart));localStorage.setItem("sg-lang-"+C.slug,lang)}catch(e){}
$$(".site").forEach(function(r){r.hidden=r.dataset.lang!==lang});
var R=root(),U=(lang==="alt"&&C.ui.alt)||C.ui.base;
$$(".s-card[data-i]").forEach(function(card){var i=+card.dataset.i,o=opt(i),n=cart[i+":"+o]||0,add=$('[data-act="add"]',card),q=$(".s-qty",card);
$$('[data-act="opt"]',card).forEach(function(b){var on=+b.dataset.o===o;b.classList.toggle("on",on);b.setAttribute("aria-checked",on)});
if(add){add.hidden=n>0;q.hidden=n===0;$("[data-qty]",card).textContent=n}});
var l=lines(),count=l.reduce(function(s,x){return s+x.qty},0),bar=$("[data-orderbar]",R),lab=$("[data-bar-label]",R),cartEl=$("[data-cart]",R);
$$("[data-count]").forEach(function(e){e.textContent=count?" \\u00B7 "+count:""});
var open=C.dynamic&&cartEl&&!cartEl.hidden;bar.hidden=count===0||open;busy=count>0||!!open;fab();
if(C.dynamic){lab.textContent=U.viewCart+" \\u00B7 "+count+" \\u00B7 "+rs(total(l));renderCart(l,R)}
else{lab.textContent=U.orderOnWa+" \\u00B7 "+rs(total(l));lab.href=wa(text(l))}}
function renderCart(l,R){var ul=$("[data-lines]",R);if(!ul)return;ul.innerHTML="";
l.forEach(function(x){var li=document.createElement("li"),n=document.createElement("span");n.textContent=nm(x);
var qd=document.createElement("div");qd.className="s-qty";qd.innerHTML='<button type="button">\\u2212</button><span></span><button type="button">+</button>';qd.querySelector("span").textContent=x.qty;
var b=qd.querySelectorAll("button");b[0].onclick=function(){bump(x.key,-1)};b[1].onclick=function(){bump(x.key,1)};
var pr=document.createElement("span");pr.className="s-line-price";pr.textContent=rs((x.price||0)*x.qty);li.append(n,qd,pr);ul.appendChild(li)});
var t=total(l),dv=dlv(t),mn=C.delivery&&C.delivery.minOrder&&t<C.delivery.minOrder;$("[data-delivery-row]",R).hidden=!dv;$("[data-delivery]",R).textContent=rs(dv);$("[data-total]",R).textContent=rs(t+dv);$("[data-min]",R).hidden=!mn;if(mn)$("[data-min-amt]",R).textContent=rs(C.delivery.minOrder);var sb=$("[data-submit]",R);sb.disabled=!!mn;sb.textContent=sb.dataset.label+" \\u00B7 "+rs(t+dv);
var placed=!$("[data-placed]",R).hidden;$("[data-form]",R).hidden=placed||l.length===0;$("[data-empty]",R).hidden=placed||l.length>0}
var pv=-1,busy=false,F={cat:"",q:""},SK="sg-seen-"+C.slug,seen=[];
try{var sv=JSON.parse(localStorage.getItem(SK)||"[]");if(Array.isArray(sv))seen=sv}catch(e){}
function filt(R){var n=0;$$(".s-card[data-i]",R).forEach(function(cd){var ok=(!F.cat||cd.dataset.cat===F.cat)&&(!F.q||(cd.dataset.s||"").indexOf(F.q)>=0);cd.hidden=!ok;if(ok)n++});var nr=$("[data-noresults]",R);if(nr)nr.hidden=!(F.q&&!n)}
function renderSeen(){var list=C.items.length>=4?seen.filter(function(x){return x<C.items.length}).slice(0,6):[];
$$(".site").forEach(function(R){var box=$("[data-seen]",R),row=$("[data-seen-row]",R),V=C.view[R.dataset.lang]||C.view.base;if(!box)return;box.hidden=!list.length;row.innerHTML="";
list.forEach(function(i){var v=V[i];if(!v)return;var b=document.createElement("button");b.dataset.act="view-seen";b.dataset.i=i;if(v.img){var im=document.createElement("img");im.src=v.img;im.alt="";im.loading="lazy";b.appendChild(im)}var sp=document.createElement("span");sp.textContent=v.name;b.appendChild(sp);row.appendChild(b)})})}
function fab(){var R=root(),h=$(".s-hero",R),f=$("[data-fab]",R);if(f)f.hidden=busy||!h||window.scrollY<h.offsetTop+h.offsetHeight}
window.addEventListener("scroll",fab,{passive:true});
function openView(i){pv=i;var R=root(),v=((C.view[lang]||C.view.base)||[])[i];if(!v)return;var w=$("[data-pv]",R);
var m=$("[data-pv-media]",w);m.innerHTML="";if(v.img){var im=document.createElement("img");im.className="s-pv-img";im.src=v.img;im.alt=v.name;m.appendChild(im)}
var bd=$("[data-pv-badge]",w);bd.hidden=!v.badge;bd.className=v.badge?"s-badge s-badge-"+v.badgeKind:"";bd.textContent=v.badge||"";$("[data-pv-name]",w).textContent=v.name;$("[data-pv-price]",w).textContent=v.price;$("[data-pv-desc]",w).textContent=v.desc||"";$("[data-pv-credit]",w).textContent=v.credit||"";
var os=$("[data-pv-opts]",w);os.innerHTML="";v.options.forEach(function(o,j){var b=document.createElement("button");b.textContent=o;b.dataset.act="pv-opt";b.dataset.o=j;b.className=opt(i)===j?"on":"";os.appendChild(b)});
var ac=$("[data-pv-action]",w),n=cart[i+":"+opt(i)]||0;ac.innerHTML="";
if(v.out){var p=document.createElement("p");p.className="s-out-text";p.textContent=v.outLabel;ac.appendChild(p)}
else if(v.ask){var aa=document.createElement("a");aa.className="s-btn s-btn-wa s-btn-block";aa.href=v.ask;aa.target="_blank";aa.rel="noreferrer";aa.textContent=v.askLabel;ac.appendChild(aa)}
else if(n>0){ac.innerHTML='<div class="s-qty s-pv-qty"><button data-act="pv-dec" aria-label="One less">\\u2212</button><span></span><button data-act="pv-inc" aria-label="One more">+</button></div>';ac.querySelector("span").textContent=n}
else{var bt=document.createElement("button");bt.className="s-btn s-btn-block";bt.dataset.act="pv-add";bt.textContent=v.add;ac.appendChild(bt)}
w.hidden=false;if(seen[0]!==i){seen=[i].concat(seen.filter(function(x){return x!==i})).slice(0,8);try{localStorage.setItem(SK,JSON.stringify(seen))}catch(e){}renderSeen()}}
function bump(k,d){var n=Math.min(99,Math.max(0,(cart[k]||0)+d));if(n)cart[k]=n;else delete cart[k];render()}
document.addEventListener("click",function(e){var b=e.target.closest("[data-act]");if(!b)return;var a=b.dataset.act,card=b.closest(".s-card[data-i]"),i=card?+card.dataset.i:-1,R=root();
if(a==="add"||a==="inc")bump(i+":"+opt(i),1);else if(a==="dec")bump(i+":"+opt(i),-1);
else if(a==="opt"){choice[i]=+b.dataset.o;render()}
else if(a==="cat"){F.cat=b.dataset.cat;$$('[data-act="cat"]',R).forEach(function(x){x.classList.toggle("on",x===b)});filt(R)}
else if(a==="view-seen"){openView(+b.dataset.i)}
else if(a==="lang"){lang=lang==="alt"?"base":"alt";render();filt(root())}
else if(a==="view"){openView(i)}
else if(a==="close-pv"){$("[data-pv]",R).hidden=true;pv=-1}
else if(a==="pv-opt"){choice[pv]=+b.dataset.o;openView(pv);render()}
else if(a==="pv-add"||a==="pv-inc"){bump(pv+":"+opt(pv),1);openView(pv)}
else if(a==="pv-dec"){bump(pv+":"+opt(pv),-1);openView(pv)}
else if(a==="open-cart"){$("[data-cart]",R).hidden=false;$("[data-placed]",R).hidden=true;render()}
else if(a==="close-cart"){$("[data-cart]",R).hidden=true;render()}});
$$("[data-form]").forEach(function(form){form.addEventListener("submit",function(e){e.preventDefault();var R=root(),f=new FormData(form),c={name:f.get("name"),phone:f.get("phone"),address:f.get("address"),note:f.get("note")||""},l=lines(),btn=$("[data-submit]",R),er=$("[data-errors]",R);
btn.disabled=true;er.hidden=true;
function done(t,id,track){var tl=$("[data-track-link]",R);if(tl){tl.hidden=!track;if(track)tl.href=track}$("[data-placed-text]",R).textContent=(id?"Order #"+sid(id)+" is saved. ":"")+"Tap below to send it to "+C.name+" on WhatsApp so they can confirm.";$("[data-placed-link]",R).href=wa(t);$("[data-placed]",R).hidden=false;cart={};form.reset();btn.disabled=false;render()}
fetch(C.api,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({customer:c,lines:l.map(function(x){return{index:x.index,qty:x.qty,option:x.option}})})})
.then(function(r){return r.json().then(function(d){return{ok:r.ok,d:d}})}).then(function(r){if(!r.ok||!r.d.order){btn.disabled=false;er.hidden=false;er.innerHTML="";(r.d.errors||[r.d.error||"Couldn't place the order."]).forEach(function(m){var p=document.createElement("p");p.textContent=m;er.appendChild(p)});return}
var o=r.d.order;done(text(o.lines,o.customer,o.id,r.d.link),o.id,r.d.link)})
.catch(function(){done(text(l,c))})})});
function openTick(){if(!C.hours)return;$$("[data-open]").forEach(function(el){var r=el.closest(".site"),w=(r&&C.openWords[r.dataset.lang])||C.openWords.base,st=sgOpenStatus(C.hours,Date.now(),w);el.hidden=!st;if(st){el.textContent=st.text;el.classList.toggle("is-open",st.open)}})}
try{openTick();setInterval(openTick,60000)}catch(e){}
document.addEventListener("input",function(e){if(e.target.matches&&e.target.matches("[data-search]")){F.q=e.target.value.trim().toLowerCase();$$("[data-search]").forEach(function(x){if(x!==e.target)x.value=e.target.value});filt(root())}});
renderSeen();
render()})();`;
