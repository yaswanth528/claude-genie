import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="narrow legal">
      <Logo />
      {children}
      <p className="hint small" style={{ marginTop: 32 }}>
        <Link href="/privacy">Privacy policy</Link> · <Link href="/terms">Terms</Link> · <Link href="/">SiteGenie home</Link>
      </p>
    </main>
  );
}
