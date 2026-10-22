// The website's text in its main language or its translation. Shared by SiteView (app)
// and the standalone generator, so both switch languages the same way.
import { uiText, type UiText } from "./i18n";
import type { Product, SiteContent } from "./schema";

export type LocalText = {
  ui: UiText;
  businessName: string;
  headline: string;
  subheadline: string;
  about: string | null;
  highlights: string[];
  area: string | null;
  hours: string | null;
  category: string;
  items: (Product & { categoryLabel: string | null })[];
};

export function localText(site: SiteContent, useTranslation: boolean): LocalText {
  const t = useTranslation ? site.translation : null;
  const catMap = new Map((t?.categories ?? []).map((c) => [c.from, c.to]));
  return {
    ui: uiText(t?.ui),
    businessName: t?.businessName || site.businessName,
    headline: t?.headline || site.headline,
    subheadline: t?.subheadline || site.subheadline,
    about: t ? t.about : site.about,
    highlights: (t?.highlights.length ? t.highlights : site.highlights).map((h) => h.trim()).filter(Boolean),
    area: t?.area || site.area,
    hours: t?.hours || site.hours,
    category: t?.category || site.category,
    items: site.items.map((it, i) => {
      const ti = t?.items[i];
      return {
        ...it,
        name: ti?.name || it.name,
        description: ti?.description || it.description,
        optionName: ti?.optionName || it.optionName,
        // Choices keep the same order, so a cart line's option index works in both languages.
        options: ti?.options.length === it.options?.length ? ti!.options : it.options,
        categoryLabel: it.category ? (catMap.get(it.category) ?? it.category) : null,
      };
    }),
  };
}

// Distinct product categories, in the order they first appear.
export const categoriesOf = (items: { category?: string | null }[]) => [...new Set(items.map((i) => i.category).filter((c): c is string => !!c))];
