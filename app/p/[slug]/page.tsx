import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCatalogue } from "@/lib/store";
import { OrderList } from "./OrderList";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = await getCatalogue((await params).slug);
  return c ? { title: c.businessName, description: c.tagline ?? `Order from ${c.businessName} on WhatsApp` } : {};
}

export default async function ShopPage({ params }: Props) {
  const c = await getCatalogue((await params).slug);
  if (!c) notFound();
  const { editKeyHash: _key, history: _history, ...pub } = c;

  return (
    <main className="narrow">
      <header className="shop-head">
        <h1>{pub.businessName}</h1>
        {pub.tagline && <p>{pub.tagline}</p>}
      </header>
      <OrderList catalogue={pub} />
      <p className="hint" style={{ marginTop: 24 }}>
        Or message us directly on WhatsApp: <a href={`https://wa.me/${pub.whatsapp}`}>+{pub.whatsapp}</a>
      </p>
      <p className="hint">
        Made with <a href="/">SiteGenie</a>
      </p>
    </main>
  );
}
