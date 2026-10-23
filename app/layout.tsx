import type { Metadata, Viewport } from "next";
import { fontVariables } from "@/lib/fonts";
import "./globals.css";
import "./app.css";
import "./brand.css";

export const metadata: Metadata = {
  title: "SiteGenie — speak, get your website",
  description:
    "Speak for 20 seconds in your language and get a beautiful website for your shop, with WhatsApp ordering or a full cart.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={fontVariables}>
      <body>{children}</body>
    </html>
  );
}
