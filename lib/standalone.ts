// Builds a customer's website as one self-contained HTML page for separate hosting
// (Cloudflare Pages). Same markup classes and CSS as SiteView, so it looks identical.
// When the site has a second language, the page holds both versions and a small script
// switches between them; one cart is shared across both.
import { formatPrice } from "./catalogue";
import { categoriesOf, localText, type LocalText } from "./localize";
import type { Media, Site } from "./schema";
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

const initials = (name: string) =>
  name.split(/\s+/).slice(0, 2).map((w) => w[0] ?? "").join("").toUpperCase();

function media(m: Media, cls = "", eager = false) {
  const c = cls ? ` class="${cls}"` : "";
  return m.kind === "video"
    ? `<video${c} src="${esc(m.url)}" autoplay muted loop playsinline preload="metadata" aria-label="${esc(m.alt)}"></video>`
    : `<img${c} src="${esc(m.url)}" alt="${esc(m.alt)}" loading="${eager ? "eager" : "lazy"}">`;
}

// One full copy of the site's markup in one language.
function body(site: Site, L: LocalText, appOrigin: string, lang: "base" | "alt") {
  const u = L.ui;
  const dynamic = site.siteType === "dynamic";
  const wa = site.whatsapp;
  const heroType = !site.hero;
  const heroFull = !heroType && site.theme.heroStyle === "full";
  const anyImages = site.items.some((i) => i.image);
  const cols = Math.min(4, Math.max(2, site.items.length));
  const aboutImage = site.gallery.find((m) => m.kind === "image");
  const phone = wa.startsWith("91") && wa.length === 12 ? `+91 ${wa.slice(2, 7)} ${wa.slice(7)}` : `+${wa}`;
  const mapsQuery = encodeURIComponent(`${site.businessName} ${site.address ?? site.area ?? ""}`);
  const categories = categoriesOf(site.items);
  const langButton = site.translation
    ? `<button class="s-lang" data-act="lang" aria-label="Change language">${esc(lang === "alt" ? "English" : site.translation.label)}</button>`
    : "";

  const cards = L.items
    .map((it, i) => {
      const out = it.inStock === false;
      const img = anyImages
        ? `<div class="s-card-media">${
            it.image
              ? media(it.image) + (it.image.generated ? `<span class="s-ai-tag">${esc(it.image.credit ?? "Illustration")}</span>` : "")
              : `<div class="s-card-mono">${esc(initials(it.name || "?"))}</div>`
          }${out ? `<span class="s-out-tag">${esc(u.outOfStock)}</span>` : ""}</div>`
        : `<span class="s-card-num">${String(i + 1).padStart(2, "0")}</span>`;
      const opts = it.options?.length
        ? `<div class="s-opts" role="radiogroup" aria-label="${esc(it.optionName ?? "Options")}">${it.options
            .map((o, j) => `<button role="radio" data-act="opt" data-o="${j}" aria-checked="${j === 0}" class="${j === 0 ? "on" : ""}">${esc(o)}</button>`)
            .join("")}</div>`
        : "";
      const action = out
        ? anyImages
          ? ""
          : `<span class="s-out-text">${esc(u.outOfStock)}</span>`
        : `<button class="s-add" data-act="add" aria-label="Add ${esc(it.name)}">${esc(dynamic ? u.addToCart : u.add)}</button><div class="s-qty" hidden><button data-act="dec" aria-label="One less ${esc(it.name)}">−</button><span data-qty>0</span><button data-act="inc" aria-label="One more ${esc(it.name)}">+</button></div>`;
      return `<article class="s-card${out ? " is-out" : ""}" data-i="${i}"${site.items[i].category ? ` data-cat="${esc(site.items[i].category!)}"` : ""}>${img}<div class="s-card-body"><h3>${esc(it.name)}</h3>${
        it.description ? `<p class="s-card-desc">${esc(it.description)}</p>` : ""
      }${opts}<div class="s-card-foot"><span class="s-price">${esc(formatPrice(it.price))}${it.unit ? `<small> ${esc(it.unit)}</small>` : ""}</span>${action}</div></div></article>`;
    })
    .join("");

  const chips =
    categories.length > 1
      ? `<div class="s-chips" role="group" aria-label="Categories"><button class="on" data-act="cat" data-cat="">${esc(u.all)}</button>${categories
          .map((c) => `<button data-act="cat" data-cat="${esc(c)}">${esc(L.items.find((x) => x.category === c)?.categoryLabel ?? c)}</button>`)
          .join("")}</div>`
      : "";

  return `<div class="site theme-${site.theme.id}" data-lang="${lang}" style="${esc(Object.entries(themeVars(site.theme.id, site.theme.accent)).map(([k, v]) => `${k}:${v}`).join(";"))}"${lang === "alt" ? " hidden" : ""}>
<header class="s-header"><div class="s-wrap s-header-row"><a href="#top" class="s-brand">${esc(L.businessName)}</a>
<nav class="s-nav" aria-label="Sections"><a href="#products">${esc(dynamic ? u.shop : u.products)}</a>${L.about ? `<a href="#about">${esc(u.about)}</a>` : ""}${site.gallery.length ? `<a href="#gallery">${esc(u.gallery)}</a>` : ""}<a href="#contact">${esc(u.contact)}</a></nav>
${langButton}${dynamic ? `<button class="s-btn s-btn-sm" data-act="open-cart">${esc(u.cartShort)}<span data-count></span></button>` : `<a class="s-btn s-btn-sm" href="https://wa.me/${wa}" target="_blank" rel="noreferrer">WhatsApp</a>`}</div></header>
<section id="top" class="s-hero ${heroType ? "s-hero-type" : heroFull ? "s-hero-full" : "s-hero-split"}">${heroFull && site.hero ? media(site.hero, "s-hero-bg", true) : ""}
<div class="s-wrap s-hero-inner"><div class="s-hero-copy">${L.category ? `<p class="s-eyebrow">${esc(L.area ? `${L.category} · ${L.area}` : L.category)}</p>` : ""}<h1>${esc(L.headline || L.businessName)}</h1><p class="s-lead">${esc(L.subheadline)}</p>
<div class="s-hero-cta"><a class="s-btn" href="#products">${esc(dynamic ? u.shopNow : u.seeProducts)}</a><a class="s-btn s-btn-ghost" href="https://wa.me/${wa}" target="_blank" rel="noreferrer">${esc(u.chat)}</a></div></div>
${!heroFull && site.hero ? `<div class="s-hero-media">${media(site.hero, "", true)}</div>` : ""}</div></section>
${L.highlights.length ? `<section class="s-highlights"><div class="s-wrap s-highlights-row">${L.highlights.map((h) => `<p>${esc(h)}</p>`).join("")}</div></section>` : ""}
<section id="products" class="s-section"><div class="s-wrap"><div class="s-section-head"><h2>${esc(dynamic ? u.shop : u.products)}</h2><p>${esc(dynamic ? u.cartHint : u.pickHint)}</p></div>${chips}
<div class="s-grid${anyImages ? "" : " s-grid-text"}" style="--cols:${cols}">${cards}</div></div></section>
${L.about ? `<section id="about" class="s-section s-about"><div class="s-wrap${aboutImage ? " s-about-grid" : ""}"><div><h2>${esc(u.about)} ${esc(L.businessName)}</h2><p class="s-about-text">${esc(L.about)}</p></div>${aboutImage ? media(aboutImage, "s-about-img") : ""}</div></section>` : ""}
${site.gallery.length ? `<section id="gallery" class="s-section"><div class="s-wrap"><div class="s-section-head"><h2>${esc(u.gallery)}</h2></div><div class="s-gallery">${site.gallery.map((m) => (m.kind === "video" ? `<video src="${esc(m.url)}" controls playsinline preload="metadata" aria-label="${esc(m.alt)}"></video>` : media(m))).join("")}</div></div></section>` : ""}
<section id="contact" class="s-section s-contact"><div class="s-wrap s-contact-grid"><div><h2>${esc(u.visit)}</h2>${
    site.address || L.area || L.hours
      ? `<ul class="s-contact-list">${site.address ? `<li><span>${esc(u.address)}</span>${esc(site.address)}</li>` : L.area ? `<li><span>${esc(u.area)}</span>${esc(L.area)}</li>` : ""}${L.hours ? `<li><span>${esc(u.hours)}</span>${esc(L.hours)}</li>` : ""}</ul>`
      : `<p class="s-muted">${esc(u.messageUs)}</p>`
  }${site.address || site.area ? `<a class="s-link" href="https://www.google.com/maps/search/?api=1&amp;query=${mapsQuery}" target="_blank" rel="noreferrer">${esc(u.maps)} ↗</a>` : ""}</div>
<div class="s-contact-card"><p class="s-muted">WhatsApp</p><p class="s-phone">${esc(phone)}</p><a class="s-btn" href="https://wa.me/${wa}" target="_blank" rel="noreferrer">${esc(u.messageOnWa)}</a></div></div></section>
<footer class="s-footer"><div class="s-wrap s-footer-row"><span>© ${esc(L.businessName)}</span><a href="${esc(appOrigin)}">Made with SiteGenie</a></div></footer>
<div class="s-orderbar" data-orderbar hidden>${dynamic ? `<button class="s-btn" data-act="open-cart" data-bar-label></button>` : `<a class="s-btn s-btn-wa" target="_blank" rel="noreferrer" data-bar-label></a>`}</div>
${dynamic ? cartHtml(u) : ""}
</div>`;
}

