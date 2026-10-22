// Builds a customer's website as one self-contained HTML page for separate hosting
// (Cloudflare Pages). Same markup classes and CSS as SiteView, so it looks identical;
// a small script handles quantities, the WhatsApp order and the cart.
import { formatPrice } from "./catalogue";
import type { Media, Site } from "./schema";
import { SITE_CSS } from "./siteCss";
import { THEMES, themeVars } from "./themes";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const FONTS: Record<string, string> = {
  boutique: "family=Cormorant+Garamond:wght@500;600;700&family=Jost:wght@400;500;600;700",
  kitchen: "family=Fraunces:wght@600;700&family=Nunito+Sans:wght@400;600;700;800",
  fresh: "family=Baloo+2:wght@500;700;800&family=Hind:wght@400;500;600",
  studio: "family=Sora:wght@600;700&family=Manrope:wght@400;500;700;800",
  craft: "family=Playfair+Display:wght@600;700&family=Mulish:wght@400;600;700;800",
  bazaar: "family=Archivo:wght@400;600;800",
};
const FONT_VARS = `:root{--f-cormorant:"Cormorant Garamond";--f-jost:"Jost";--f-fraunces:"Fraunces";--f-nunito:"Nunito Sans";--f-baloo:"Baloo 2";--f-hind:"Hind";--f-sora:"Sora";--f-manrope:"Manrope";--f-playfair:"Playfair Display";--f-mulish:"Mulish";--f-archivo:"Archivo";--f-kannada:"Noto Sans Kannada";--f-devanagari:"Noto Sans Devanagari"}`;

const initials = (name: string) =>
  name.split(/\s+/).slice(0, 2).map((w) => w[0] ?? "").join("").toUpperCase();

function media(m: Media, cls = "", eager = false) {
  const c = cls ? ` class="${cls}"` : "";
  return m.kind === "video"
    ? `<video${c} src="${esc(m.url)}" autoplay muted loop playsinline preload="metadata" aria-label="${esc(m.alt)}"></video>`
    : `<img${c} src="${esc(m.url)}" alt="${esc(m.alt)}" loading="${eager ? "eager" : "lazy"}">`;
}

