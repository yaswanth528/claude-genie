import Link from "next/link";
import { Logo } from "@/components/Logo";

// Privacy and terms: SiteGenie's own pages, in its Peacock palette (styles in app/brand.css, .lg).
export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="lg">
      <header className="lg-bar">
        <div className="lg-row">
          <Logo />
          <nav aria-label="Legal pages">
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
          </nav>
        </div>
      </header>
      <main className="lg-main">{children}</main>
      <footer className="lg-foot">
        <div className="lg-row">
          <span>© SiteGenie</span>
          <span>
            <Link href="/privacy">Privacy policy</Link> · <Link href="/terms">Terms</Link> · <Link href="/">SiteGenie home</Link>
          </span>
        </div>
      </footer>
    </div>
  );
}
