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
  --s-gap: clamp(16px, 3cqi, 28px);
  /* One large radius for photos and panels, scaled from the theme's own corner style. */
  --s-r-lg: clamp(14px, calc(var(--s-radius) * 1.6), 28px);
  background: var(--s-bg);
  color: var(--s-ink);
  font-family: var(--s-body);
  font-size: 17px;
  line-height: 1.6;
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}
.site * { box-sizing: border-box; }
.site h1, .site h2, .site h3 {
  font-family: var(--s-display);
  font-weight: var(--s-display-weight);
  letter-spacing: var(--s-tracking);
  text-transform: var(--s-heading-case);
  line-height: 1.06;
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
  min-height: 48px; padding: 12px 26px; border: 0; border-radius: 999px;
  background: var(--s-accent); color: var(--s-accent-ink);
  font: inherit; font-weight: 600; text-decoration: none; cursor: pointer;
  transition: transform .2s ease, filter .2s ease, opacity .15s;
}
.theme-boutique .s-btn { border-radius: var(--s-radius); letter-spacing: .04em; }
.s-btn:hover { transform: translateY(-1px); filter: brightness(1.08); }
.s-btn:disabled { opacity: .55; cursor: wait; transform: none; }
.s-btn:focus-visible, .site button:focus-visible, .site a:focus-visible, .site input:focus-visible, .site textarea:focus-visible {
  outline: 3px solid color-mix(in srgb, var(--s-accent) 55%, transparent); outline-offset: 2px;
}
/* Beat ".site a { color: inherit }" so link-buttons keep their own text colour. */
.site .s-btn { color: var(--s-accent-ink); }
.site .s-btn-ghost { color: inherit; }
.site .s-btn-wa { color: #fff; }
.s-btn-sm { min-height: 40px; padding: 8px 16px; font-size: .92rem; }
.s-btn-ghost { background: transparent; color: inherit; box-shadow: inset 0 0 0 1.5px color-mix(in srgb, currentColor 45%, transparent); }
.s-btn-ghost:hover { box-shadow: inset 0 0 0 1.5px currentColor; filter: none; }
.s-btn-wa { background: #128c4a; color: #fff; }
.s-btn-block { width: 100%; }
.s-link { display: inline-block; margin-top: 14px; font-weight: 600; color: var(--s-accent); text-decoration: none; }
.s-link:hover { text-decoration: underline; text-underline-offset: 3px; }

/* Header */
.s-header {
  position: sticky; top: env(safe-area-inset-top, 0px); z-index: 20;
  background: color-mix(in srgb, var(--s-bg) 74%, transparent);
  backdrop-filter: saturate(1.8) blur(20px); -webkit-backdrop-filter: saturate(1.8) blur(20px);
  border-bottom: 1px solid color-mix(in srgb, var(--s-line) 70%, transparent);
}
.s-header-row { display: flex; align-items: center; gap: 20px; min-height: 56px; }
.s-brand {
  font-family: var(--s-display); font-weight: var(--s-display-weight); font-size: 1.25rem;
  text-decoration: none; letter-spacing: var(--s-tracking); text-transform: var(--s-heading-case);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0;
}
.s-nav { display: none; gap: 32px; margin-inline: auto; font-size: .88rem; font-weight: 500; }
.s-nav a { text-decoration: none; color: var(--s-muted); transition: color .2s; }
.s-nav a:hover { color: var(--s-ink); }
.s-header-row > .s-btn { margin-left: auto; flex-shrink: 0; }
@container site (min-width: 820px) {
  .s-nav { display: flex; }
  .s-header-row > .s-btn { margin-left: 0; }
}

/* Hero */
.s-hero { position: relative; overflow: hidden; }
.s-hero-split { padding-block: clamp(48px, 9cqi, 120px) clamp(24px, 5cqi, 64px); text-align: center; }
.s-hero-split .s-hero-inner { display: grid; gap: clamp(32px, 6cqi, 64px); justify-items: center; }
.s-hero-copy { display: grid; gap: 18px; max-width: 620px; }
.s-hero-split .s-hero-copy { max-width: 900px; justify-items: center; }
.s-hero h1 { font-size: clamp(2.5rem, 10.5cqi, 6.2rem); overflow-wrap: break-word; hyphens: auto; letter-spacing: calc(var(--s-tracking) - .01em); }
.theme-bazaar .s-hero h1 { font-size: clamp(2.2rem, 9cqi, 5.4rem); }
.s-lead { font-size: clamp(1.1rem, 2.1cqi, 1.45rem); line-height: 1.45; color: var(--s-muted); max-width: 44ch; }
.s-eyebrow { font-size: .8rem; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: var(--s-accent); }
.s-hero-cta { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 8px; }
.s-hero-split .s-hero-cta, .s-hero-split .s-perks, .s-hero-split .s-trust { justify-content: center; }
.s-hero-media { border-radius: var(--s-r-lg); overflow: hidden; aspect-ratio: 4 / 3.4; background: var(--s-soft); }
.s-hero-split .s-hero-media { width: 100%; max-width: 1100px; }
@container site (min-width: 760px) { .s-hero-split .s-hero-media { aspect-ratio: 16 / 9; } }
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
.s-hero-full .s-btn-ghost { box-shadow: inset 0 0 0 1.5px rgba(255,255,255,.7); }
.s-hero-full .s-lead { color: rgba(255,255,255,.88); }
.s-hero-full .s-eyebrow { color: #fff; opacity: .9; }
.site .s-hero-full .s-btn-ghost { color: #fff; }

/* No banner photo: a type-led banner with soft colour shapes. */
.s-hero-type { padding-block: clamp(80px, 14cqi, 180px); text-align: center; isolation: isolate; }
.s-hero-type::before {
  content: ""; position: absolute; inset: -20% -10%; z-index: -1;
  background:
    radial-gradient(40% 50% at 15% 30%, color-mix(in srgb, var(--s-accent) 16%, transparent), transparent 70%),
    radial-gradient(35% 45% at 85% 70%, color-mix(in srgb, var(--s-accent) 12%, transparent), transparent 70%),
    var(--s-soft);
}
.s-hero-type .s-hero-copy { margin-inline: auto; justify-items: center; max-width: 920px; }
.s-hero-type h1 { font-size: clamp(2.6rem, 11cqi, 6.6rem); }
.s-hero-type .s-hero-cta { justify-content: center; }

/* Highlights */
.s-highlights { border-block: 1px solid var(--s-line); }
.s-highlights-row { display: flex; flex-wrap: wrap; gap: 10px 40px; justify-content: center; padding-block: 18px; font-weight: 600; font-size: .95rem; text-align: center; }
.s-highlights-row p::before { content: ""; display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: var(--s-accent); margin-right: 10px; vertical-align: middle; }

/* Sections */
.s-section { padding-block: clamp(64px, 10cqi, 128px); }
.s-section-head { display: grid; gap: 12px; margin: 0 auto clamp(28px, 5cqi, 56px); max-width: 760px; text-align: center; justify-items: center; }
.s-section-head h2 { font-size: clamp(2.2rem, 6.5cqi, 4rem); }
.s-about h2, .s-contact h2 { font-size: clamp(2rem, 5cqi, 3.2rem); }
.s-section-head p { color: var(--s-muted); font-size: clamp(1.02rem, 1.8cqi, 1.2rem); max-width: 52ch; }

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
  background: var(--s-surface); border: 1px solid color-mix(in srgb, var(--s-line) 60%, transparent); border-radius: var(--s-r-lg); overflow: hidden;
  transition: transform .35s cubic-bezier(.2,.7,.2,1), box-shadow .35s ease;
}
.s-card:hover { transform: translateY(-4px); box-shadow: 0 30px 60px -36px rgba(0,0,0,.4); }
.theme-boutique .s-card { border: 0; background: transparent; }
.theme-boutique .s-card:hover { box-shadow: none; }
.s-card-media { position: relative; aspect-ratio: 1; background: var(--s-soft); overflow: hidden; }
.theme-boutique .s-card-media { aspect-ratio: 3 / 4; }
.s-card-media img, .s-card-media video { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform .8s cubic-bezier(.2,.7,.2,1); }
.s-card:hover .s-card-media img { transform: scale(1.05); }
.s-card-mono { font-size: clamp(2rem, 6cqi, 3rem); }
.s-ai-tag {
  position: absolute; left: 6px; bottom: 6px; max-width: calc(100% - 12px); font-size: .62rem; font-weight: 600; line-height: 1.5;
  padding: 1px 7px; border-radius: 999px; background: rgba(0,0,0,.5); color: #fff;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.s-card-body { display: flex; flex-direction: column; gap: 6px; padding: clamp(14px, 2.4cqi, 20px) clamp(14px, 2.4cqi, 20px) clamp(16px, 2.6cqi, 22px); flex: 1; }
.theme-boutique .s-card-body { padding-inline: 2px; }
.s-card h3 { font-size: 1.12rem; line-height: 1.25; font-family: var(--s-body); font-weight: 700; text-transform: none; letter-spacing: -0.01em; }
.theme-boutique .s-card h3, .theme-craft .s-card h3 { font-family: var(--s-display); font-size: 1.3rem; font-weight: var(--s-display-weight); }
.s-card-desc { color: var(--s-muted); font-size: .92rem; line-height: 1.45; }
.s-card-foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: auto; padding-top: 8px; flex-wrap: wrap; }
.s-price { font-weight: 700; font-size: 1.1rem; color: var(--s-ink); font-variant-numeric: tabular-nums; }
.s-price small { font-weight: 500; font-size: .8rem; color: var(--s-muted); }
.s-add {
  border: 1.5px solid var(--s-accent); color: var(--s-accent-ink); background: var(--s-accent);
  border-radius: 999px; padding: 7px 16px; font: inherit; font-weight: 600; font-size: .88rem; cursor: pointer;
  transition: filter .2s ease;
}
.s-add:hover { filter: brightness(1.1); }
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
.s-about-text { font-size: clamp(1.12rem, 2cqi, 1.35rem); line-height: 1.55; margin-top: 18px; max-width: 52ch; white-space: pre-line; }
.s-about-img { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; border-radius: var(--s-r-lg); display: block; }

/* Gallery */
.s-gallery { display: grid; gap: 12px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
@container site (min-width: 760px) { .s-gallery { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
.s-gallery img, .s-gallery video { width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: var(--s-r-lg); display: block; background: var(--s-soft); }
.s-gallery > :first-child { grid-column: span 2; grid-row: span 2; aspect-ratio: auto; height: 100%; }

/* Contact */
.s-contact-grid { display: grid; gap: 28px; align-items: start; }
@container site (min-width: 860px) { .s-contact-grid { grid-template-columns: 1.2fr 0.8fr; gap: 64px; } }
.s-contact-list { list-style: none; padding: 0; margin: 18px 0 0; display: grid; gap: 12px; }
.s-contact-list li { display: grid; gap: 2px; }
.s-contact-list span { font-size: .78rem; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: var(--s-muted); }
.s-contact-card { background: var(--s-soft); border-radius: var(--s-r-lg); padding: clamp(22px, 4cqi, 36px); display: grid; gap: 8px; }
.s-phone { font-family: var(--s-display); font-weight: var(--s-display-weight); font-size: clamp(1.6rem, 4cqi, 2.2rem); letter-spacing: var(--s-tracking); font-variant-numeric: tabular-nums; margin-bottom: 10px; }

/* ---------- Hero mosaic: the shop's product photos when there's no banner photo ---------- */
.s-mosaic { display: grid; gap: clamp(8px, 1.4cqi, 14px); grid-template-columns: 1.25fr 1fr; grid-template-rows: 1fr 1fr; aspect-ratio: 5 / 4; width: 100%; max-width: 1100px; }
@container site (min-width: 760px) { .s-mosaic { grid-template-columns: 1.6fr 1fr; aspect-ratio: 16 / 8; } }
.s-mosaic > * { border-radius: var(--s-r-lg); overflow: hidden; background: var(--s-soft); position: relative; }
.s-mosaic > :first-child { grid-row: span 2; }
.s-mosaic.n2 > :nth-child(2) { grid-row: span 2; }
.s-mosaic img { width: 100%; height: 100%; object-fit: cover; display: block; }
.s-hero-split.has-mosaic .s-hero-inner { align-items: center; }

/* Product without a photo: its name, set like a label, instead of initials */
.s-card-name-tile { width: 100%; height: 100%; display: grid; place-items: center; padding: 14px; text-align: center;
  font-family: var(--s-display); font-weight: var(--s-display-weight); font-size: clamp(1.05rem, 3.2cqi, 1.5rem); line-height: 1.15; color: var(--s-accent);
  text-transform: var(--s-heading-case); letter-spacing: var(--s-tracking);
  background: radial-gradient(circle at 30% 20%, color-mix(in srgb, var(--s-accent) 16%, transparent), transparent 62%), var(--s-soft); }

/* About: a facts card when there's no photo */
.s-facts { display: grid; gap: 14px; padding: clamp(20px, 4cqi, 32px); border-radius: calc(var(--s-radius) * 1.5); background: var(--s-surface); border: 1px solid var(--s-line); }
.s-facts div { display: grid; gap: 2px; }
.s-facts dt { font-size: .74rem; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: var(--s-muted); }
.s-facts dd { margin: 0; font-family: var(--s-display); font-weight: var(--s-display-weight); font-size: 1.3rem; line-height: 1.25; }

/* "How to order" / "Ordering is easy" */
.s-steps { display: grid; gap: 14px; grid-template-columns: minmax(0, 1fr); counter-reset: step; }
@container site (min-width: 760px) { .s-steps { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 20px; } }
.s-step { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 4px 16px; align-items: start; padding: 22px 0 0; border-top: 1px solid var(--s-line); }
.s-step::before { counter-increment: step; content: "0" counter(step); grid-row: span 2; font-family: var(--s-display); font-weight: var(--s-display-weight); font-size: 2rem; line-height: 1; color: var(--s-accent); font-variant-numeric: tabular-nums; }
.s-step h3 { font-family: var(--s-body); font-weight: 700; font-size: 1.1rem; text-transform: none; letter-spacing: -0.01em; }
.s-step p { color: var(--s-muted); font-size: .92rem; }

/* Price on request + per-product WhatsApp question (showcase) */
.s-ask-price { font-weight: 700; color: var(--s-muted); font-size: .95rem; }
.s-ask { display: inline-grid; place-items: center; width: 36px; height: 36px; border-radius: 50%; border: 1.5px solid var(--s-line); color: #128c4a; flex-shrink: 0; text-decoration: none; }
.site .s-ask { color: #128c4a; }
.s-ask svg { width: 20px; height: 20px; }
.s-ask:hover { border-color: #128c4a; background: color-mix(in srgb, #128c4a 8%, transparent); }
.s-card-actions { display: inline-flex; align-items: center; gap: 8px; }
.s-ask-btn { border: 1.5px solid #128c4a; color: #128c4a; background: transparent; border-radius: 999px; padding: 6px 14px; font: inherit; font-weight: 700; font-size: .88rem; text-decoration: none; }
.site .s-ask-btn { color: #128c4a; }

/* ---------- Showcase (static): calm, editorial catalogue ---------- */
.is-showcase .s-section-head::before { content: ""; width: 44px; height: 3px; background: var(--s-accent); border-radius: 3px; margin-bottom: 6px; }
.is-showcase .s-steps-wrap { padding-block: clamp(40px, 6cqi, 72px); }
.is-showcase .s-steps-wrap + .s-about { margin-top: 0; }

/* ---------- Store (dynamic): an app-like shop ---------- */
.s-storebar { background: var(--s-ink); color: var(--s-bg); text-align: center; font-size: .84rem; font-weight: 600; padding: 7px max(16px, env(safe-area-inset-right, 0px)) 7px max(16px, env(safe-area-inset-left, 0px)); }
.s-perks { display: flex; flex-wrap: wrap; gap: 8px; }
.s-hero-type .s-perks { justify-content: center; }
.s-perks span { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 999px; font-size: .84rem; font-weight: 700;
  background: color-mix(in srgb, var(--s-accent) 10%, var(--s-surface)); color: var(--s-ink); border: 1px solid color-mix(in srgb, var(--s-accent) 22%, transparent); }
.s-hero-full .s-perks span { background: rgba(0,0,0,.35); color: #fff; border-color: rgba(255,255,255,.25); }
.is-store #products, .is-store [id="alt-products"] { background: var(--s-soft); }
.s-toolbar { display: grid; gap: 10px; margin-bottom: 18px; }
.s-toolbar .s-chips, .s-toolbar .s-search { margin: 0; }
.is-store .s-toolbar {
  position: sticky; top: calc(56px + env(safe-area-inset-top, 0px)); z-index: 15; padding-block: 10px;
  margin-inline: calc(-1 * max(16px, env(safe-area-inset-left, 0px))); padding-inline: max(16px, env(safe-area-inset-left, 0px));
  background: color-mix(in srgb, var(--s-soft) 94%, transparent); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
}
.is-preview.is-store .s-toolbar { top: 56px; }
.s-toolbar { justify-items: center; }
.s-toolbar .s-chips { justify-content: center; }
.s-toolbar .s-search { width: 100%; display: flex; justify-content: center; }
.is-store .s-card { background: var(--s-surface); border-color: transparent; }
.theme-boutique.is-store .s-card { background: var(--s-surface); }
.theme-boutique.is-store .s-card-body { padding-inline: 14px; }
.is-store .s-add { background: var(--s-accent); color: var(--s-accent-ink); border-color: var(--s-accent); padding: 8px 16px; }
.is-store .s-add:hover { filter: brightness(1.08); }
.is-store .s-price { font-size: 1.2rem; }
.is-store .s-steps-wrap { background: var(--s-bg); }

/* Product tags */
.s-badge {
  position: absolute; top: 8px; left: 8px; z-index: 2; width: fit-content;
  font-size: .66rem; font-weight: 800; letter-spacing: .07em; text-transform: uppercase; line-height: 1.6;
  padding: 2px 9px; border-radius: 999px; background: var(--s-accent); color: var(--s-accent-ink);
  box-shadow: 0 4px 10px -4px rgba(0,0,0,.35);
}
.s-badge-new { background: var(--s-ink); color: var(--s-bg); }
.s-badge-offer { background: #c0262d; color: #fff; }
.s-card-body > .s-badge, .s-pv-body > .s-badge { position: static; box-shadow: none; }

/* Owner's own photos: shown whole, on a soft blurred copy of themselves (no cropping). */
.s-framed { isolation: isolate; }
.s-framed::before { content: ""; position: absolute; inset: -24px; z-index: -1; background: var(--img) center / cover no-repeat; filter: blur(18px) saturate(1.15); opacity: .9; }
.site .s-framed img { object-fit: contain; }

/* Layouts: list rows, big lookbook photos, or a menu board */
.s-grid.s-layout-list { grid-template-columns: minmax(0, 1fr); gap: 12px; }
@container site (min-width: 860px) { .s-grid.s-layout-list { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
.s-layout-list .s-card { flex-direction: row; }
.s-layout-list .s-card-media, .theme-boutique .s-layout-list .s-card-media { width: clamp(104px, 30cqi, 150px); aspect-ratio: 1; flex-shrink: 0; align-self: stretch; }
.theme-boutique .s-layout-list .s-card { border: 1px solid var(--s-line); background: var(--s-surface); }
.s-grid.s-layout-lookbook { grid-template-columns: minmax(0, 1fr); gap: clamp(20px, 4cqi, 36px); }
@container site (min-width: 600px) { .s-grid.s-layout-lookbook { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@container site (min-width: 1080px) { .s-grid.s-layout-lookbook { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
.s-layout-lookbook .s-card-media, .theme-boutique .s-layout-lookbook .s-card-media { aspect-ratio: 4 / 5; }
.s-layout-lookbook .s-card h3 { font-family: var(--s-display); font-weight: var(--s-display-weight); font-size: 1.45rem; }
.s-grid.s-layout-menu {
  grid-template-columns: minmax(0, 1fr); gap: 0 56px; padding: clamp(18px, 4cqi, 40px);
  background: var(--s-surface); border: 1px solid var(--s-line); border-radius: calc(var(--s-radius) * 1.5);
}
@container site (min-width: 860px) { .s-grid.s-layout-menu { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
.s-layout-menu .s-card { background: transparent; border: 0; border-bottom: 1px dashed var(--s-line); border-radius: 0; overflow: visible; }
.s-layout-menu .s-card:hover { transform: none; box-shadow: none; }
.s-layout-menu .s-card-media, .s-layout-menu .s-card-num { display: none; }
.s-layout-menu .s-card-body { padding: 16px 0; }
.s-layout-menu .s-card h3 { font-family: var(--s-display); font-weight: var(--s-display-weight); font-size: 1.25rem; }

/* Search and "You looked at" */
.s-search { margin: 0 0 18px; }
.s-search input {
  width: 100%; max-width: 440px; min-height: 46px; padding: 10px 16px 10px 42px; border-radius: 999px;
  border: 1px solid var(--s-line); background: var(--s-surface); color: var(--s-ink); font: inherit;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18' fill='none' stroke='%23888' stroke-width='2' stroke-linecap='round'%3E%3Ccircle cx='8' cy='8' r='6'/%3E%3Cpath d='m13 13 4 4'/%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: 15px center;
}
.s-noresults { color: var(--s-muted); padding: 12px 0 24px; }
.s-seen { display: grid; gap: 8px; margin: 0 0 22px; }
.s-seen > p { font-size: .76rem; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: var(--s-muted); }
.s-seen-row { display: flex; gap: 8px; overflow-x: auto; scrollbar-width: none; padding-bottom: 2px; }
.s-seen-row::-webkit-scrollbar { display: none; }
.s-seen-row button {
  flex: 0 0 auto; display: inline-flex; align-items: center; gap: 8px; max-width: 220px; min-height: 40px; padding: 4px 14px 4px 4px;
  border: 1px solid var(--s-line); border-radius: 999px; background: var(--s-surface); color: var(--s-ink);
  font: inherit; font-size: .88rem; font-weight: 600; cursor: pointer;
}
.s-seen-row img { width: 32px; height: 32px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
.s-seen-row span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.s-seen-row button:not(:has(img)) { padding-left: 14px; }

/* Festival banner */
.s-festive {
  position: relative; z-index: 21; display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 4px 10px;
  padding: 10px max(16px, env(safe-area-inset-right, 0px)) 12px max(16px, env(safe-area-inset-left, 0px));
  text-align: center; font-weight: 700; font-size: .95rem; line-height: 1.35; color: #fff; background: var(--fest);
}
.s-festive em { font-style: normal; font-weight: 500; opacity: .95; }
.s-festive::after {
  content: ""; position: absolute; left: 0; right: 0; bottom: -5px; height: 6px;
  background: radial-gradient(circle at 7px 0, var(--fest-dot) 3px, transparent 3.6px) 0 0 / 14px 6px repeat-x;
}
.s-fest-diwali { --fest: linear-gradient(90deg, #4a0d1a, #8f1d2c 45%, #b8641e); --fest-dot: #f2b33d; }
.s-fest-navratri { --fest: linear-gradient(90deg, #8e1458, #c2185b 45%, #ef6c00); --fest-dot: #ffd54f; }
.s-fest-ganesh { --fest: linear-gradient(90deg, #a6260f, #d84315 50%, #f08c00); --fest-dot: #ffe082; }
.s-fest-holi { --fest: linear-gradient(90deg, #d81b60, #8e24aa 30%, #1e88e5 55%, #43a047 78%, #f9a825); --fest-dot: #fff; }
.s-fest-eid { --fest: linear-gradient(90deg, #0b3d2e, #12664f 55%, #1b7a5a); --fest-dot: #e6c36a; }
.s-fest-christmas { --fest: linear-gradient(90deg, #8b1520, #b71c1c 50%, #1b5e20); --fest-dot: #f5f5f5; }
.s-fest-pongal { --fest: linear-gradient(90deg, #5d7a1f, #7c9a2d 45%, #e0a100); --fest-dot: #fff3c4; }
.s-fest-onam { --fest: linear-gradient(90deg, #b34700, #e67e00 50%, #f2b01e); --fest-dot: #fff; }
.s-fest-ugadi { --fest: linear-gradient(90deg, #2e6b2f, #4f8f2a 50%, #d4a017); --fest-dot: #fff3c4; }
.s-fest-newyear { --fest: linear-gradient(90deg, #1a1446, #3b2a8a 55%, #6a3fb5); --fest-dot: #ffd54f; }

.s-map { display: block; width: 100%; max-width: 100%; aspect-ratio: 16 / 10; max-height: 320px; border: 1px solid var(--s-line); border-radius: var(--s-radius); margin-top: 18px; background: var(--s-soft); }
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
.s-footer { background: var(--s-soft); padding-block: 28px calc(28px + 76px); color: var(--s-muted); font-size: .82rem; }
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

/* Spotlight: one product shown big between the banner and the list */
.s-spot-wrap { padding-block: clamp(40px, 7cqi, 96px) 0; }
.s-spot {
  display: grid; gap: clamp(20px, 4cqi, 56px); align-items: center;
  background: var(--s-soft); border-radius: var(--s-r-lg); padding: clamp(12px, 2.4cqi, 28px); overflow: hidden;
}
@container site (min-width: 820px) { .s-spot { grid-template-columns: 1.1fr 1fr; } }
.s-spot-media { position: relative; aspect-ratio: 1; border-radius: calc(var(--s-r-lg) - 6px); overflow: hidden; background: var(--s-surface); cursor: zoom-in; }
.s-spot-media img, .s-spot-media video { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform 1s cubic-bezier(.2,.7,.2,1); }
.s-spot:hover .s-spot-media img { transform: scale(1.04); }
.s-spot-copy { display: grid; gap: 14px; justify-items: start; padding: 4px clamp(6px, 2cqi, 28px) clamp(10px, 2cqi, 24px); }
.s-spot h2 { font-size: clamp(2.1rem, 6.5cqi, 3.8rem); overflow-wrap: break-word; }
.s-spot-desc { color: var(--s-muted); font-size: clamp(1.05rem, 1.8cqi, 1.25rem); line-height: 1.5; max-width: 40ch; }
.s-spot-price { font-size: clamp(1.3rem, 2.6cqi, 1.7rem); font-weight: 700; font-variant-numeric: tabular-nums; }
.s-spot-price small { font-size: .8rem; font-weight: 500; color: var(--s-muted); }
.s-spot-cta { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; margin-top: 6px; }

/* Motion: the banner rises in on load; sections fade up as they scroll into view
   (CSS only, so the hosted page and the preview move the same; skipped on reduced motion). */
@keyframes s-rise { from { opacity: 0; translate: 0 26px; } }
@keyframes s-reveal { from { opacity: 0; translate: 0 48px; scale: .97; } }
@media (prefers-reduced-motion: no-preference) {
  .s-hero-copy > * { animation: s-rise .9s cubic-bezier(.2,.7,.2,1) both; }
  .s-hero-copy > :nth-child(2) { animation-delay: .08s; }
  .s-hero-copy > :nth-child(3) { animation-delay: .16s; }
  .s-hero-copy > :nth-child(n+4) { animation-delay: .24s; }
  .s-hero-split .s-hero-media, .s-hero-split .s-mosaic { animation: s-rise 1.1s .3s cubic-bezier(.2,.7,.2,1) both; }
  @supports (animation-timeline: view()) {
    .s-section-head, .s-spot, .s-grid > .s-card, .s-step, .s-about-grid > *, .s-gallery > *, .s-contact-grid > * {
      animation: s-reveal linear both; animation-timeline: view(); animation-range: entry 0% entry 70%;
    }
  }
}

@media (prefers-reduced-motion: reduce) {
  .site *, .site *::before { transition: none !important; }
  .s-card:hover, .s-btn:hover { transform: none; }
}
`;
