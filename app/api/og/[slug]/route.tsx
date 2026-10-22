// The share card (Open Graph image) for a shop: what WhatsApp, Facebook and others show
// when the shop's link is shared. 1200×630, in the shop's own colours.
import { ImageResponse } from "next/og";
import sharp from "sharp";
import { THEMES } from "@/lib/themes";
import { getSite } from "@/lib/store";

const FAMILY: Record<string, string> = {
  boutique: "Cormorant Garamond",
  kitchen: "Fraunces",
  fresh: "Baloo 2",
  studio: "Sora",
  craft: "Playfair Display",
  bazaar: "Archivo",
};

// Google Fonts can return just the glyphs we need as a TTF (small and fast).
async function font(family: string, weight: number, text: string): Promise<ArrayBuffer | null> {
  try {
    const css = await (
      await fetch(`https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}&text=${encodeURIComponent(text)}`)
    ).text();
    const url = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)?.[1];
    return url ? await (await fetch(url)).arrayBuffer() : null;
  } catch {
    return null;
  }
}

const SCRIPTS: [RegExp, string][] = [
  [/[ಀ-೿]/, "Noto Sans Kannada"],
  [/[ऀ-ॿ]/, "Noto Sans Devanagari"],
  [/[஀-௿]/, "Noto Sans Tamil"],
  [/[ఀ-౿]/, "Noto Sans Telugu"],
  [/[ഀ-ൿ]/, "Noto Sans Malayalam"],
];

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const s = await getSite(slug);
  if (!s) return new Response("Not found", { status: 404 });

  const theme = THEMES[s.theme.id] ?? THEMES.bazaar;
  const p = theme.palettes[s.theme.accent] ?? theme.palettes[0];
  const raw = s.hero?.kind === "image" ? s.hero.url : s.items.find((i) => i.image?.kind === "image")?.image?.url;
  // Unsplash can send a smaller copy, which makes the card faster to draw.
  const photo = raw && /images\.unsplash\.com/.test(raw) ? `${raw.split("?")[0]}?w=960&q=75&auto=format&fm=jpg` : raw;
  const eyebrow = [s.category, s.area].filter(Boolean).join(" · ");
  const cta = s.siteType === "dynamic" ? "Order online" : "Order on WhatsApp";
  const text = `${s.businessName}${s.headline}${eyebrow}${cta}₹`;

  const display = FAMILY[s.theme.id] ?? "Archivo";
  const fonts: { name: string; data: ArrayBuffer; weight: 400 | 700; style: "normal" }[] = [];
  const d = await font(display, 700, text);
  if (d) fonts.push({ name: "Display", data: d, weight: 700, style: "normal" });
  const b = await font("Hind", 600, text);
  if (b) fonts.push({ name: "Body", data: b, weight: 400, style: "normal" });
  for (const [re, fam] of SCRIPTS) {
    if (!re.test(text)) continue;
    const f = await font(fam, 700, text);
    if (f) fonts.push({ name: fam, data: f, weight: 700, style: "normal" });
  }
  const stack = (first: string) => [first, ...SCRIPTS.map(([, f]) => f)].join(", ");
  const nameSize = s.businessName.length > 22 ? 64 : 84;

  const card = new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: p.bg, color: p.ink }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "64px 56px 56px 64px" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {eyebrow && (
              <div style={{ fontFamily: stack("Body"), fontSize: 26, color: p.accent, letterSpacing: 3, textTransform: "uppercase", marginBottom: 18 }}>
                {eyebrow}
              </div>
            )}
            <div style={{ fontFamily: stack("Display"), fontSize: nameSize, fontWeight: 700, lineHeight: 1.05 }}>{s.businessName}</div>
            {s.headline && s.headline !== s.businessName && (
              <div style={{ fontFamily: stack("Body"), fontSize: 34, color: p.muted, marginTop: 22, lineHeight: 1.3 }}>{s.headline}</div>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center" }}>
            <div
              style={{
                display: "flex",
                fontFamily: stack("Body"),
                fontSize: 30,
                background: p.accent,
                color: p.accentInk,
                padding: "16px 32px",
                borderRadius: 999,
              }}
            >
              {cta}
            </div>
          </div>
        </div>
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" width={480} height={630} style={{ width: 480, height: 630, objectFit: "cover" }} />
        ) : (
          <div style={{ width: 360, height: 630, display: "flex", background: p.soft, alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 220, height: 220, borderRadius: 999, background: p.accent, opacity: 0.85 }} />
          </div>
        )}
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: fonts.length ? fonts : undefined,
    },
  );
  // PNG of a photo is ~1 MB; WhatsApp skips previews much over 300 KB, so send a JPEG.
  const jpg = await sharp(Buffer.from(await card.arrayBuffer())).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
  return new Response(new Uint8Array(jpg), {
    headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=3600, s-maxage=86400" },
  });
}
