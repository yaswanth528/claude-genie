import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteView } from "@/components/site/SiteView";
import { VisitPing } from "@/components/VisitPing";
import { contentOf } from "@/lib/catalogue";
import { getSite } from "@/lib/store";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const s = await getSite((await params).slug);
  if (!s) return {};
  const image = s.hero?.kind === "image" ? s.hero.url : s.items.find((i) => i.image)?.image?.url;
  return {
    title: s.businessName,
    description: s.subheadline || `Order from ${s.businessName} on WhatsApp`,
    openGraph: { title: s.businessName, description: s.subheadline, images: image ? [image] : undefined },
  };
}

export default async function SitePage({ params }: Props) {
  const s = await getSite((await params).slug);
  if (!s) notFound();
  return (
    <>
      <VisitPing slug={s.slug} />
      <SiteView site={{ ...contentOf(s), whatsapp: s.whatsapp, slug: s.slug }} />
    </>
  );
}
