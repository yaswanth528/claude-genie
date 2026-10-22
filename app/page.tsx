import { readdirSync } from "node:fs";
import { join } from "node:path";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { whatsappLoginReady } from "@/lib/whatsapp";

// Images in ./images are copied to public/images (scripts/sync-images.mjs). Brand files
// (SiteGenie-*) are used as the logo/icon; anything else shows up in the gallery.
function galleryImages(): string[] {
  try {
    return readdirSync(join(process.cwd(), "public", "images"))
      .filter((f) => /\.(png|jpe?g|webp|gif|svg|avif)$/i.test(f) && !f.startsWith("SiteGenie-"))
      .sort();
  } catch {
    return [];
  }
}

export default function Home() {
  const rest = galleryImages();

  return (
    <>
      <header className="wrap nav">
        <Logo />
        <div className="row tight" style={{ marginTop: 0 }}>
          {whatsappLoginReady() && (
            <Link href="/login" className="btn ghost sm">
              Log in
            </Link>
          )}
          <Link href="/create" className="btn">
            Make my website
          </Link>
        </div>
      </header>

      <main className="wrap">
        <section className="hero">
          <div>
            <h1>
              Speak for 20 seconds. <em>Get your website.</em>
            </h1>
            <p className="lead">
              Tell us about your shop in your own language. Add photos if you have them. You get a beautiful website
              with your products, prices and WhatsApp ordering, or a full cart and checkout.
            </p>
            <Link href="/create" className="btn">
              Try it free
            </Link>
          </div>
          <div className="hero-visual">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/SiteGenie-icon-4K.png" alt="" width={420} height={386} />
          </div>
        </section>

        <section className="section">
          <h2>How it works</h2>
          <div className="steps">
            <div className="card">
              <div className="num">1</div>
              <h3>Speak</h3>
              <p>Say your business name, what you sell and the prices. Kannada, Hindi, English or a mix is fine. Add photos or videos if you like.</p>
            </div>
            <div className="card">
              <div className="num">2</div>
              <h3>Check</h3>
              <p>AI designs a website for your kind of business. See it live, fix any price, change the look. Nothing goes live until you publish.</p>
            </div>
            <div className="card">
              <div className="num">3</div>
              <h3>Share</h3>
              <p>Put the link in your WhatsApp status or Instagram bio. Orders arrive on your WhatsApp, ready to confirm.</p>
            </div>
          </div>
        </section>

        <section className="section">
          <h2>Change prices by voice</h2>
          <div className="card">
            <p>
              Say “change the cotton kurti price to 849”. You see a before and after, and the page updates only when
              you approve it. Changed your mind? Undo the last change in one tap. No freelancer, no fee per change.
            </p>
          </div>
        </section>

        {rest.length > 0 && (
          <section className="section">
            <h2>See it in action</h2>
            <div className="gallery">
              {rest.map((src) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={src} src={`/images/${src}`} alt="" loading="lazy" />
              ))}
            </div>
          </section>
        )}

        <section className="section">
          <h2>Pricing</h2>
          <div className="pricing">
            <div className="card">
              <span className="tag">Static website</span>
              <h3>Showcase</h3>
              <div className="price">₹1,999</div>
              <p>One-time. Your products, photos, about and contact, with ordering on WhatsApp. Unlimited voice changes. No yearly fee.</p>
            </div>
            <div className="card">
              <span className="tag">Dynamic website</span>
              <h3>Online store</h3>
              <div className="price">₹1,999 + ₹3,000/yr</div>
              <p>Everything in Showcase, plus a cart, a checkout form with delivery address, and an orders list for you.</p>
            </div>
          </div>
          <p className="hint">Custom domain optional, paid separately. Prices are a proposal and may change.</p>
        </section>
      </main>

      <footer className="wrap footer">
        SiteGenie · Voice-to-Page for small businesses · <Link href="/privacy">Privacy</Link> · <Link href="/terms">Terms</Link>
      </footer>
    </>
  );
}
