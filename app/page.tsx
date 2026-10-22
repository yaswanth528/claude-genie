import { readdirSync } from "node:fs";
import { join } from "node:path";
import Link from "next/link";
import { Logo } from "@/components/Logo";

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
        <Link href="/create" className="btn">
          Make my page
        </Link>
      </header>

      <main className="wrap">
        <section className="hero">
          <div>
            <h1>
              Speak for 20 seconds. <em>Get your shop page.</em>
            </h1>
            <p className="lead">
              Tell us your products and prices in your own language. You get a page to share on WhatsApp and
              Instagram, and customers order straight to your WhatsApp.
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
              <p>Say your business name, products and prices. Kannada, Hindi, English or a mix is fine.</p>
            </div>
            <div className="card">
              <div className="num">2</div>
              <h3>Check</h3>
              <p>We read back what we heard. Fix anything that looks wrong — nothing goes live until you confirm.</p>
            </div>
            <div className="card">
              <div className="num">3</div>
              <h3>Share</h3>
              <p>Put the link in your WhatsApp or Instagram bio. Orders arrive as a ready-made WhatsApp message.</p>
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
              <span className="tag">Available now</span>
              <h3>Shop page</h3>
              <div className="price">₹1,999</div>
              <p>One-time. A catalogue page with WhatsApp ordering. Unlimited voice changes. No yearly fee.</p>
            </div>
            <div className="card">
              <span className="tag">Coming later</span>
              <h3>Online store</h3>
              <div className="price">₹1,999 + ₹3,000/yr</div>
              <p>Everything in the shop page, plus cart and online payment.</p>
            </div>
          </div>
          <p className="hint">Custom domain optional, paid separately. Prices are a proposal and may change.</p>
        </section>
      </main>

      <footer className="wrap footer">SiteGenie · Voice-to-Page for small businesses</footer>
    </>
  );
}