export function renderStandalone(site: Site, appOrigin: string): string {
  const dynamic = site.siteType === "dynamic";
  const wa = site.whatsapp;
  const name = site.businessName;
  const vars = Object.entries(themeVars(site.theme.id, site.theme.accent)).map(([k, v]) => `${k}:${v}`).join(";");
  const heroType = !site.hero;
  const heroFull = !heroType && site.theme.heroStyle === "full";
  const anyImages = site.items.some((i) => i.image);
  const cols = Math.min(4, Math.max(2, site.items.length));
  const highlights = site.highlights.map((h) => h.trim()).filter(Boolean);
  const aboutImage = site.gallery.find((m) => m.kind === "image");
  const phone = wa.startsWith("91") && wa.length === 12 ? `+91 ${wa.slice(2, 7)} ${wa.slice(7)}` : `+${wa}`;
  const allText = [name, site.headline, site.subheadline, site.about ?? "", ...site.items.map((i) => i.name + i.description)].join(" ");
  const fonts = [FONTS[site.theme.id] ?? FONTS.bazaar];
  if (/[\u0C80-\u0CFF]/.test(allText)) fonts.push("family=Noto+Sans+Kannada:wght@400;600;700");
  if (/[\u0900-\u097F]/.test(allText)) fonts.push("family=Noto+Sans+Devanagari:wght@400;600;700");
  const ogImage = site.hero?.kind === "image" ? site.hero.url : site.items.find((i) => i.image)?.image?.url;
  const mapsQuery = encodeURIComponent(`${name} ${site.address ?? site.area ?? ""}`);

  const cards = site.items
    .map((it, i) => {
      const img = anyImages
        ? `<div class="s-card-media">${
            it.image
              ? media(it.image) + (it.image.generated ? `<span class="s-ai-tag">${esc(it.image.credit ?? "Illustration")}</span>` : "")
              : `<div class="s-card-mono">${esc(initials(it.name || "?"))}</div>`
          }</div>`
        : `<span class="s-card-num">${String(i + 1).padStart(2, "0")}</span>`;
      return `<article class="s-card" data-i="${i}">${img}<div class="s-card-body"><h3>${esc(it.name)}</h3>${
        it.description ? `<p class="s-card-desc">${esc(it.description)}</p>` : ""
      }<div class="s-card-foot"><span class="s-price">${esc(formatPrice(it.price))}${it.unit ? `<small> ${esc(it.unit)}</small>` : ""}</span><button class="s-add" data-act="add" aria-label="Add ${esc(it.name)}">${dynamic ? "Add to cart" : "Add"}</button><div class="s-qty" hidden><button data-act="dec" aria-label="One less ${esc(it.name)}">−</button><span data-qty>0</span><button data-act="inc" aria-label="One more ${esc(it.name)}">+</button></div></div></div></article>`;
    })
    .join("");

  const config = {
    slug: site.slug,
    name,
    wa,
    dynamic,
    api: `${appOrigin}/api/orders/${site.slug}`,
    items: site.items.map((i) => ({ name: i.name, price: i.price })),
  };

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(name)}</title><meta name="description" content="${esc(site.subheadline)}">
<meta property="og:title" content="${esc(name)}"><meta property="og:description" content="${esc(site.subheadline)}">${ogImage ? `<meta property="og:image" content="${esc(ogImage)}">` : ""}
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?${fonts.join("&")}&display=swap">
<style>${FONT_VARS}html,body{margin:0}${SITE_CSS}.site [hidden]{display:none!important}</style></head>
<body><div class="site-box"><div class="site theme-${site.theme.id}" style="${esc(vars)}">
<header class="s-header"><div class="s-wrap s-header-row"><a href="#top" class="s-brand">${esc(name)}</a>
<nav class="s-nav" aria-label="Sections"><a href="#products">${dynamic ? "Shop" : "Products"}</a>${site.about ? `<a href="#about">About</a>` : ""}${site.gallery.length ? `<a href="#gallery">Gallery</a>` : ""}<a href="#contact">Contact</a></nav>
${dynamic ? `<button class="s-btn s-btn-sm" data-act="open-cart">Cart<span data-count></span></button>` : `<a class="s-btn s-btn-sm" href="https://wa.me/${wa}" target="_blank" rel="noreferrer">WhatsApp</a>`}</div></header>
<section id="top" class="s-hero ${heroType ? "s-hero-type" : heroFull ? "s-hero-full" : "s-hero-split"}">${heroFull && site.hero ? media(site.hero, "s-hero-bg", true) : ""}
<div class="s-wrap s-hero-inner"><div class="s-hero-copy">${site.category ? `<p class="s-eyebrow">${esc(site.area ? `${site.category} · ${site.area}` : site.category)}</p>` : ""}<h1>${esc(site.headline || name)}</h1><p class="s-lead">${esc(site.subheadline)}</p>
<div class="s-hero-cta"><a class="s-btn" href="#products">${dynamic ? "Shop now" : "See products"}</a><a class="s-btn s-btn-ghost" href="https://wa.me/${wa}" target="_blank" rel="noreferrer">Chat on WhatsApp</a></div></div>
${!heroFull && site.hero ? `<div class="s-hero-media">${media(site.hero, "", true)}</div>` : ""}</div></section>
${highlights.length ? `<section class="s-highlights"><div class="s-wrap s-highlights-row">${highlights.map((h) => `<p>${esc(h)}</p>`).join("")}</div></section>` : ""}
<section id="products" class="s-section"><div class="s-wrap"><div class="s-section-head"><h2>${dynamic ? "Shop" : "Our products"}</h2><p>${dynamic ? "Add items to your cart and check out in a minute." : "Pick what you like and send your order on WhatsApp."}</p></div>
<div class="s-grid${anyImages ? "" : " s-grid-text"}" style="--cols:${cols}">${cards}</div></div></section>
${site.about ? `<section id="about" class="s-section s-about"><div class="s-wrap${aboutImage ? " s-about-grid" : ""}"><div><h2>About ${esc(name)}</h2><p class="s-about-text">${esc(site.about)}</p></div>${aboutImage ? media(aboutImage, "s-about-img") : ""}</div></section>` : ""}
${site.gallery.length ? `<section id="gallery" class="s-section"><div class="s-wrap"><div class="s-section-head"><h2>Gallery</h2></div><div class="s-gallery">${site.gallery.map((m) => (m.kind === "video" ? `<video src="${esc(m.url)}" controls playsinline preload="metadata" aria-label="${esc(m.alt)}"></video>` : media(m))).join("")}</div></div></section>` : ""}
<section id="contact" class="s-section s-contact"><div class="s-wrap s-contact-grid"><div><h2>Visit or message us</h2>${
    site.address || site.area || site.hours
      ? `<ul class="s-contact-list">${site.address ? `<li><span>Address</span>${esc(site.address)}</li>` : site.area ? `<li><span>Area</span>${esc(site.area)}</li>` : ""}${site.hours ? `<li><span>Hours</span>${esc(site.hours)}</li>` : ""}</ul>`
      : `<p class="s-muted">Message us on WhatsApp for orders and questions.</p>`
  }${site.address || site.area ? `<a class="s-link" href="https://www.google.com/maps/search/?api=1&amp;query=${mapsQuery}" target="_blank" rel="noreferrer">Open in Google Maps ↗</a>` : ""}</div>
