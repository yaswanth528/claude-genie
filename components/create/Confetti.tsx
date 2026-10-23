"use client";
// A short burst of confetti when the website goes live. Plain canvas, about 2.5 seconds,
// and nothing at all for visitors who prefer reduced motion.
import { useEffect, useRef } from "react";

const COLORS = ["#c24a2e", "#e8743f", "#f2a33a", "#128c4a", "#3b3e46", "#ffd166"];

export function Confetti() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = (canvas.width = innerWidth * dpr);
    const h = (canvas.height = innerHeight * dpr);
    const pieces = Array.from({ length: 140 }, () => ({
      x: w / 2 + (Math.random() - 0.5) * w * 0.2,
      y: h * 0.35,
      vx: (Math.random() - 0.5) * 16 * dpr,
      vy: (-Math.random() * 16 - 6) * dpr,
      r: (4 + Math.random() * 5) * dpr,
      a: Math.random() * Math.PI,
      va: (Math.random() - 0.5) * 0.3,
      c: COLORS[Math.floor(Math.random() * COLORS.length)],
    }));
    let raf = 0;
    const start = performance.now();
    const frame = (now: number) => {
      const age = (now - start) / 1000;
      ctx.clearRect(0, 0, w, h);
      for (const p of pieces) {
        p.vy += 0.45 * dpr;
        p.vx *= 0.99;
        p.x += p.vx;
        p.y += p.vy;
        p.a += p.va;
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - Math.max(0, age - 1.8) / 0.7);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.a);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r);
        ctx.restore();
      }
      if (age < 2.5) raf = requestAnimationFrame(frame);
      else ctx.clearRect(0, 0, w, h);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} className="cf-confetti" aria-hidden="true" />;
}
