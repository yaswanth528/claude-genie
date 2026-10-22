// Search-engine data for a shop: schema.org JSON-LD and the share-card image URL.
import type { SiteContent } from "./schema";

type SeoSite = SiteContent & { whatsapp: string; slug: string; updatedAt?: string };

// Share card (WhatsApp/Facebook preview). The version in the URL makes apps fetch a fresh
// card after the owner changes the website.
export const ogImageUrl = (appOrigin: string, s: SeoSite) => `${appOrigin}/api/og/${s.slug}?v=${encodeURIComponent((s.updatedAt ?? "").slice(0, 19))}`;

export function jsonLd(s: SeoSite, url: string, appOrigin: string): string {
  const offers = s.items
    .filter((i) => i.price !== null)
    .slice(0, 50)
    .map((i) => ({
      "@type": "Offer",
      price: i.price,
      priceCurrency: "INR",
      availability: i.inStock === false ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
      itemOffered: {
        "@type": "Product",
        name: i.name,
        ...(i.description ? { description: i.description } : {}),
        ...(i.image?.kind === "image" && !i.image.generated ? { image: i.image.url } : {}),
      },
    }));
  const data = {
    "@context": "https://schema.org",
    "@type": "Store",
    name: s.businessName,
    description: s.subheadline || s.headline,
    url,
    image: ogImageUrl(appOrigin, s),
    telephone: `+${s.whatsapp}`,
    ...(s.address || s.area
      ? { address: { "@type": "PostalAddress", ...(s.address ? { streetAddress: s.address } : {}), ...(s.area ? { addressLocality: s.area } : {}), addressCountry: "IN" } }
      : {}),
    ...(s.hours ? { openingHours: s.hours } : {}),
    ...(s.delivery?.areas ? { areaServed: s.delivery.areas } : {}),
    ...(offers.length ? { makesOffer: offers } : {}),
  };
  // Safe inside <script>: no closing tag can appear.
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