<div class="s-contact-card"><p class="s-muted">WhatsApp</p><p class="s-phone">${esc(phone)}</p><a class="s-btn" href="https://wa.me/${wa}" target="_blank" rel="noreferrer">Message on WhatsApp</a></div></div></section>
<footer class="s-footer"><div class="s-wrap s-footer-row"><span>© ${esc(name)}</span><a href="${esc(appOrigin)}">Made with SiteGenie</a></div></footer>
<div class="s-orderbar" data-orderbar hidden>${dynamic ? `<button class="s-btn" data-act="open-cart" data-bar-label></button>` : `<a class="s-btn s-btn-wa" target="_blank" rel="noreferrer" data-bar-label></a>`}</div>
${dynamic ? CART_HTML : ""}
</div></div>
<script type="application/json" id="sg-config">${JSON.stringify(config).replace(/</g, "\\u003c")}</script>
<script>${SCRIPT}</script>
</body></html>`;
}

const CART_HTML = `<div class="s-drawer-wrap" data-cart hidden role="dialog" aria-modal="true" aria-label="Your cart"><button class="s-drawer-scrim" data-act="close-cart" aria-label="Close cart"></button><div class="s-drawer">
<div class="s-drawer-head"><h2 data-cart-title>Your cart</h2><button class="s-close" data-act="close-cart" aria-label="Close">×</button></div>
<div data-placed hidden class="s-placed"><p data-placed-text></p><a class="s-btn s-btn-wa" data-placed-link target="_blank" rel="noreferrer">Send order on WhatsApp</a></div>
<p class="s-muted" data-empty>Your cart is empty.</p>
<form class="s-checkout" data-form><ul class="s-lines" data-lines></ul><p class="s-total"><span>Total</span><strong data-total></strong></p>
<label for="c-name">Your name</label><input id="c-name" name="name" autocomplete="name" required>
<label for="c-phone">Phone</label><input id="c-phone" name="phone" inputmode="tel" autocomplete="tel" required>
<label for="c-address">Delivery address</label><textarea id="c-address" name="address" autocomplete="street-address" required></textarea>
<label for="c-note">Note (optional)</label><input id="c-note" name="note">
<div class="s-errors" data-errors hidden></div><button class="s-btn s-btn-block" data-submit></button>
<p class="s-muted s-small">Pay the shop directly when they confirm your order.</p></form></div></div>`;

// Plain browser script for the standalone page (no framework).
const SCRIPT = `(function(){
var C=JSON.parse(document.getElementById("sg-config").textContent);
var key="sg-cart-"+C.slug,q=C.items.map(function(){return 0});
try{var s=JSON.parse(localStorage.getItem(key)||"null");if(s&&s.length===q.length)q=s}catch(e){}
function rs(n){return n==null?"\\u2014":"\\u20B9"+n.toLocaleString("en-IN")}
function lines(){var o=[];C.items.forEach(function(it,i){if(q[i]>0)o.push({index:i,name:it.name,price:it.price,qty:q[i]})});return o}
function total(l){return l.reduce(function(s,x){return s+(x.price||0)*x.qty},0)}
function text(l,c,id){var t=["Hi "+C.name+", I'd like to order:"];l.forEach(function(x){t.push("\\u2022 "+x.name+" \\u00D7 "+x.qty+(x.price!=null?" \\u2014 "+rs(x.price*x.qty):""))});t.push("Total: "+rs(total(l)));if(c){t.push("","Name: "+c.name,"Phone: "+c.phone,"Deliver to: "+c.address);if(c.note)t.push("Note: "+c.note)}if(id)t.push("Order ID: "+id);return t.join("\\n")}
function wa(t){return "https://wa.me/"+C.wa+"?text="+encodeURIComponent(t)}
var $=function(s,r){return (r||document).querySelector(s)},$$=function(s){return Array.prototype.slice.call(document.querySelectorAll(s))};
function render(){try{localStorage.setItem(key,JSON.stringify(q))}catch(e){}
$$(".s-card[data-i]").forEach(function(card){var i=+card.dataset.i,n=q[i];$('[data-act="add"]',card).hidden=n>0;$(".s-qty",card).hidden=n===0;$("[data-qty]",card).textContent=n});
var l=lines(),count=l.reduce(function(s,x){return s+x.qty},0),bar=$("[data-orderbar]"),lab=$("[data-bar-label]");
$$("[data-count]").forEach(function(e){e.textContent=count?" \\u00B7 "+count:""});
var cartOpen=C.dynamic&&!$("[data-cart]").hidden;bar.hidden=count===0||cartOpen;
if(C.dynamic){lab.textContent="View cart \\u00B7 "+count+" item"+(count>1?"s":"")+" \\u00B7 "+rs(total(l));renderCart(l)}
else{lab.textContent="Order on WhatsApp \\u00B7 "+rs(total(l));lab.href=wa(text(l))}}
function renderCart(l){var ul=$("[data-lines]");if(!ul)return;ul.innerHTML="";
l.forEach(function(x){var li=document.createElement("li");var nm=document.createElement("span");nm.textContent=x.name;
var qd=document.createElement("div");qd.className="s-qty";qd.innerHTML='<button type="button" data-cart-dec>\\u2212</button><span></span><button type="button" data-cart-inc>+</button>';qd.querySelector("span").textContent=x.qty;
qd.querySelector("[data-cart-dec]").onclick=function(){q[x.index]=Math.max(0,q[x.index]-1);render()};qd.querySelector("[data-cart-inc]").onclick=function(){q[x.index]=Math.min(99,q[x.index]+1);render()};
var pr=document.createElement("span");pr.className="s-line-price";pr.textContent=rs((x.price||0)*x.qty);li.append(nm,qd,pr);ul.appendChild(li)});
$("[data-total]").textContent=rs(total(l));$("[data-submit]").textContent="Place order \\u00B7 "+rs(total(l));
var placed=!$("[data-placed]").hidden;$("[data-form]").hidden=placed||l.length===0;$("[data-empty]").hidden=placed||l.length>0}
document.addEventListener("click",function(e){var b=e.target.closest("[data-act]");if(!b)return;var a=b.dataset.act,card=b.closest(".s-card[data-i]"),i=card?+card.dataset.i:-1;
if(a==="add"||a==="inc")q[i]=Math.min(99,q[i]+1);else if(a==="dec")q[i]=Math.max(0,q[i]-1);
else if(a==="open-cart"){$("[data-cart]").hidden=false;$("[data-placed]").hidden=true;$("[data-cart-title]").textContent="Your cart"}
else if(a==="close-cart")$("[data-cart]").hidden=true;render()});
var form=$("[data-form]");if(form)form.addEventListener("submit",function(e){e.preventDefault();var f=new FormData(form),c={name:f.get("name"),phone:f.get("phone"),address:f.get("address"),note:f.get("note")||""},l=lines(),btn=$("[data-submit]"),er=$("[data-errors]");
btn.disabled=true;btn.textContent="Placing order\\u2026";er.hidden=true;
function done(t,id){$("[data-placed-text]").textContent=(id?"Order "+id+" is saved. ":"")+"Tap below to send it to "+C.name+" on WhatsApp so they can confirm.";$("[data-placed-link]").href=wa(t);$("[data-placed]").hidden=false;$("[data-cart-title]").textContent="Almost done";q=q.map(function(){return 0});form.reset();btn.disabled=false;render()}
fetch(C.api,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({customer:c,lines:l.map(function(x){return{index:x.index,qty:x.qty}})})})
.then(function(r){return r.json().then(function(d){return{ok:r.ok,d:d}})}).then(function(r){if(!r.ok||!r.d.order){btn.disabled=false;er.hidden=false;er.innerHTML="";(r.d.errors||[r.d.error||"Couldn't place the order."]).forEach(function(m){var p=document.createElement("p");p.textContent=m;er.appendChild(p)});render();return}
var o=r.d.order;done(text(o.lines,o.customer,o.id),o.id)})
.catch(function(){done(text(l,c))})});
render()})();`;
