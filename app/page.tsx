import Link from "next/link";
import { FeatureTile, FinalGlow, Greatest, HeroSub, HeroTitle, Kicker, MotionProvider, ShopMarquee } from "@/components/landing/Bits";
import { Reveal } from "@/components/landing/Reveal";
import { Logo } from "@/components/Logo";
import { SiteView } from "@/components/site/SiteView";
import { DEMO, DEMO_MENU, DEMO_STORE } from "@/lib/demo";
import { PRICES, YEARLY } from "@/lib/prices";
import { whatsappLoginReady } from "@/lib/whatsapp";
import "./landing.css";

const rs = (n: number) => `₹${n.toLocaleString("en-IN")}`;

// A real SiteGenie website, drawn at true phone size and scaled into a frame.
function Phone({ dynamic = false, tilt, site = DEMO, className = "" }: { dynamic?: boolean; tilt?: "left" | "right"; site?: typeof DEMO; className?: string }) {
  return (
    <div className={`lp-phone ${tilt ? `tilt-${tilt}` : ""} ${className}`} aria-hidden="true">
      <div className="lp-phone-screen">
        <div className="lp-phone-inner">
          <SiteView site={site === DEMO ? { ...DEMO, siteType: dynamic ? "dynamic" : "static" } : site} preview />
        </div>
      </div>
    </div>
  );
}

const FEATURES: { title: string; body: string; wide?: boolean; dark?: boolean }[] = [
  { title: "Change it by talking.", body: "“Make it look more professional.” “Silk saree is sold out.” Say it, see it, undo it.", wide: true, dark: true },
  { title: "Orders on WhatsApp.", body: "Customers tap once. The order lands in your chat, ready to confirm." },
  { title: "UPI, built in.", body: "GPay, PhonePe or Paytm. Money goes straight to you." },
  { title: "Open now.", body: "Your hours become a live “Open now · closes 9 pm” badge." },
  { title: "Two languages.", body: "Customers switch between English and Kannada, Hindi or more." },
  { title: "Festival ready.", body: "Diwali, Eid, Pongal, Christmas. One tap puts your offer on top.", wide: true },
  { title: "Looks great when shared.", body: "Your link shows your photo and name in WhatsApp chats." },
  { title: "Price on request.", body: "Made to order? Customers ask for a quote instead." },
  { title: "Your own link.", body: "A fast website of your own, ready for your WhatsApp status and Instagram bio." },
  { title: "Track every order.", body: "Online stores give each customer a link to see and change their order." },
];