const cartHtml = (u: LocalText["ui"]) => `<div class="s-drawer-wrap" data-cart hidden role="dialog" aria-modal="true" aria-label="${esc(u.cart)}"><button class="s-drawer-scrim" data-act="close-cart" aria-label="Close cart"></button><div class="s-drawer">
<div class="s-drawer-head"><h2 data-cart-title>${esc(u.cart)}</h2><button class="s-close" data-act="close-cart" aria-label="Close">×</button></div>
<div data-placed hidden class="s-placed"><p data-placed-text></p><a class="s-btn s-btn-wa" data-placed-link target="_blank" rel="noreferrer">${esc(u.orderOnWa)}</a><a class="s-btn s-btn-ghost" data-track-link target="_blank" rel="noreferrer" hidden>View or change my order</a></div>
<p class="s-muted" data-empty>${esc(u.empty)}</p>
<form class="s-checkout" data-form><ul class="s-lines" data-lines></ul><p class="s-total"><span>${esc(u.total)}</span><strong data-total></strong></p>
<label>${esc(u.yourName)}<input name="name" autocomplete="name" required></label>
<label>${esc(u.phone)}<input name="phone" inputmode="tel" autocomplete="tel" required></label>
<label>${esc(u.deliveryAddress)}<textarea name="address" autocomplete="street-address" required></textarea></label>
<label>${esc(u.note)}<input name="note"></label>
<div class="s-errors" data-errors hidden></div><button class="s-btn s-btn-block" data-submit data-label="${esc(u.placeOrder)}"></button>
<p class="s-muted s-small">${esc(u.payNote)}</p></form></div></div>`;

