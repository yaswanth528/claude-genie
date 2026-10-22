"use client";
// Share kit for an owner's website: a WhatsApp-status image and a printable counter poster,
// both with a QR code in the shop's own colours, plus quick share links.
import QRCode from "qrcode";
import { useEffect, useRef, useState } from "react";
import type { ThemeId } from "@/lib/schema";
import { THEMES } from "@/lib/themes";
import { CopyButton } from "./CopyButton";

type Props = { url: string; businessName: string; headline: string; themeId: ThemeId; accent: number; scanLabel?: string };

// Each theme's display font, as next/font exposes it on <html>.
const FONT_VAR: Record<ThemeId, string> = {
  boutique: "--f-cormorant",
  kitchen: "--f-fraunces",
  fresh: "--f-baloo",
  studio: "--f-sora",
  craft: "--f-playfair",
  bazaar: "--f-archivo",
};

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const out: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      out.push(line);
      line = word;
    } else line = test;
  }
  if (line) out.push(line);
  return out.slice(0, 3);
}

async function draw(canvas: HTMLCanvasElement, p: Props, kind: "status" | "poster") {
  const W = kind === "status" ? 1080 : 1240;
  const H = kind === "status" ? 1920 : 1754; // poster ~ A4 at 150 dpi
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const pal = THEMES[p.themeId].palettes[p.accent] ?? THEMES[p.themeId].palettes[0];
  const fam = getComputedStyle(document.documentElement).getPropertyValue(FONT_VAR[p.themeId]).trim() || "Georgia, serif";
  const body = getComputedStyle(document.body).fontFamily || "system-ui, sans-serif";
  await document.fonts?.ready;

  // Background with a soft accent glow.
  ctx.fillStyle = pal.bg;
  ctx.fillRect(0, 0, W, H);
  const g = ctx.createRadialGradient(W * 0.2, H * 0.15, 0, W * 0.2, H * 0.15, W * 0.9);
  g.addColorStop(0, pal.soft);
  g.addColorStop(1, pal.bg);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = pal.accent;
  ctx.fillRect(0, 0, W, 18);
  ctx.fillRect(0, H - 18, W, 18);

  ctx.textAlign = "center";
  ctx.fillStyle = pal.ink;
  let y = kind === "status" ? 300 : 230;
  ctx.font = `700 ${kind === "status" ? 104 : 96}px ${fam}`;
  for (const l of wrap(ctx, p.businessName, W - 160)) {
    ctx.fillText(l, W / 2, y);
    y += kind === "status" ? 118 : 108;
  }
  ctx.fillStyle = pal.muted;
  ctx.font = `500 ${kind === "status" ? 46 : 42}px ${body}`;
  y += 20;
  for (const l of wrap(ctx, p.headline, W - 200)) {
    ctx.fillText(l, W / 2, y);
    y += 58;
  }

  // QR code on a white card.
  const size = kind === "status" ? 600 : 640;
  const qr = document.createElement("canvas");
  await QRCode.toCanvas(qr, p.url, { width: size, margin: 1, color: { dark: "#111111", light: "#ffffff" }, errorCorrectionLevel: "M" });
  const qy = Math.max(y + 60, kind === "status" ? 760 : 620);
  const pad = 40;
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "rgba(0,0,0,0.18)";
  ctx.shadowBlur = 40;
  ctx.fillRect((W - size) / 2 - pad, qy - pad, size + pad * 2, size + pad * 2);
  ctx.shadowBlur = 0;
  ctx.drawImage(qr, (W - size) / 2, qy, size, size);

  // Call to action and address.
  let cy = qy + size + pad + 110;
  ctx.fillStyle = pal.accent;
  ctx.font = `800 ${kind === "status" ? 72 : 76}px ${fam}`;
  ctx.fillText(p.scanLabel ?? "Scan to see products & order", W / 2, cy, W - 120);
  cy += 80;
  ctx.fillStyle = pal.ink;
  ctx.font = `600 ${kind === "status" ? 40 : 38}px ${body}`;
  ctx.fillText(p.url.replace(/^https?:\/\//, ""), W / 2, cy, W - 120);
  cy += 60;
  ctx.fillStyle = pal.muted;
  ctx.font = `500 34px ${body}`;
  ctx.fillText("Orders on WhatsApp", W / 2, cy);
}

export function SharePanel(p: Props) {
  const status = useRef<HTMLCanvasElement>(null);
  const poster = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!status.current || !poster.current) return;
      await draw(status.current, p, "status");
      await draw(poster.current, p, "poster");
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.url, p.businessName, p.headline, p.themeId, p.accent]);

  const download = (c: HTMLCanvasElement | null, name: string) => {
    if (!c) return;
    const a = document.createElement("a");
    a.href = c.toDataURL("image/png");
    a.download = `${p.businessName.replace(/[^\w]+/g, "-").toLowerCase() || "shop"}-${name}.png`;
    a.click();
  };
  const shareText = `${p.businessName}: see our products and order on WhatsApp ${p.url}`;

  return (
    <div className="share">
      <div className="link-box">
        <input readOnly value={p.url} aria-label="Website address" onFocus={(e) => e.target.select()} />
        <CopyButton text={p.url} />
      </div>
      <div className="row tight">
        <a className="btn wa sm" href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noreferrer">
          Share on WhatsApp
        </a>
        <a className="btn ghost sm" href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(p.url)}`} target="_blank" rel="noreferrer">
          Facebook
        </a>
      </div>
      <div className="share-grid">
        <figure>
          <canvas ref={status} className="share-canvas" aria-label="WhatsApp status image with QR code" />
          <figcaption>
            <strong>WhatsApp status / Instagram story</strong>
            <button className="btn ghost sm" onClick={() => download(status.current, "status")} disabled={!ready}>
              Download
            </button>
          </figcaption>
        </figure>
        <figure>
          <canvas ref={poster} className="share-canvas" aria-label="Printable poster with QR code" />
          <figcaption>
            <strong>Counter poster (print A4)</strong>
            <button className="btn ghost sm" onClick={() => download(poster.current, "poster")} disabled={!ready}>
              Download
            </button>
          </figcaption>
        </figure>
      </div>
    </div>
  );
}