export default function Home() {
  return (
    <MotionProvider>
    <div className="lp">
      <Reveal />
      <header className="lp-nav">
        <div className="lp-nav-row">
          <Logo />
          <nav aria-label="Sections">
            <a href="#how">How it works</a>
            <a href="#designs">Designs</a>
            <a href="#pricing">Pricing</a>
          </nav>
          <div className="lp-nav-cta">
            {whatsappLoginReady() && (
              <Link href="/login" className="lp-link">
                Log in
              </Link>
            )}
            <Link href="/create" className="lp-pill sm">
              Make my website
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="lp-hero">
          <Kicker text="Websites for small shops" />
          <HeroTitle />
          <HeroSub text="Talk about your shop for 30 seconds, in your language. Get a beautiful website with your products, prices and ordering." />
          <div className="lp-ctas" data-reveal>
            <Link href="/create" className="lp-pill">
              Make my website
            </Link>
            <a href="#how" className="lp-pill ghost">
              See how it works
            </a>
          </div>
          <div className="lp-hero-device" data-reveal>
            <div className="lp-hero-row">
              <Phone site={DEMO_STORE} className="side left" />
              <Phone className="main" />
              <Phone site={DEMO_MENU} className="side right" />
            </div>
          </div>
        </section>

        <ShopMarquee />

        <section className="lp-dark" id="how">
          <div className="lp-inner">
            <p className="lp-kicker" data-reveal>
              How it works
            </p>
            <h2 data-reveal>
              You talk.
              <br />
              <span className="lp-dim">We build.</span>
            </h2>
            <div className="lp-flow">
              <div className="lp-flow-step" data-reveal>
                <span className="lp-num">01</span>
                <h3>Speak</h3>
                <p>Your shop’s name, what you sell and the prices. Kannada, Hindi, English, or a mix.</p>
                <div className="lp-wave" aria-hidden="true">
                  {Array.from({ length: 28 }, (_, i) => (
                    <i key={i} style={{ animationDelay: `${(i % 7) * 0.12}s` }} />
                  ))}
                </div>
              </div>
              <div className="lp-flow-step" data-reveal>
                <span className="lp-num">02</span>
                <h3>Check</h3>
                <p>A designed website appears in about a minute. Fix a price, pick a look, or just say what to change.</p>
                <div className="lp-chips" aria-hidden="true">
                  <span>Theme</span>
                  <span>Photos</span>
                  <span>Prices</span>
                  <span>Hours</span>
                </div>
              </div>
              <div className="lp-flow-step" data-reveal>
                <span className="lp-num">03</span>
                <h3>Share</h3>
                <p>Your own link for WhatsApp status and Instagram. Orders come straight to your WhatsApp.</p>
                <div className="lp-link-demo" aria-hidden="true">
                  <span>●</span> yourshop.pages.dev
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="lp-designs" id="designs">
          <div className="lp-inner">
            <p className="lp-kicker" data-reveal>
              Two designs
            </p>
            <h2 data-reveal>
              Showcase is great.
              <br />
              <Greatest>Online store is greatest.</Greatest>
            </h2>
            <div className="lp-duo">
              <div className="lp-duo-col" data-reveal>
                <Phone tilt="left" />
                <h3>Showcase</h3>
                <p>A beautiful catalogue. Customers send their list or ask about a product on WhatsApp.</p>
                <p className="lp-price">{rs(PRICES.static)} one-time</p>
              </div>
              <div className="lp-duo-col best" data-reveal>
                <Phone dynamic tilt="right" />
                <h3>Online store</h3>
                <p>Cart, checkout, delivery rules and order tracking. Your orders, organised.</p>
                <p className="lp-price">
                  {rs(PRICES.static)} + {rs(YEARLY)}/yr
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="lp-features">
          <div className="lp-inner">
            <h2 data-reveal>
              Everything a shop needs.
              <br />
              <span className="lp-dim">Nothing it doesn’t.</span>
            </h2>
            <div className="lp-bento">
              {FEATURES.map((f) => (
                <div key={f.title} className={`lp-tile-wrap ${f.wide ? "wide" : ""}`} data-reveal>
                  <FeatureTile {...f} />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="lp-pricing" id="pricing">
          <div className="lp-inner">
            <p className="lp-kicker" data-reveal>
              Pricing
            </p>
            <h2 data-reveal>Simple. No surprises.</h2>
            <div className="lp-plans">
              <div className="lp-plan" data-reveal>
                <h3>Showcase</h3>
                <p className="lp-plan-price">{rs(PRICES.static)}</p>
                <p className="lp-plan-note">one-time</p>
                <ul>
                  <li>Your own website link</li>
                  <li>Products, photos, hours and map</li>
                  <li>Orders on WhatsApp</li>
                  <li>Unlimited changes by voice</li>
                </ul>
                <Link href="/create" className="lp-pill ghost block">
                  Start with Showcase
                </Link>
              </div>
              <div className="lp-plan best" data-reveal>
                <span className="lp-badge">Most complete</span>
                <h3>Online store</h3>
                <p className="lp-plan-price">{rs(PRICES.static)}</p>
                <p className="lp-plan-note">+ {rs(YEARLY)} a year for online orders</p>
                <ul>
                  <li>Everything in Showcase</li>
                  <li>Cart and checkout</li>
                  <li>Delivery areas, charges, minimum order</li>
                  <li>Order tracking and your orders list</li>
                </ul>
                <Link href="/create" className="lp-pill block">
                  Start with Online store
                </Link>
              </div>
            </div>
            <p className="lp-fine" data-reveal>
              Try it free. You only pay when you put your website live. Prices are a proposal and may change.
            </p>
          </div>
        </section>

        <section className="lp-final">
          <FinalGlow />
          <div className="lp-inner">
            <h2 data-reveal>Your shop deserves a website.</h2>
            <p className="lp-sub" data-reveal>
              It takes less time than making tea.
            </p>
            <div className="lp-ctas" data-reveal>
              <Link href="/create" className="lp-pill light">
                Make my website
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="lp-footer">
        <div className="lp-inner lp-footer-row">
          <span>SiteGenie · Voice-to-Page for small businesses</span>
          <span>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
          </span>
        </div>
      </footer>
    </div>
    </MotionProvider>
  );
}