export function renderStandalone(site: Site, appOrigin: string): string {
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
  const ogImage = site.hero?.kind === "image" ? site.hero.url : site.items.find((i) => i.image)?.image?.url;

  const config = {
    slug: site.slug,
    name: site.businessName,
    wa: site.whatsapp,
    dynamic: site.siteType === "dynamic",
    api: `${appOrigin}/api/orders/${site.slug}`,
    visit: `${appOrigin}/api/visit/${site.slug}`,
    items: site.items.map((i) => ({ name: i.name, price: i.price, options: i.options ?? [] })),
    ui: { base: { orderOnWa: base.ui.orderOnWa, viewCart: base.ui.viewCart }, alt: alt ? { orderOnWa: alt.ui.orderOnWa, viewCart: alt.ui.viewCart } : null },
  };

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(site.businessName)}</title><meta name="description" content="${esc(site.subheadline)}">
<meta property="og:title" content="${esc(site.businessName)}"><meta property="og:description" content="${esc(site.subheadline)}">${ogImage ? `<meta property="og:image" content="${esc(ogImage)}">` : ""}
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?${fonts.join("&")}&display=swap">
<style>${FONT_VARS}html,body{margin:0}${SITE_CSS}.site [hidden],.site[hidden]{display:none!important}.s-checkout label{display:grid;gap:4px}</style></head>
<body><div class="site-box">
${body(site, base, appOrigin, "base")}
${alt ? body(site, alt, appOrigin, "alt") : ""}
</div>
<script type="application/json" id="sg-config">${JSON.stringify(config).replace(/</g, "\\u003c")}</script>
<script>${SCRIPT}</script>
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
function nm(x){return x.option?x.name+" ("+x.option+")":x.name}
function text(l,c,id,link){var t=["Hi "+C.name+", I'd like to order:"];l.forEach(function(x){t.push("\\u2022 "+nm(x)+" \\u00D7 "+x.qty+(x.price!=null?" \\u2014 "+rs(x.price*x.qty):""))});t.push("Total: "+rs(total(l)));if(c){t.push("","Name: "+c.name,"Phone: "+c.phone,"Deliver to: "+c.address);if(c.note)t.push("Note: "+c.note)}if(id)t.push("Order ID: "+id);if(link)t.push("","See or change this order: "+link);return t.join("\\n")}
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
var open=C.dynamic&&cartEl&&!cartEl.hidden;bar.hidden=count===0||open;
if(C.dynamic){lab.textContent=U.viewCart+" \\u00B7 "+count+" \\u00B7 "+rs(total(l));renderCart(l,R)}
else{lab.textContent=U.orderOnWa+" \\u00B7 "+rs(total(l));lab.href=wa(text(l))}}
function renderCart(l,R){var ul=$("[data-lines]",R);if(!ul)return;ul.innerHTML="";
l.forEach(function(x){var li=document.createElement("li"),n=document.createElement("span");n.textContent=nm(x);
var qd=document.createElement("div");qd.className="s-qty";qd.innerHTML='<button type="button">\\u2212</button><span></span><button type="button">+</button>';qd.querySelector("span").textContent=x.qty;
var b=qd.querySelectorAll("button");b[0].onclick=function(){bump(x.key,-1)};b[1].onclick=function(){bump(x.key,1)};
var pr=document.createElement("span");pr.className="s-line-price";pr.textContent=rs((x.price||0)*x.qty);li.append(n,qd,pr);ul.appendChild(li)});
$("[data-total]",R).textContent=rs(total(l));var sb=$("[data-submit]",R);sb.textContent=sb.dataset.label+" \\u00B7 "+rs(total(l));
var placed=!$("[data-placed]",R).hidden;$("[data-form]",R).hidden=placed||l.length===0;$("[data-empty]",R).hidden=placed||l.length>0}
function bump(k,d){var n=Math.min(99,Math.max(0,(cart[k]||0)+d));if(n)cart[k]=n;else delete cart[k];render()}
document.addEventListener("click",function(e){var b=e.target.closest("[data-act]");if(!b)return;var a=b.dataset.act,card=b.closest(".s-card[data-i]"),i=card?+card.dataset.i:-1,R=root();
if(a==="add"||a==="inc")bump(i+":"+opt(i),1);else if(a==="dec")bump(i+":"+opt(i),-1);
else if(a==="opt"){choice[i]=+b.dataset.o;render()}
else if(a==="cat"){var c=b.dataset.cat;$$('[data-act="cat"]',R).forEach(function(x){x.classList.toggle("on",x===b)});$$(".s-card[data-i]",R).forEach(function(cd){cd.hidden=!!c&&cd.dataset.cat!==c})}
else if(a==="lang"){lang=lang==="alt"?"base":"alt";render()}
else if(a==="open-cart"){$("[data-cart]",R).hidden=false;$("[data-placed]",R).hidden=true;render()}
else if(a==="close-cart"){$("[data-cart]",R).hidden=true;render()}});
$$("[data-form]").forEach(function(form){form.addEventListener("submit",function(e){e.preventDefault();var R=root(),f=new FormData(form),c={name:f.get("name"),phone:f.get("phone"),address:f.get("address"),note:f.get("note")||""},l=lines(),btn=$("[data-submit]",R),er=$("[data-errors]",R);
btn.disabled=true;er.hidden=true;
function done(t,id,track){var tl=$("[data-track-link]",R);if(tl){tl.hidden=!track;if(track)tl.href=track}$("[data-placed-text]",R).textContent=(id?"Order "+id+" is saved. ":"")+"Tap below to send it to "+C.name+" on WhatsApp so they can confirm.";$("[data-placed-link]",R).href=wa(t);$("[data-placed]",R).hidden=false;cart={};form.reset();btn.disabled=false;render()}
fetch(C.api,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({customer:c,lines:l.map(function(x){return{index:x.index,qty:x.qty,option:x.option}})})})
.then(function(r){return r.json().then(function(d){return{ok:r.ok,d:d}})}).then(function(r){if(!r.ok||!r.d.order){btn.disabled=false;er.hidden=false;er.innerHTML="";(r.d.errors||[r.d.error||"Couldn't place the order."]).forEach(function(m){var p=document.createElement("p");p.textContent=m;er.appendChild(p)});return}
var o=r.d.order;done(text(o.lines,o.customer,o.id,r.d.link),o.id,r.d.link)})
.catch(function(){done(text(l,c))})})});
render()})();`;
