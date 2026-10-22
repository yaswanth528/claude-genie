// Styles for generated business websites. Kept as a string so the same CSS ships inside each
// standalone customer website (lib/standalone.ts) and is injected by SiteView in the app.
// Every colour and font comes from the theme variables set on .site (lib/themes.ts).
export const SITE_CSS = `
/* Generated business websites. Every colour and font comes from the theme variables
   set on .site (lib/themes.ts), so one stylesheet serves all six themes. */

/* Layout responds to the site's own width (container queries), so the phone preview on
   the review screen behaves exactly like a real phone. */
.site-box { container: site / inline-size; }
.site {
  --s-gap: clamp(16px, 4cqi, 28px);
  background: var(--s-bg);
  color: var(--s-ink);
  font-family: var(--s-body);
  font-size: 16px;
  line-height: 1.6;
  min-height: 100vh;
}
.site * { box-sizing: border-box; }
.site h1, .site h2, .site h3 {
  font-family: var(--s-display);
  font-weight: var(--s-display-weight);
  letter-spacing: var(--s-tracking);
  text-transform: var(--s-heading-case);
  line-height: 1.08;
  margin: 0;
  text-wrap: balance;
}
.site p { margin: 0; }
.site a { color: inherit; }
.s-wrap { max-width: 1160px; margin: 0 auto; padding-inline: max(16px, env(safe-area-inset-left, 0px)) max(16px, env(safe-area-inset-right, 0px)); }
.s-muted { color: var(--s-muted); }
.s-small { font-size: 0.85rem; }

/* Buttons */
.s-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  min-height: 48px; padding: 12px 24px; border: 0; border-radius: var(--s-radius);
  background: var(--s-accent); color: var(--s-accent-ink);
  font: inherit; font-weight: 700; text-decoration: none; cursor: pointer;
  transition: transform .15s ease, box-shadow .15s ease, opacity .15s;
  box-shadow: 0 6px 18px -8px color-mix(in srgb, var(--s-accent) 70%, transparent);
}
.theme-kitchen .s-btn, .theme-fresh .s-btn { border-radius: 999px; }
.s-btn:hover { transform: translateY(-1px); }
.s-btn:disabled { opacity: .55; cursor: wait; transform: none; }
.s-btn:focus-visible, .site button:focus-visible, .site a:focus-visible, .site input:focus-visible, .site textarea:focus-visible {
  outline: 3px solid color-mix(in srgb, var(--s-accent) 55%, transparent); outline-offset: 2px;
}
/* Beat ".site a { color: inherit }" so link-buttons keep their own text colour. */
.site .s-btn { color: var(--s-accent-ink); }
.site .s-btn-ghost { color: inherit; }
.site .s-btn-wa { color: #fff; }
.s-btn-sm { min-height: 40px; padding: 8px 16px; font-size: .92rem; }
.s-btn-ghost { background: transparent; color: inherit; box-shadow: inset 0 0 0 1.5px currentColor; }
.s-btn-wa { background: #128c4a; color: #fff; box-shadow: 0 8px 20px -8px rgba(18,140,74,.6); }
.s-btn-block { width: 100%; }
.s-link { display: inline-block; margin-top: 14px; font-weight: 600; color: var(--s-accent); text-decoration: none; }

/* Header */
.s-header {
  position: sticky; top: env(safe-area-inset-top, 0px); z-index: 20;
  background: color-mix(in srgb, var(--s-bg) 88%, transparent);
  backdrop-filter: saturate(1.4) blur(10px); -webkit-backdrop-filter: saturate(1.4) blur(10px);
  border-bottom: 1px solid var(--s-line);
}
.s-header-row { display: flex; align-items: center; gap: 20px; min-height: 64px; }
.s-brand {
  font-family: var(--s-display); font-weight: var(--s-display-weight); font-size: 1.35rem;
  text-decoration: none; letter-spacing: var(--s-tracking); text-transform: var(--s-heading-case);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0;
}
.s-nav { display: none; gap: 24px; margin-left: auto; font-weight: 500; }
.s-nav a { text-decoration: none; color: var(--s-muted); }
.s-nav a:hover { color: var(--s-ink); }
.s-header-row > .s-btn { margin-left: auto; flex-shrink: 0; }
@container site (min-width: 820px) {
  .s-nav { display: flex; }
  .s-header-row > .s-btn { margin-left: 8px; }
}

/* Hero */
.s-hero { position: relative; overflow: hidden; }
.s-hero-split { padding-block: clamp(40px, 7cqi, 88px); }
.s-hero-split .s-hero-inner { display: grid; gap: 32px; align-items: center; }
@container site (min-width: 860px) { .s-hero-split .s-hero-inner { grid-template-columns: 1.05fr 0.95fr; gap: 56px; } }
.s-hero-copy { display: grid; gap: 18px; max-width: 620px; }
.s-hero h1 { font-size: clamp(2.1rem, 9cqi, 4.6rem); overflow-wrap: break-word; hyphens: auto; }
.theme-bazaar .s-hero h1 { font-size: clamp(2rem, 8cqi, 4.2rem); }
.s-lead { font-size: clamp(1.05rem, 1.6cqi, 1.25rem); color: var(--s-muted); max-width: 52ch; }
.s-eyebrow { font-size: .8rem; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: var(--s-accent); }
.s-hero-cta { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 6px; }
.s-hero-media { border-radius: calc(var(--s-radius) * 1.5); overflow: hidden; aspect-ratio: 4 / 3.4; background: var(--s-soft); box-shadow: 0 30px 60px -30px rgba(0,0,0,.35); }
.s-hero-media img, .s-hero-media video { width: 100%; height: 100%; object-fit: cover; display: block; }
.s-hero-mono, .s-card-mono {
  width: 100%; height: 100%; display: grid; place-items: center;
  font-family: var(--s-display); font-weight: var(--s-display-weight); color: var(--s-accent);
  background:
    radial-gradient(circle at 30% 20%, color-mix(in srgb, var(--s-accent) 18%, transparent), transparent 60%),
    repeating-linear-gradient(45deg, var(--s-soft) 0 14px, color-mix(in srgb, var(--s-soft) 70%, var(--s-bg)) 14px 28px);
}
.s-hero-mono { font-size: clamp(4rem, 12cqi, 8rem); }

.s-hero-full { min-height: clamp(520px, 82vh, 760px); display: flex; align-items: flex-end; color: #fff; }
.is-preview .s-hero-full { min-height: 560px; }
.s-hero-bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.s-hero-full::after { content: ""; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,.05) 20%, rgba(0,0,0,.72) 100%); }
.s-hero-full .s-hero-inner { position: relative; z-index: 1; padding-block: 56px clamp(48px, 8cqi, 88px); width: 100%; }
.s-hero-full .s-lead { color: rgba(255,255,255,.88); }
.s-hero-full .s-eyebrow { color: #fff; opacity: .9; }
.site .s-hero-full .s-btn-ghost { color: #fff; }

/* No banner photo: a type-led banner with soft colour shapes. */
.s-hero-type { padding-block: clamp(64px, 11cqi, 140px); text-align: center; isolation: isolate; }
.s-hero-type::before {
  content: ""; position: absolute; inset: -20% -10%; z-index: -1;
  background:
    radial-gradient(40% 50% at 15% 30%, color-mix(in srgb, var(--s-accent) 16%, transparent), transparent 70%),
    radial-gradient(35% 45% at 85% 70%, color-mix(in srgb, var(--s-accent) 12%, transparent), transparent 70%),
    var(--s-soft);
}
.s-hero-type .s-hero-copy { margin-inline: auto; justify-items: center; max-width: 820px; }
.s-hero-type h1 { font-size: clamp(2.2rem, 10cqi, 5.6rem); }
.s-hero-type .s-hero-cta { justify-content: center; }

/* Highlights */
.s-highlights { background: var(--s-accent); color: var(--s-accent-ink); }
.s-highlights-row { display: flex; flex-wrap: wrap; gap: 10px 32px; justify-content: center; padding-block: 16px; font-weight: 600; text-align: center; }
.s-highlights-row p::before { content: "✦ "; opacity: .7; }

/* Sections */
.s-section { padding-block: clamp(56px, 8cqi, 104px); }
.s-section-head { display: grid; gap: 8px; margin-bottom: clamp(24px, 4cqi, 40px); max-width: 640px; }
.s-section-head h2, .s-about h2, .s-contact h2 { font-size: clamp(1.9rem, 4cqi, 3rem); }
.s-section-head p { color: var(--s-muted); }

/* Products */
.s-grid { display: grid; gap: var(--s-gap); grid-template-columns: repeat(2, minmax(0, 1fr)); }
@container site (min-width: 760px) { .s-grid { grid-template-columns: repeat(min(var(--cols, 3), 3), minmax(0, 1fr)); } }
@container site (min-width: 1080px) { .s-grid { grid-template-columns: repeat(var(--cols, 4), minmax(0, 1fr)); } }
/* No product photos at all: clean text cards instead of empty picture boxes. */
.s-grid-text { grid-template-columns: minmax(0, 1fr); }
@container site (min-width: 600px) { .s-grid-text { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
.s-grid-text .s-card { padding: 22px 22px 18px; border: 1px solid var(--s-line); background: var(--s-surface); position: relative; }
.theme-boutique .s-grid-text .s-card { border: 0; border-top: 1px solid var(--s-ink); border-radius: 0; background: transparent; padding-inline: 0; }
.s-grid-text .s-card-body { padding: 0; gap: 8px; }
.s-grid-text .s-card h3 { font-family: var(--s-display); font-weight: var(--s-display-weight); font-size: clamp(1.4rem, 3cqi, 1.9rem); text-transform: var(--s-heading-case); letter-spacing: var(--s-tracking); }
.s-grid-text .s-price { font-size: 1.3rem; }
.s-card-num { font-size: .8rem; font-weight: 700; letter-spacing: .14em; color: var(--s-accent); margin-bottom: 10px; display: block; font-variant-numeric: tabular-nums; }
.s-card {
  display: flex; flex-direction: column; min-width: 0;
  background: var(--s-surface); border: 1px solid var(--s-line); border-radius: var(--s-radius); overflow: hidden;
  transition: transform .2s ease, box-shadow .2s ease;
}
.s-card:hover { transform: translateY(-3px); box-shadow: 0 18px 40px -24px rgba(0,0,0,.35); }
.theme-boutique .s-card { border: 0; background: transparent; }
.theme-boutique .s-card:hover { box-shadow: none; }
.s-card-media { position: relative; aspect-ratio: 1; background: var(--s-soft); overflow: hidden; }
.theme-boutique .s-card-media { aspect-ratio: 3 / 4; }
.s-card-media img, .s-card-media video { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform .5s ease; }
.s-card:hover .s-card-media img { transform: scale(1.04); }
.s-card-mono { font-size: clamp(2rem, 6cqi, 3rem); }
.s-ai-tag {
  position: absolute; left: 6px; bottom: 6px; max-width: calc(100% - 12px); font-size: .62rem; font-weight: 600; line-height: 1.5;
  padding: 1px 7px; border-radius: 999px; background: rgba(0,0,0,.5); color: #fff;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.s-card-body { display: flex; flex-direction: column; gap: 6px; padding: 14px 14px 16px; flex: 1; }
.theme-boutique .s-card-body { padding-inline: 2px; }
.s-card h3 { font-size: 1.1rem; line-height: 1.25; font-family: var(--s-body); font-weight: 700; text-transform: none; letter-spacing: 0; }
.theme-boutique .s-card h3, .theme-craft .s-card h3 { font-family: var(--s-display); font-size: 1.3rem; font-weight: var(--s-display-weight); }
.s-card-desc { color: var(--s-muted); font-size: .92rem; line-height: 1.45; }
.s-card-foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: auto; padding-top: 8px; flex-wrap: wrap; }
.s-price { font-weight: 800; font-size: 1.1rem; color: var(--s-accent); font-variant-numeric: tabular-nums; }
.s-price small { font-weight: 500; font-size: .8rem; color: var(--s-muted); }
.s-add {
  border: 1.5px solid var(--s-accent); color: var(--s-accent); background: transparent;
  border-radius: 999px; padding: 6px 14px; font: inherit; font-weight: 700; font-size: .88rem; cursor: pointer;
}
.s-add:hover { background: var(--s-accent); color: var(--s-accent-ink); }
.s-qty { display: inline-flex; align-items: center; gap: 6px; }
.s-qty button {
  width: 32px; height: 32px; border-radius: 50%; border: 1px solid var(--s-line); background: var(--s-bg);
  color: var(--s-ink); font-size: 1.05rem; cursor: pointer; line-height: 1;
}
.s-qty span { min-width: 18px; text-align: center; font-weight: 800; font-variant-numeric: tabular-nums; }

/* About */
.s-about { background: var(--s-soft); }
.s-about-grid { display: grid; gap: 32px; align-items: center; }
@container site (min-width: 860px) { .s-about-grid { grid-template-columns: 1fr 1fr; gap: 64px; } }
.s-about-text { font-size: 1.12rem; margin-top: 16px; max-width: 60ch; white-space: pre-line; }
.s-about-img { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; border-radius: var(--s-radius); display: block; }

/* Gallery */
.s-gallery { display: grid; gap: 10px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
@container site (min-width: 760px) { .s-gallery { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
.s-gallery img, .s-gallery video { width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: var(--s-radius); display: block; background: var(--s-soft); }
.s-gallery > :first-child { grid-column: span 2; grid-row: span 2; aspect-ratio: auto; height: 100%; }

/* Contact */
.s-contact-grid { display: grid; gap: 28px; align-items: start; }
@container site (min-width: 860px) { .s-contact-grid { grid-template-columns: 1.2fr 0.8fr; gap: 64px; } }
.s-contact-list { list-style: none; padding: 0; margin: 18px 0 0; display: grid; gap: 12px; }
.s-contact-list li { display: grid; gap: 2px; }
.s-contact-list span { font-size: .78rem; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: var(--s-muted); }
.s-contact-card { background: var(--s-surface); border: 1px solid var(--s-line); border-radius: calc(var(--s-radius) * 1.5); padding: 24px; display: grid; gap: 8px; }
.s-phone { font-size: 1.5rem; font-weight: 800; font-variant-numeric: tabular-nums; margin-bottom: 8px; }

.s-map { display: block; width: 100%; max-width: 100%; aspect-ratio: 16 / 10; border: 1px solid var(--s-line); border-radius: var(--s-radius); margin-top: 18px; background: var(--s-soft); }
.s-reviews { margin-top: 4px; }

/* Trust: "Open now · closes 9 pm" and the reviews link */
.s-trust { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 16px; min-height: 30px; font-size: .9rem; font-weight: 600; }
.s-hero-type .s-trust { justify-content: center; }
.s-trust a { color: inherit; text-decoration: underline; text-underline-offset: 3px; text-decoration-thickness: 1px; }
.s-open {
  display: inline-flex; align-items: center; gap: 8px; width: fit-content; padding: 4px 12px 4px 10px; border-radius: 999px;
  font-size: .86rem; font-weight: 700; letter-spacing: 0; text-transform: none;
  background: var(--s-surface); color: var(--s-ink); border: 1px solid var(--s-line);
}
.s-open::before { content: ""; width: 8px; height: 8px; border-radius: 50%; background: var(--s-muted); flex-shrink: 0; }
.s-open.is-open::before { background: #1e9e57; box-shadow: 0 0 0 3px rgba(30, 158, 87, .22); }
.s-hero-full .s-open { background: rgba(0, 0, 0, .38); color: #fff; border-color: rgba(255, 255, 255, .28); }
.s-contact-list .s-open { margin-top: 6px; }

/* Floating WhatsApp button (hidden while the order bar shows) */
.s-wa-fab {
  position: fixed; z-index: 30; right: max(16px, env(safe-area-inset-right, 0px)); bottom: calc(16px + env(safe-area-inset-bottom, 0px));
  width: 58px; height: 58px; border-radius: 50%; display: grid; place-items: center;
  background: #128c4a; box-shadow: 0 10px 24px -8px rgba(18, 140, 74, .65), 0 2px 6px rgba(0, 0, 0, .18);
  transition: transform .15s ease;
}
.site .s-wa-fab { color: #fff; }
.s-wa-fab:hover { transform: scale(1.06); }

/* Footer */
.s-footer { border-top: 1px solid var(--s-line); padding-block: 28px calc(28px + 76px); color: var(--s-muted); font-size: .9rem; }
.s-footer-row { display: flex; justify-content: space-between; gap: 16px; flex-wrap: wrap; }

/* Sticky order bar */
.s-orderbar {
  position: fixed; left: 0; right: 0; bottom: 0; z-index: 30;
  padding: 12px max(16px, env(safe-area-inset-right, 0px)) calc(12px + env(safe-area-inset-bottom, 0px)) max(16px, env(safe-area-inset-left, 0px));
  background: linear-gradient(transparent, color-mix(in srgb, var(--s-bg) 92%, transparent) 30%);
  display: flex; justify-content: center;
}
.s-orderbar .s-btn { width: min(100%, 520px); }

/* Cart drawer */
.s-drawer-wrap { position: fixed; inset: 0; z-index: 50; display: flex; justify-content: flex-end; }
.s-drawer-scrim { position: absolute; inset: 0; border: 0; background: rgba(0,0,0,.45); cursor: pointer; }
.s-drawer {
  position: relative; width: min(100%, 440px); height: 100%; overflow-y: auto;
  background: var(--s-bg); color: var(--s-ink); padding: 20px max(20px, env(safe-area-inset-right, 0px)) calc(24px + env(safe-area-inset-bottom, 0px)) 20px;
  box-shadow: -20px 0 60px -20px rgba(0,0,0,.4); display: flex; flex-direction: column; gap: 16px;
}
.s-drawer-head { display: flex; align-items: center; justify-content: space-between; }
.s-drawer-head h2 { font-size: 1.6rem; }
.s-close { border: 0; background: transparent; font-size: 1.8rem; line-height: 1; cursor: pointer; color: inherit; width: 40px; height: 40px; }
.s-lines { list-style: none; padding: 0; margin: 0; display: grid; gap: 10px; }
.s-lines li { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; gap: 10px; align-items: center; padding-bottom: 10px; border-bottom: 1px solid var(--s-line); }
.s-line-price { font-weight: 700; font-variant-numeric: tabular-nums; min-width: 64px; text-align: right; }
.s-total { display: flex; justify-content: space-between; font-size: 1.15rem; margin: 4px 0 8px; }
.s-checkout { display: grid; gap: 6px; }
.s-checkout label { font-weight: 600; font-size: .92rem; margin-top: 8px; }
.s-checkout input, .s-checkout textarea {
  width: 100%; font: inherit; color: var(--s-ink); background: var(--s-surface);
  border: 1px solid var(--s-line); border-radius: 10px; padding: 11px 13px;
}
.s-checkout textarea { min-height: 80px; resize: vertical; }
.s-checkout .s-btn { margin-top: 14px; }
.s-errors { background: color-mix(in srgb, #dc2626 10%, var(--s-bg)); border: 1px solid color-mix(in srgb, #dc2626 35%, transparent); border-radius: 10px; padding: 10px 12px; margin-top: 8px; }
.s-errors p { color: #b42318; font-size: .92rem; }
.s-placed { display: grid; gap: 16px; }

/* Language switch */
.s-lang {
  flex-shrink: 0; border: 1px solid var(--s-line); background: var(--s-surface); color: var(--s-ink);
  border-radius: 999px; padding: 6px 12px; font: inherit; font-size: .85rem; font-weight: 700; cursor: pointer;
}
.s-header-row > .s-lang { margin-left: auto; }
.s-header-row > .s-lang + .s-btn { margin-left: 8px; }
@container site (min-width: 820px) { .s-header-row > .s-lang { margin-left: 8px; } }

/* Category filter */
.s-chips { display: flex; gap: 8px; flex-wrap: wrap; margin: -8px 0 24px; }
.s-chips button {
  border: 1px solid var(--s-line); background: var(--s-surface); color: var(--s-ink); border-radius: 999px;
  padding: 7px 16px; font: inherit; font-weight: 600; font-size: .92rem; cursor: pointer;
}
.s-chips button.on { background: var(--s-accent); border-color: var(--s-accent); color: var(--s-accent-ink); }

/* Product options (size, colour, weight) */
.s-opts { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 2px; }
.s-opts button {
  min-width: 36px; border: 1px solid var(--s-line); background: var(--s-bg); color: var(--s-ink);
  border-radius: 8px; padding: 4px 10px; font: inherit; font-size: .85rem; font-weight: 600; cursor: pointer;
}
.s-opts button.on { border-color: var(--s-accent); box-shadow: inset 0 0 0 1px var(--s-accent); color: var(--s-accent); }

/* Out of stock */
.s-card.is-out .s-card-media img, .s-card.is-out .s-card-media video { filter: grayscale(1); opacity: .6; }
.s-card.is-out .s-price { color: var(--s-muted); }
.s-out-tag {
  position: absolute; top: 8px; left: 8px; font-size: .72rem; font-weight: 700; letter-spacing: .04em; text-transform: uppercase;
  padding: 3px 9px; border-radius: 999px; background: var(--s-ink); color: var(--s-bg);
}
.s-out-text { font-size: .85rem; font-weight: 700; color: var(--s-muted); }

/* Product title opens the big view */
.s-card-title { all: unset; cursor: pointer; font: inherit; color: inherit; }
.s-card-title:hover { text-decoration: underline; text-underline-offset: 3px; }
.s-card-title:focus-visible { outline: 3px solid color-mix(in srgb, var(--s-accent) 55%, transparent); outline-offset: 2px; }
.s-card-media { cursor: zoom-in; }

/* Big product view */
.s-pv-wrap { justify-content: center; align-items: flex-end; }
@container site (min-width: 760px) { .s-pv-wrap { align-items: center; } }
.s-pv {
  position: relative; width: min(100%, 560px); max-height: 92%; overflow-y: auto; background: var(--s-bg); color: var(--s-ink);
  border-radius: calc(var(--s-radius) * 1.5) calc(var(--s-radius) * 1.5) 0 0; box-shadow: 0 -20px 60px -20px rgba(0,0,0,.5);
}
@container site (min-width: 760px) { .s-pv { border-radius: calc(var(--s-radius) * 1.5); } }
.s-pv-img { width: 100%; max-height: 60vh; object-fit: cover; display: block; background: var(--s-soft); }
.s-pv-body { padding: 18px 20px calc(22px + env(safe-area-inset-bottom, 0px)); display: grid; gap: 10px; }
.s-pv-body h2 { font-size: 1.7rem; }
.s-pv-desc { color: var(--s-muted); white-space: pre-line; }
.s-pv-close { position: absolute; top: 8px; right: 8px; z-index: 1; background: color-mix(in srgb, var(--s-bg) 85%, transparent); border-radius: 50%; }
.s-pv-qty { justify-content: flex-start; }
.s-pv-qty button { width: 44px; height: 44px; }

/* Delivery and UPI in the contact section */
.s-delivery { margin-top: 18px; }
.s-upi { margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--s-line); display: grid; gap: 8px; }
.s-upi-row { display: flex; gap: 12px; align-items: center; }
.s-upi-row img { border-radius: 8px; background: #fff; border: 1px solid var(--s-line); }
.s-upi-id { font-weight: 800; word-break: break-all; margin-bottom: 6px; }
.s-total.s-sub { font-size: 1rem; color: var(--s-muted); margin-bottom: 0; }
.s-credits { opacity: .8; }

@media (prefers-reduced-motion: reduce) {
  .site *, .site *::before { transition: none !important; }
  .s-card:hover, .s-btn:hover { transform: none; }
}
`;
